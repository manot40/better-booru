package image

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/davidbyttow/govips/v2/vips"
)

var (
	vipsOnce sync.Once
	vipsErr  error
)

// EnsureVipsStarted initializes libvips once with silent logging.
func EnsureVipsStarted() error {
	vipsOnce.Do(func() {
		// Register the no-op handler before Startup so GLib messages emitted
		// during vips_init() (module search, loader registration, etc.) are
		// also suppressed. LogLevelError keeps any genuine fatal errors visible.
		vips.LoggingSettings(func(messageDomain string, messageLevel vips.LogLevel, message string) {}, vips.LogLevelError)
		vips.Startup(&vips.Config{
			ReportLeaks: false,
		})
	})
	return vipsErr
}

// ProcessPayload contains input options for image processing.
type ProcessPayload struct {
	Src     string `json:"src"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	Quality int    `json:"quality,omitempty"`
}

// ProcessedImage represents the output result of an optimized image.
type ProcessedImage struct {
	Data     []byte
	FileType string
	Width    int
	Height   int
	FileSize int
	Loc      string // "CDN" | "LOCAL"
}

type RawImageResult struct {
	Data []byte
	Mime string
}

func getRawImage(ctx context.Context, hc *http.Client, url string) (*RawImageResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("image not found: 404")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch image: status %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && len(contentType) > 6 && contentType[:6] != "image/" {
		return nil, fmt.Errorf("invalid image content-type: %s", contentType)
	}

	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading image body: %w", err)
	}

	return &RawImageResult{
		Data: bytes,
		Mime: resp.Header.Get("Content-Type"),
	}, nil
}

// ProcessWEBP fetches an image from URL, resizes it with govips, and encodes to WebP.
func ProcessWEBP(ctx context.Context, payload ProcessPayload, s3Enabled bool, httpClient *http.Client) (*ProcessedImage, error) {
	if err := EnsureVipsStarted(); err != nil {
		return nil, fmt.Errorf("initializing vips: %w", err)
	}

	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}

	fetchImg, err := getRawImage(ctx, httpClient, payload.Src)
	if err != nil {
		return nil, fmt.Errorf("fetching upstream image: %w", err)
	}

	img, err := vips.NewImageFromBuffer(fetchImg.Data)
	if err != nil {
		return nil, fmt.Errorf("decoding image with vips: %w", err)
	}
	defer img.Close()

	if payload.Width > 0 && payload.Height > 0 {
		scaleX := float64(payload.Width) / float64(img.Width())
		scaleY := float64(payload.Height) / float64(img.Height())
		scale := scaleX
		if scaleY < scale {
			scale = scaleY
		}
		if scale > 0 && scale < 1.0 {
			if err := img.Resize(scale, vips.KernelLanczos3); err != nil {
				return nil, fmt.Errorf("resizing image: %w", err)
			}
		}
	}

	quality := payload.Quality
	if quality <= 0 || quality > 100 {
		quality = 80
	}

	ep := vips.NewWebpExportParams()
	ep.Quality = quality
	ep.StripMetadata = true

	webpBytes, _, err := img.ExportWebp(ep)
	if err != nil {
		return nil, fmt.Errorf("exporting webp: %w", err)
	}

	loc := "LOCAL"
	if s3Enabled {
		loc = "CDN"
	}

	return &ProcessedImage{
		Data:     webpBytes,
		FileType: "webp",
		Width:    img.Width(),
		Height:   img.Height(),
		FileSize: len(webpBytes),
		Loc:      loc,
	}, nil
}

func ProcessAVIF(ctx context.Context, calc PreviewCalc, s3Enabled bool, httpClient *http.Client) (*ProcessedImage, error) {
	ext := strings.ToLower(strings.TrimPrefix(path.Ext(calc.FileURL), "."))
	hash := path.Base(calc.FileURL)

	// Error 415 for unsupported formats
	if ext != "jpg" && ext != "jpeg" && ext != "png" {
		return nil, fmt.Errorf("Disallowed file format: %s", ext)
	}

	if err := EnsureVipsStarted(); err != nil {
		return nil, fmt.Errorf("initializing vips: %w", err)
	}

	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}

	fetchImg, err := getRawImage(ctx, httpClient, calc.FileURL)
	if err != nil {
		return nil, fmt.Errorf("fetching upstream image: %w", err)
	}

	loc := "LOCAL"
	if s3Enabled {
		loc = "CDN"
	}
	processedImage := &ProcessedImage{
		Loc:      loc,
		Data:     fetchImg.Data,
		Width:    calc.Width,
		Height:   calc.Height,
		FileSize: len(fetchImg.Data),
	}

	if ext == "png" || strings.HasPrefix(fetchImg.Mime, "image/png") {
		isOpaque := checkPNGOpaqueness(fetchImg.Data)
		if !isOpaque {
			// Serve as raw PNG without transcoding
			processedImage.FileType = "png"
			return processedImage, nil
		}
	}

	processedImage.FileType = "avif"
	// Already AVIF
	if ext == "avif" || fetchImg.Mime == "image/avif" {
		return processedImage, nil
	}

	// Transcode to AVIF with FFmpeg (HW -> SW fallback)
	result, err := transcode(ctx, fetchImg.Data, hash)
	if err != nil {
		return nil, fmt.Errorf("encoding image to avif: %w", err)
	}

	processedImage.Data = result
	processedImage.FileSize = len(result)
	return processedImage, nil
}

// GenerateLQIP creates a tiny (16x16) blurred WebP low-quality image placeholder.
func GenerateLQIP(data []byte) ([]byte, error) {
	if err := EnsureVipsStarted(); err != nil {
		return nil, fmt.Errorf("initializing vips: %w", err)
	}

	img, err := vips.NewImageFromBuffer(data)
	if err != nil {
		return nil, fmt.Errorf("loading image for lqip: %w", err)
	}
	defer img.Close()

	// Blur with sigma=2
	if err := img.GaussianBlur(2); err != nil {
		return nil, fmt.Errorf("applying gaussian blur: %w", err)
	}

	// Resize to 16x16 inside
	if err := img.Thumbnail(16, 16, vips.InterestingNone); err != nil {
		return nil, fmt.Errorf("generating thumbnail: %w", err)
	}

	ep := vips.NewWebpExportParams()
	ep.Quality = 30
	ep.StripMetadata = true

	lqipBytes, _, err := img.ExportWebp(ep)
	if err != nil {
		return nil, fmt.Errorf("exporting lqip webp: %w", err)
	}

	return lqipBytes, nil
}
