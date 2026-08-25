package api

import (
	"database/sql"
	"errors"
	"fmt"
	"path"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/constant"
	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/middleware"
	"github.com/manot40/better-booru/internal/query"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"
)

// PostHandler handles post related HTTP endpoints.
type PostHandler struct {
	bunDB     *bun.DB
	rdb       *redis.Client
	danClient *danbooru.Client
	cfg       *config.Config
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(bunDB *bun.DB, rdb *redis.Client, danClient *danbooru.Client, cfg *config.Config) *PostHandler {
	return &PostHandler{
		bunDB:     bunDB,
		rdb:       rdb,
		danClient: danClient,
		cfg:       cfg,
	}
}

// ListPostsHandler godoc
// @Summary      List posts
// @Description  Get paginated list of booru posts with tag filtering and cursor pagination
// @Tags         posts
// @Accept       json
// @Produce      json
// @Param        tags   query     string  false  "Danbooru search tags query"
// @Param        page   query     string  false  "Page number or cursor (e.g. 1, a12345, b12345)"
// @Param        limit  query     int     false  "Number of posts to return (default 50, max 200)"
// @Success      200    {object}  api.PostsListResponse
// @Failure      400    {object}  api.ErrorResponse
// @Failure      500    {object}  api.ErrorResponse
// @Router       /api/posts [get]
func (h *PostHandler) ListPostsHandler(c fiber.Ctx) error {
	tags := c.Query("tags")
	page := c.Query("page", "1")
	limitStr := c.Query("limit", "50")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	var ratings []string
	if uc := middleware.GetUserConfig(c); uc != nil && len(uc.Rating) > 0 {
		ratings = uc.Rating
	}

	// 1. If database is available, use fast PostgreSQL query builder
	if h.bunDB != nil {
		res, err := query.QueryPosts(c.Context(), h.bunDB, h.rdb, h.cfg, query.QueryOptions{
			Page:   page,
			Tags:   tags,
			Limit:  limit,
			Rating: ratings,
		})
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error: fmt.Sprintf("Querying posts: %v", err),
			})
		}
		return c.JSON(res)
	}

	// 2. Direct Danbooru fallback if DB not configured
	if h.danClient != nil {
		posts, err := h.danClient.ListPosts(c.Context(), page, tags, limit)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error: fmt.Sprintf("Fetching Danbooru posts: %v", err),
			})
		}

		count, _ := h.danClient.CountPosts(c.Context(), tags)

		items := make([]PostItem, 0, len(posts))
		for _, p := range posts {
			imgInfo := danbooru.GetDanbooruImage(&p)
			items = append(items, PostItem{
				ID:            p.ID,
				Hash:          p.MD5,
				Rating:        p.Rating,
				Score:         &p.Score,
				Source:        &p.Source,
				Width:         imgInfo.Width,
				Height:        imgInfo.Height,
				FileExt:       imgInfo.FileExt,
				FileSize:      p.FileSize,
				FileURL:       imgInfo.FileURL,
				SampleURL:     imgInfo.SampleURL,
				SampleWidth:   imgInfo.SampleWidth,
				SampleHeight:  imgInfo.SampleHeight,
				PreviewURL:    imgInfo.PreviewURL,
				PreviewWidth:  imgInfo.PreviewWidth,
				PreviewHeight: imgInfo.PreviewHeight,
			})
		}

		return c.JSON(PostsListResponse{
			Meta: PaginationMeta{
				Count:  count,
				Limit:  limit,
				Offset: 0,
			},
			Post: items,
		})
	}

	return c.Status(fiber.StatusServiceUnavailable).JSON(ErrorResponse{
		Error: "No backend database or upstream client configured",
	})
}

