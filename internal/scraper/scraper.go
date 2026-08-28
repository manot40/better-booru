package scraper

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"math/rand"
	"strings"
	"sync/atomic"
	"time"

	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/db"
	"github.com/manot40/better-booru/internal/image"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"
)

const pendingScrapKey = "pending_scrap"

// Scraper coordinates syncing new posts and tags from Danbooru.
type Scraper struct {
	bunDB     *bun.DB
	rdb       *redis.Client
	danClient *danbooru.Client
	running   atomic.Bool
	lastRun   atomic.Int64 // Unix timestamp
}

// NewScraper creates a new Danbooru scraper instance.
func NewScraper(bunDB *bun.DB, rdb *redis.Client, danClient *danbooru.Client) *Scraper {
	return &Scraper{
		bunDB:     bunDB,
		rdb:       rdb,
		danClient: danClient,
	}
}

// IsBusy returns whether a scrape operation is currently running.
func (s *Scraper) IsBusy() bool {
	return s.running.Load()
}

// LastRun returns the time of the last run.
func (s *Scraper) LastRun() time.Time {
	ts := s.lastRun.Load()
	if ts == 0 {
		return time.Time{}
	}
	return time.Unix(ts, 0)
}

// Run executes the Danbooru scrape process.
func (s *Scraper) Run(ctx context.Context) error {
	if !s.running.CompareAndSwap(false, true) {
		return errors.New("scraper is already running")
	}
	defer func() {
		s.lastRun.Store(time.Now().Unix())
		s.running.Store(false)
	}()

	if s.bunDB == nil || s.danClient == nil {
		return errors.New("scraper dependencies missing")
	}

	// 1. Find the latest post ID from the database
	var lastPostID int
	err := s.bunDB.NewSelect().
		Model((*db.Post)(nil)).
		Column("id").
		Order("id DESC").
		Limit(1).
		Scan(ctx, &lastPostID)

	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		// Table might be empty, which is normal
		lastPostID = 0
	}

	stateLast := lastPostID
	isEnd := false

	for !isEnd {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		pageParam := fmt.Sprintf("a%d", stateLast)
		posts, err := s.danClient.ListPosts(ctx, pageParam, "", 200)
		if err != nil {
			slog.Error("Scraper failed to fetch Danbooru posts", "error", err, "page", pageParam)
			break
		}

		dt, err := time.Parse(time.RFC3339, posts[0].CreatedAt)
		if err == nil && !isOldEnough(dt) {
			isEnd = true
			break
		}

		if len(posts) < 200 {
			isEnd = true
		}

		// Filter out posts without MD5 or deleted
		validPosts := make([]danbooru.DanbooruResponse, 0, len(posts))
		for i := len(posts) - 1; i >= 0; i-- { // Reverse to process oldest to newest
			p := posts[i]
			if p.MD5 != "" && p.Score >= 0 {
				validPosts = append(validPosts, p)
			}
		}

		if len(validPosts) > 0 {
			if err := s.processBatch(ctx, validPosts); err != nil {
				slog.Error("Failed to process scraper batch", "error", err)
			} else {
				stateLast = validPosts[len(validPosts)-1].ID
			}
		}

		if !isEnd {
			delay := time.Duration(800+rand.Intn(1000)) * time.Millisecond
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}
	}

	// Process pending scraps from Redis if available
	if s.rdb != nil {
		s.processPending(ctx)
	}

	return nil
}

type tagItem struct {
	name     string
	category int16
}

