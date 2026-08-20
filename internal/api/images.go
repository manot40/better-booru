package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/db"
	"github.com/manot40/better-booru/internal/encoder"
	"github.com/manot40/better-booru/internal/image"
	"github.com/uptrace/bun"
)

// ImageHandler handles image proxying, thumbnail rendering, and AVIF encoding.
type ImageHandler struct {
	bunDB          *bun.DB
	s3Storage      image.S3Storage
	baseCacheDir   string
	httpClient     *http.Client
	encoder        *encoder.Encoder
	encoderEnabled bool
}

// NewImageHandler creates a new ImageHandler.
func NewImageHandler(
	bunDB *bun.DB,
	s3Storage image.S3Storage,
	baseCacheDir string,
	enc *encoder.Encoder,
	encoderEnabled bool,
) *ImageHandler {
	if baseCacheDir == "" {
		baseCacheDir = ".cache/preview_images"
	}
	return &ImageHandler{
		bunDB:          bunDB,
		s3Storage:      s3Storage,
		baseCacheDir:   baseCacheDir,
		httpClient:     &http.Client{},
		encoder:        enc,
		encoderEnabled: encoderEnabled,
	}
}

// ImagePreviewHandler godoc
// @Summary      Get image preview thumbnail
// @Description  Serves cached optimized WebP thumbnail or generates it on-demand
// @Tags         images
// @Produce      image/webp
// @Param        hash  path  string  true  "Post image hash or identifier"
// @Success      200   {file} binary "Optimized WebP image"
// @Success      302   "Redirect to CDN storage"
// @Failure      404   {object} api.ErrorResponse
// @Failure      500   {object} api.ErrorResponse
// @Router       /images/preview/{hash} [get]
func (h *ImageHandler) ImagePreviewHandler(c fiber.Ctx) error {
	hash := strings.TrimSpace(c.Params("hash"))
	if hash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Hash parameter required"})
	}

	// Remove possible extension from hash parameter
	if dot := strings.LastIndex(hash, "."); dot != -1 {
		hash = hash[:dot]
	}

	// 1. Check cache (S3 or local disk)
	cached, err := image.GetCache(c.Context(), h.bunDB, h.s3Storage, h.baseCacheDir, hash)
	if err == nil && cached != nil {
		if cached.RedirectURL != "" {
			return c.Redirect().Status(fiber.StatusFound).To(cached.RedirectURL)
		}
		if len(cached.Data) > 0 {
			c.Set("Content-Type", "image/webp")
			return c.Send(cached.Data)
		}
		if cached.FilePath != "" {
			c.Set("Content-Type", "image/webp")
			return c.SendFile(cached.FilePath)
		}
	}

	// 2. On-demand generation if post exists in DB
	if h.bunDB != nil {
		var post db.Post
		err := h.bunDB.NewSelect().
			Model(&post).
			Where("hash = ?", hash).
			Scan(c.Context())

		if err == nil {
			var previewURL *string
			if post.PreviewExt != nil {
				u := fmt.Sprintf("https://cdn.donmai.us/180x180/%s/%s/%s.%s", post.Hash[:2], post.Hash[2:4], post.Hash, *post.PreviewExt)
				previewURL = &u
			}
			var sampleURL *string
			if post.SampleExt != nil {
				u := fmt.Sprintf("https://cdn.donmai.us/sample/%s/%s/sample-%s.%s", post.Hash[:2], post.Hash[2:4], post.Hash, *post.SampleExt)
				sampleURL = &u
			}
			fileURL := fmt.Sprintf("https://cdn.donmai.us/original/%s/%s/%s.%s", post.Hash[:2], post.Hash[2:4], post.Hash, post.FileExt)

			calc := image.PreviewCalc{
				Width:         post.Width,
				Height:        post.Height,
				FileURL:       fileURL,
				SampleURL:     sampleURL,
				SampleWidth:   post.SampleWidth,
				SampleHeight:  post.SampleHeight,
				PreviewURL:    previewURL,
				PreviewWidth:  post.PreviewWidth,
				PreviewHeight: post.PreviewHeight,
			}

			src, w, hg, ok := image.ReduceSize(calc)
			if !ok {
				src = fileURL
				w = post.Width
				hg = post.Height
			}

			s3Enabled := h.s3Storage != nil && h.s3Storage.Enabled()
			processed, err := image.ProcessImage(c.Context(), image.ProcessPayload{
				Src:     src,
				Width:   w,
				Height:  hg,
				Quality: 80,
			}, s3Enabled, h.httpClient)

			if err == nil && processed != nil {
				publicURL, _ := image.SetCache(c.Context(), h.bunDB, h.s3Storage, h.baseCacheDir, processed.Data, image.CachePayload{
					ID:       hash,
					PostID:   post.ID,
					Loc:      processed.Loc,
					Type:     "PREVIEW",
					Width:    processed.Width,
					Height:   processed.Height,
					FileType: processed.FileType,
					FileSize: processed.FileSize,
				})

				if publicURL != "" {
					return c.Redirect().Status(fiber.StatusFound).To(publicURL)
				}

				c.Set("Content-Type", "image/webp")
				return c.Send(processed.Data)
			}
		}
	}

	return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "Image Not Found"})
}

// ImageEncoderHandler godoc
// @Summary      Encode image to AVIF
// @Description  Fetches the original image from Danbooru CDN and encodes it to AVIF using ffmpeg.
// @Description  Returns 404 if IPX_ENABLE_AVIF is false or image is not found.
// @Description  Returns 415 for video file types (.mp4, .webm).
// @Tags         images
// @Produce      image/avif
// @Param        hash  path  string  true  "Post image filename with extension (e.g. 92f7b4d1add652d381a0f3ded55b3f3d.jpg)"
// @Success      200   {file} binary "AVIF encoded image"
// @Failure      400   {object} api.ErrorResponse "Invalid hash parameter"
// @Failure      404   {object} api.ErrorResponse "AVIF encoding not available or image not found"
// @Failure      415   {object} api.ErrorResponse "Video files are not supported"
// @Failure      500   {object} api.ErrorResponse "Encoding error"
// @Router       /images/encoder/{hash} [get]
func (h *ImageHandler) ImageEncoderHandler(c fiber.Ctx) error {
	if !h.encoderEnabled || h.encoder == nil {
		return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "AVIF encoding not available"})
	}

	hash := strings.TrimSpace(c.Params("hash"))
	if hash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Hash parameter required"})
	}

	res, err := h.encoder.Encode(c.Context(), hash)
	if err != nil {
		if errors.Is(err, encoder.ErrInvalidHash) {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Invalid hash parameter"})
		}
		if errors.Is(err, encoder.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "Image not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: fmt.Sprintf("Encoding failed: %v", err)})
	}

	if res.IsVideo {
		return c.Status(fiber.StatusUnsupportedMediaType).JSON(ErrorResponse{Error: "Video files are not supported"})
	}

	c.Set("Content-Type", res.ContentType)
	return c.Send(res.Data)
}

