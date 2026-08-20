package query

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/manot40/better-booru/internal/config"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"
)

const safeOffset = 1000000

// QueryOptions defines criteria for querying posts.
type QueryOptions struct {
	Page   string   // "1", "a12345" (after cursor), "b12345" (before cursor)
	Tags   string   // Tag filter string
	Limit  int      // Maximum items to return (default 50, max 500)
	Rating []string // Ratings subset e.g. ["g", "s", "q", "e"]
}

// PostDTO represents the API response format for a post.
type PostDTO struct {
	ID            int       `bun:"id" json:"id"`
	Hash          string    `bun:"hash" json:"hash"`
	LQIP          *string   `bun:"lqip" json:"lqip"`
	Tags          []TagItem `bun:"-" json:"tags,omitempty"`
	Score         *int      `bun:"score" json:"score"`
	Rating        string    `bun:"rating" json:"rating"`
	Source        *string   `bun:"source" json:"source"`
	PixivID       *int      `bun:"pixiv_id" json:"pixiv_id"`
	ParentID      *int      `bun:"parent_id" json:"parent_id"`
	UploaderID    int       `bun:"uploader_id" json:"uploader_id"`
	HasChildren   bool      `bun:"has_children" json:"has_children"`
	HasNotes      bool      `bun:"has_notes" json:"has_notes"`
	CreatedAt     time.Time `bun:"created_at" json:"created_at"`
	Width         int       `bun:"width" json:"width"`
	Height        int       `bun:"height" json:"height"`
	FileURL       string    `bun:"file_url" json:"file_url"`
	FileExt       string    `bun:"file_ext" json:"file_ext"`
	FileSize      int       `bun:"file_size" json:"file_size"`
	SampleURL     *string   `bun:"sample_url" json:"sample_url"`
	SampleWidth   *int      `bun:"sample_width" json:"sample_width"`
	SampleHeight  *int      `bun:"sample_height" json:"sample_height"`
	PreviewURL    string    `bun:"preview_url" json:"preview_url"`
	PreviewWidth  int       `bun:"preview_width" json:"preview_width"`
	PreviewHeight int       `bun:"preview_height" json:"preview_height"`
}

// PostMeta holds pagination metadata.
type PostMeta struct {
	Limit  int `json:"limit"`
	Count  int `json:"count"`
	Offset int `json:"offset"`
}

// PostListResult is the response returned by QueryPosts.
type PostListResult struct {
	Meta PostMeta  `json:"meta"`
	Post []PostDTO `json:"post"`
}

// QueryPosts retrieves a list of posts according to QueryOptions.
func QueryPosts(ctx context.Context, bunDB *bun.DB, rdb *redis.Client, cfg *config.Config, opts QueryOptions) (*PostListResult, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 50
	} else if limit > 500 {
		limit = 500
	}

	pageStr := strings.TrimSpace(opts.Page)
	if pageStr == "" {
		pageStr = "1"
	}

	isAsc := false
	offset := 0

	q := bunDB.NewSelect().
		TableExpr("posts AS p").
		Join("LEFT JOIN posts_images AS pi ON pi.post_id = p.id AND pi.orphaned = false")

	// Apply Dynamic Fields (processed URLs, LQIP, dimensions)
	s3PublicURL := ""
	if cfg.S3Enabled() {
		s3PublicURL = cfg.S3PublicEndpoint
	}
	q = ApplySelectFields(q, cfg.BaseURL, s3PublicURL)

	// Page / Cursor Filter
	if strings.HasPrefix(pageStr, "a") || strings.HasPrefix(pageStr, "b") {
		isAsc = strings.HasPrefix(pageStr, "a")
		pageNum, err := strconv.Atoi(pageStr[1:])
		if err == nil {
			if isAsc {
				q = q.Where("p.id > ?", pageNum).Where("p.id < ?", pageNum+safeOffset)
			} else {
				q = q.Where("p.id < ?", pageNum).Where("p.id > ?", pageNum-safeOffset)
			}
		}
	} else if pageNum, err := strconv.Atoi(pageStr); err == nil && pageNum > 1 && pageNum <= 200000 {
		offset = (pageNum - 1) * limit
	}

	// Rating Filter
	if len(opts.Rating) > 0 {
		q = q.Where("p.rating IN (?)", bun.In(opts.Rating))
	}

	// Tags Filter
	var err error
	q, err = ApplyTagsFilter(ctx, bunDB, q, opts.Tags)
	if err != nil {
		return nil, fmt.Errorf("applying tags filter: %w", err)
	}

	// Ordering
	if isAsc {
		q = q.Order("p.id ASC")
	} else {
		q = q.Order("p.id DESC")
	}

	q = q.Group("p.id").Limit(limit).Offset(offset)

	var posts []PostDTO
	if err := q.Scan(ctx, &posts); err != nil {
		return nil, fmt.Errorf("querying posts: %w", err)
	}

	// Calculate or fetch cached count
	count := GetPostCount(ctx, bunDB, rdb, opts)

	return &PostListResult{
		Meta: PostMeta{
			Limit:  limit,
			Count:  count,
			Offset: offset,
		},
		Post: posts,
	}, nil
}

// GetPostCount retrieves the estimated/cached count of posts matching the search query.
func GetPostCount(ctx context.Context, bunDB *bun.DB, rdb *redis.Client, opts QueryOptions) int {
	if rdb == nil {
		return 0
	}

	keyData := fmt.Sprintf("count:%s:%v", opts.Tags, opts.Rating)
	hash := md5.Sum([]byte(keyData))
	cacheKey := "count:" + hex.EncodeToString(hash[:])
	lockKey := cacheKey + ":lock"

	val, err := rdb.Get(ctx, cacheKey).Result()
	if err == nil && val != "" {
		if c, err := strconv.Atoi(val); err == nil {
			return c
		}
	}

	// Check if already calculating
	locked, _ := rdb.SetNX(ctx, lockKey, "1", 60*time.Second).Result()
	if !locked {
		return 0
	}

	// Async count calculation
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		defer rdb.Del(bgCtx, lockKey)

		countQ := bunDB.NewSelect().
			TableExpr("posts AS p")

		if len(opts.Rating) > 0 {
			countQ = countQ.Where("p.rating IN (?)", bun.In(opts.Rating))
		}

		var err error
		countQ, err = ApplyTagsFilter(bgCtx, bunDB, countQ, opts.Tags)
		if err != nil {
			return
		}

		rowsCTE := countQ.Column("p.id").Order("p.id DESC").Limit(safeOffset)
		count, err := bunDB.NewSelect().With("post_rows", rowsCTE).Table("post_rows").Count(bgCtx)
		if err == nil {
			rdb.Set(bgCtx, cacheKey, count, 24*time.Hour)
		}
	}()

	return 0
}