func (s *Scraper) processBatch(ctx context.Context, posts []danbooru.DanbooruResponse) error {
	return s.bunDB.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var postRecords []db.Post

		for _, p := range posts {
			// Extract tags by category
			tagMap := extractTags(p)

			// Resolve tag IDs
			tagIDs, metaIDs, err := s.resolveTagIDs(ctx, tx, tagMap)
			if err != nil {
				return fmt.Errorf("resolving tags for post %d: %w", p.ID, err)
			}

			// If Danbooru returned zero tags for this post, stash it in the
			// pending queue so it can be retried later (e.g. after propagation delay).
			if len(tagMap) == 0 {
				if s.rdb != nil {
					_ = s.rdb.HSet(ctx, pendingScrapKey, fmt.Sprintf("%d", p.ID), p.MD5)
				}
				continue
			}

			imgInfo := danbooru.GetDanbooruImage(&p)

			createdAt := time.Now()
			if p.CreatedAt != "" {
				if parsed, err := time.Parse(time.RFC3339, p.CreatedAt); err == nil {
					createdAt = parsed
				}
			}

			postRecord := db.Post{
				ID:            p.ID,
				Hash:          p.MD5,
				Score:         &p.Score,
				Source:        &p.Source,
				Rating:        p.Rating,
				TagIDs:        tagIDs,
				MetaIDs:       metaIDs,
				PreviewExt:    imgInfo.PreviewExt,
				PreviewWidth:  imgInfo.PreviewWidth,
				PreviewHeight: imgInfo.PreviewHeight,
				SampleExt:     imgInfo.SampleExt,
				SampleWidth:   imgInfo.SampleWidth,
				SampleHeight:  imgInfo.SampleHeight,
				Width:         imgInfo.Width,
				Height:        imgInfo.Height,
				FileExt:       imgInfo.FileExt,
				FileSize:      p.FileSize,
				PixivID:       p.PixivID,
				ParentID:      p.ParentID,
				UploaderID:    p.UploaderID,
				HasNotes:      p.LastNotedAt != nil && *p.LastNotedAt != "",
				HasChildren:   p.HasChildren,
				CreatedAt:     createdAt,
			}

			postRecords = append(postRecords, postRecord)

			// Enqueue image optimization task
			if s.rdb != nil {
				calc := image.PreviewCalc{
					Width:         imgInfo.Width,
					Height:        imgInfo.Height,
					FileURL:       imgInfo.FileURL,
					SampleURL:     imgInfo.SampleURL,
					SampleWidth:   imgInfo.SampleWidth,
					SampleHeight:  imgInfo.SampleHeight,
					PreviewURL:    imgInfo.PreviewURL,
					PreviewWidth:  imgInfo.PreviewWidth,
					PreviewHeight: imgInfo.PreviewHeight,
				}

				src, w, h, ok := image.ReduceSize(calc)
				if ok {
					_ = image.AddTask(ctx, s.rdb, p.MD5, image.TaskPayload{
						Src:    src,
						Width:  w,
						Height: h,
						PostID: p.ID,
						Hash:   p.MD5,
					})
				} else {
					fallback := imgInfo.PreviewURL
					if fallback == nil || *fallback == "" {
						fallback = &imgInfo.FileURL
					}
					if fallback != nil && *fallback != "" {
						_ = image.AddTask(ctx, s.rdb, p.MD5, *fallback)
					}
				}
			}
		}

		if len(postRecords) == 0 {
			return nil
		}

		_, err := tx.NewInsert().
			Model(&postRecords).
			On("CONFLICT (hash) DO UPDATE").
			Set("tag_ids = EXCLUDED.tag_ids").
			Set("meta_ids = EXCLUDED.meta_ids").
			Exec(ctx)

		if err != nil {
			return fmt.Errorf("upserting posts: %w", err)
		}

		// Collect all unique tag IDs touched in this batch and increment their posts_count.
		allTagIDSet := make(map[int]struct{})
		for _, pr := range postRecords {
			for _, id := range pr.TagIDs {
				allTagIDSet[id] = struct{}{}
			}
			for _, id := range pr.MetaIDs {
				allTagIDSet[id] = struct{}{}
			}
		}
		if len(allTagIDSet) > 0 {
			allTagIDs := make([]int, 0, len(allTagIDSet))
			for id := range allTagIDSet {
				allTagIDs = append(allTagIDs, id)
			}
			_, err = tx.NewUpdate().
				Model((*db.Tag)(nil)).
				Set("posts_count = posts_count + 1").
				Where("id IN (?)", bun.List(allTagIDs)).
				Exec(ctx)
			if err != nil {
				return fmt.Errorf("incrementing tag posts_count: %w", err)
			}
		}

		return nil
	})
}

