package api

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/constant"
	"github.com/manot40/better-booru/internal/db"
	"github.com/manot40/better-booru/internal/image"
	"github.com/uptrace/bun"
)

// ImageHandler handles image proxying, thumbnail rendering, and AVIF encoding.
type ImageHandler struct {
	bunDB          *bun.DB
	s3Storage      image.S3Storage
	previewImgDir  string
	originalImgDir string
	httpClient     *http.Client
	encoderEnabled bool
}

// NewImageHandler creates a new ImageHandler.
func NewImageHandler(
	bunDB *bun.DB,
	s3Storage image.S3Storage,
	baseCacheDir string,
	encoderEnabled bool,
) *ImageHandler {
	if baseCacheDir == "" {
		baseCacheDir = ".cache"
	}

	previewImgDir := filepath.Join(baseCacheDir, "preview_images")
	originalImgDir := filepath.Join(baseCacheDir, "original_images")

	return &ImageHandler{
		bunDB:          bunDB,
		s3Storage:      s3Storage,
		previewImgDir:  previewImgDir,
		originalImgDir: originalImgDir,
		httpClient:     &http.Client{},
		encoderEnabled: encoderEnabled,
	}
}

// LocalAssetsHandler godoc
// @Summary      Get image preview thumbnail
// @Description  Serves cached optimized WebP thumbnail or generates it on-demand
// @Tags         images
// @Produce      image/webp
// @Param        assetType	path  string  true  "Asset type, either 'original' or 'preview'"
// @Param        hash				path  string  true  "Post image hash or identifier"
// @Success      200				{file} binary "Optimized WebP image"
// @Success      302				"Redirect to CDN storage"
// @Failure      404				{object} api.ErrorResponse
// @Failure      500				{object} api.ErrorResponse
// @Router       /images/{assetType}/{hash} [get]
func (h *ImageHandler) LocalAssetsHandler(c fiber.Ctx) error {
	path := c.Path()
	oriHash := strings.TrimSpace(c.Params("hash"))
	assType := strings.TrimSpace(c.Params("assetType"))
	urlWithoutExt := strings.TrimSuffix(path, filepath.Ext(path))

	if oriHash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Hash parameter required"})
	} else if assType != "original" && assType != "preview" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Invalid image type request"})
	}

	var cacheDir string
	if assType == "original" {
		cacheDir = h.originalImgDir
	} else {
		cacheDir = h.previewImgDir
	}

	hash := oriHash
	if dot := strings.LastIndex(hash, "."); dot != -1 {
		hash = hash[:dot]
	}

	// Check cache (S3 or local disk)
	cached, err := image.GetCache(c.Context(), h.bunDB, h.s3Storage, cacheDir, hash, assType)
	if err == nil && cached != nil {
		if cached.RedirectURL != "" {
			return c.Redirect().Status(fiber.StatusFound).To(cached.RedirectURL)
		}

		if !strings.HasSuffix(path, cached.FileType) {
			return c.Redirect().Status(fiber.StatusFound).To(fmt.Sprintf("%s.%s", urlWithoutExt, cached.FileType))
		}

		hasData := len(cached.Data) > 0
		if hasData || cached.FilePath != "" {
			c.Set("Content-Type", "image/"+cached.FileType)
			if hasData {
				return c.Send(cached.Data)
			} else {
				return c.SendFile(cached.FilePath)
			}
		}

	}

	// On-demand generation if post exists in DB
	if h.bunDB != nil {
		var post db.Post
		err := h.bunDB.NewSelect().
			Model(&post).
			Where("hash = ?", hash).
			Scan(c.Context())

		if err == nil {
			var previewURL *string
			if post.PreviewExt != nil {
				u := fmt.Sprintf("%s/720x720/%s/%s/%s.%s", constant.DanbooruCDN, post.Hash[:2], post.Hash[2:4], post.Hash, *post.PreviewExt)
				previewURL = &u
			}
			var sampleURL *string
			if post.SampleExt != nil {
				u := fmt.Sprintf("%s/sample/%s/%s/sample-%s.%s", constant.DanbooruCDN, post.Hash[:2], post.Hash[2:4], post.Hash, *post.SampleExt)
				sampleURL = &u
			}
			fileURL := fmt.Sprintf("%s/original/%s/%s/%s.%s", constant.DanbooruCDN, post.Hash[:2], post.Hash[2:4], post.Hash, post.FileExt)

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

			s3Enabled := h.s3Storage != nil && h.s3Storage.Enabled()

			var processed *image.ProcessedImage
			if assType == "original" {
				if !h.encoderEnabled {
					return c.Status(fiber.StatusForbidden).JSON(ErrorResponse{Error: "Original image currently not available"})
				}

				result, err := image.ProcessAVIF(c.Context(), calc, s3Enabled, h.httpClient)
				if err != nil {
					return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Failed processing original image"})
				}
				processed = result
			} else {
				src, w, hg, ok := image.ReduceSize(calc)
				if !ok {
					src = fileURL
					w = post.Width
					hg = post.Height
				}
				result, err := image.ProcessWEBP(c.Context(), image.ProcessPayload{
					Src:     src,
					Width:   w,
					Height:  hg,
					Quality: 80,
				}, s3Enabled, h.httpClient)
				if err != nil {
					return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Failed processing preview image"})
				}
				processed = result
			}

			if processed != nil {
				publicURL, _ := image.SetCache(c.Context(), h.bunDB, h.s3Storage, cacheDir, processed.Data, image.CachePayload{
					Hash:     hash,
					PostID:   post.ID,
					Loc:      processed.Loc,
					Type:     strings.ToUpper(assType),
					Width:    processed.Width,
					Height:   processed.Height,
					FileType: processed.FileType,
					FileSize: processed.FileSize,
				})

				if publicURL != "" {
					return c.Redirect().Status(fiber.StatusFound).To(publicURL)
				}

				if assType == "original" && !strings.HasSuffix(path, "avif") {
					return c.Redirect().Status(fiber.StatusFound).To(urlWithoutExt + ".avif")
				}

				c.Set("Content-Type", "image/"+processed.FileType)
				return c.Send(processed.Data)
			}
		}
	}

	return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "Image Not Found"})
}

// PreviewHandler godoc
// @Summary      Proxy image preview thumbnail
// @Description  Serves image thumbnail when it's not possible (Typically CORS problem)
// @Tags         images
// @Produce      image/*
// @Param        b64   path  string  true  "Image url in base64 encoded"
// @Success      200   {file} binary "Image result"
// @Failure      400   {object} api.ErrorResponse
// @Failure      500   {object} api.ErrorResponse
// @Router       /images/{b64} [get]
func (h *ImageHandler) ProxyHandler(c fiber.Ctx) error {
	ctx := c.Context()
	b64str := strings.TrimSpace(c.Params("b64"))

	result, err := image.FetchProxiedImage(&ctx, h.httpClient, b64str)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: err.Error()})
	}

	c.Set("Content-Type", result.MimeType)
	return c.Send(result.Content)
}