// GetPostHandler godoc
// @Summary      Get post by ID
// @Description  Returns detailed post metadata, image URLs, and tags
// @Tags         posts
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Post ID"
// @Success      200  {object}  api.PostItem
// @Failure      404  {object}  api.ErrorResponse
// @Failure      500  {object}  api.ErrorResponse
// @Router       /api/posts/{id} [get]
func (h *PostHandler) GetPostHandler(c fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error: "Invalid post ID",
		})
	}

	// 1. From database
	if h.bunDB != nil {
		s3PublicURL := ""
		if h.cfg != nil && h.cfg.S3Enabled() {
			s3PublicURL = h.cfg.S3PublicEndpoint
		}

		var postDTO query.PostDTO
		q := h.bunDB.NewSelect().
			TableExpr("posts AS p").
			Join("LEFT JOIN posts_images AS pi ON pi.post_id = p.id AND pi.orphaned = false").
			Where("p.id = ?", id).
			Group("p.id")
		q = query.ApplySelectFields(q, s3PublicURL)

		err := q.Scan(c.Context(), &postDTO)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
					Error: "Post Not Found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error: fmt.Sprintf("Querying post: %v", err),
			})
		}

		tags, err := query.QueryPostTags(c.Context(), h.bunDB, postDTO.ID)
		if err != nil {
			tags = []query.TagItem{}
		}

		tagItems := make([]TagItem, 0, len(tags))
		for _, t := range tags {
			tagItems = append(tagItems, TagItem{
				ID:       t.ID,
				Name:     t.Name,
				Category: t.Category,
			})
		}

		fileUrl := postDTO.FileURL
		if h.cfg.IPXEnableAvif && strings.HasPrefix(fileUrl, constant.DanbooruCDN) {
			fileUrl = fmt.Sprintf("/images/original/%s", path.Base(postDTO.FileURL))
		}

		return c.JSON(PostItem{
			ID:            postDTO.ID,
			Hash:          postDTO.Hash,
			LQIP:          postDTO.LQIP,
			Score:         postDTO.Score,
			Rating:        postDTO.Rating,
			Source:        postDTO.Source,
			PixivID:       postDTO.PixivID,
			ParentID:      postDTO.ParentID,
			HasNotes:      postDTO.HasNotes,
			CreatedAt:     postDTO.CreatedAt,
			Width:         postDTO.Width,
			Height:        postDTO.Height,
			FileExt:       postDTO.FileExt,
			FileSize:      postDTO.FileSize,
			FileURL:       fileUrl,
			SampleURL:     postDTO.SampleURL,
			SampleWidth:   postDTO.SampleWidth,
			SampleHeight:  postDTO.SampleHeight,
			PreviewURL:    &postDTO.PreviewURL,
			PreviewWidth:  &postDTO.PreviewWidth,
			PreviewHeight: &postDTO.PreviewHeight,
			Tags:          tagItems,
		})
	}

	// 2. Direct Danbooru fallback
	if h.danClient != nil {
		post, err := h.danClient.GetPost(c.Context(), id)
		if err != nil || post == nil {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error: "Post Not Found",
			})
		}
		imgInfo := danbooru.GetDanbooruImage(post)
		return c.JSON(PostItem{
			ID:            post.ID,
			Hash:          post.MD5,
			Rating:        post.Rating,
			Score:         &post.Score,
			Source:        &post.Source,
			Width:         imgInfo.Width,
			Height:        imgInfo.Height,
			FileExt:       imgInfo.FileExt,
			FileSize:      post.FileSize,
			FileURL:       imgInfo.FileURL,
			SampleURL:     imgInfo.SampleURL,
			SampleWidth:   imgInfo.SampleWidth,
			SampleHeight:  imgInfo.SampleHeight,
			PreviewURL:    imgInfo.PreviewURL,
			PreviewWidth:  imgInfo.PreviewWidth,
			PreviewHeight: imgInfo.PreviewHeight,
		})
	}

	return c.Status(fiber.StatusServiceUnavailable).JSON(ErrorResponse{
		Error: "No backend database or upstream client configured",
	})
}

// GetPostTagsHandler godoc
// @Summary      Get post tags
// @Description  Returns all tags associated with the given post ID
// @Tags         posts
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Post ID"
// @Success      200  {array}   api.TagItem
// @Failure      404  {object}  api.ErrorResponse
// @Failure      500  {object}  api.ErrorResponse
// @Router       /api/posts/{id}/tags [get]
func (h *PostHandler) GetPostTagsHandler(c fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error: "Invalid post ID",
		})
	}

	if h.bunDB != nil {
		tags, err := query.QueryPostTags(c.Context(), h.bunDB, id)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error: fmt.Sprintf("Querying tags: %v", err),
			})
		}

		tagItems := make([]TagItem, 0, len(tags))
		for _, t := range tags {
			tagItems = append(tagItems, TagItem{
				ID:       t.ID,
				Name:     t.Name,
				Category: t.Category,
			})
		}

		return c.JSON(tagItems)
	}

	return c.Status(fiber.StatusServiceUnavailable).JSON(ErrorResponse{
		Error: "No database configured",
	})
}