func (s *Scraper) resolveTagIDs(ctx context.Context, tx bun.Tx, tagList []tagItem) (tagIDs []int, metaIDs []int, err error) {
	tagIDs = []int{}
	metaIDs = []int{}

	if len(tagList) == 0 {
		return tagIDs, metaIDs, nil
	}

	names := make([]string, 0, len(tagList))
	tagMap := make(map[string]int16, len(tagList))
	for _, t := range tagList {
		if t.name == "" {
			continue
		}
		truncated := t.name
		if len(truncated) > 100 {
			truncated = truncated[:100]
		}
		names = append(names, truncated)
		tagMap[truncated] = t.category
	}

	var existing []db.Tag
	err = tx.NewSelect().
		Model(&existing).
		Where("name IN (?)", bun.List(names)).
		Order("category ASC").
		Scan(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("querying existing tags: %w", err)
	}

	existingMap := make(map[string]int, len(existing))
	for _, t := range existing {
		existingMap[t.Name] = t.ID
		// All general category
		if t.Category == 0 {
			tagIDs = append(tagIDs, t.ID)
		} else {
			metaIDs = append(metaIDs, t.ID)
		}
	}

	var newTags []db.Tag
	for _, name := range names {
		if _, found := existingMap[name]; !found {
			cat := tagMap[name]
			newTags = append(newTags, db.Tag{
				Name:     name,
				Category: cat,
			})
		}
	}

	if len(newTags) > 0 {
		var inserted []db.Tag
		err = tx.NewInsert().
			Model(&newTags).
			Returning("id, name, category").
			Scan(ctx, &inserted)
		if err != nil {
			return nil, nil, fmt.Errorf("inserting new tags: %w", err)
		}

		for _, t := range inserted {
			if t.Category == 5 {
				metaIDs = append(metaIDs, t.ID)
			} else {
				tagIDs = append(tagIDs, t.ID)
			}
		}
	}

	return tagIDs, metaIDs, nil
}

func (s *Scraper) processPending(ctx context.Context) {
	pendings, err := s.rdb.HGetAll(ctx, pendingScrapKey).Result()
	if err != nil || len(pendings) == 0 {
		return
	}

	for idStr := range pendings {
		var postID int
		if _, err := fmt.Sscanf(idStr, "%d", &postID); err != nil {
			continue
		}

		resp, err := s.danClient.GetPost(ctx, postID)
		if err != nil || resp == nil {
			continue
		}

		_ = s.processBatch(ctx, []danbooru.DanbooruResponse{*resp})
		_ = s.rdb.HDel(ctx, pendingScrapKey, idStr)
		time.Sleep(50 * time.Millisecond)
	}
}

func extractTags(p danbooru.DanbooruResponse) []tagItem {
	var items []tagItem

	addTags := func(tagStr string, cat int16) {
		for _, t := range strings.Fields(tagStr) {
			t = strings.TrimSpace(t)
			if t != "" {
				items = append(items, tagItem{name: t, category: cat})
			}
		}
	}

	addTags(p.TagStringGeneral, 0)
	addTags(p.TagStringArtist, 1)
	addTags(p.TagStringCopyright, 3)
	addTags(p.TagStringCharacter, 4)
	addTags(p.TagStringMeta, 5)

	return items
}

func isOldEnough(t time.Time) bool {
	twoHoursAgo := time.Now().Add(-2 * time.Hour)
	return t.Before(twoHoursAgo)
}
