package encoder

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/manot40/better-booru/internal/constant"
	"github.com/manot40/better-booru/internal/image"
)

const (
	hwEncoder = "av1_qsv"
	swEncoder = "libsvtav1"
	reScale   = "scale='min(8704,iw)':'min(8704,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"
)

var (
	// ErrNotFound is returned when the image does not exist on the upstream CDN.
	ErrNotFound = errors.New("image not found")
	// ErrInvalidHash is returned when the hash parameter contains invalid characters or path traversal.
	ErrInvalidHash = errors.New("invalid hash parameter")
)

// EncodeResult represents the outcome of an image encode or passthrough.
type EncodeResult struct {
	Data        []byte
	ContentType string
	IsVideo     bool
}

// Encoder coordinates caching and transcoding images to AVIF.
type Encoder struct {
	cacheDir   string
	httpClient *http.Client
	cdnBaseURL string
}

// New creates a new Encoder instance with cache directory set to baseCacheDir/original_images.
func New(baseCacheDir string) *Encoder {
	return NewWithClient(baseCacheDir, &http.Client{Timeout: 60 * time.Second}, constant.DanbooruCDN)
}

// NewWithClient creates an Encoder instance with a custom HTTP client and CDN base URL (useful for testing).
func NewWithClient(baseCacheDir string, httpClient *http.Client, cdnBaseURL string) *Encoder {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 60 * time.Second}
	}
	if cdnBaseURL == "" {
		cdnBaseURL = constant.DanbooruCDN
	}
	return &Encoder{
		cacheDir:   filepath.Join(baseCacheDir, "original_images"),
		httpClient: httpClient,
		cdnBaseURL: strings.TrimRight(cdnBaseURL, "/"),
	}
}

// Encode fetches an image by hash (e.g. "92f7b4d1add652d381a0f3ded55b3f3d.jpg") and encodes it to AVIF.
func (e *Encoder) Encode(ctx context.Context, hash string) (*EncodeResult, error) {
	hash = strings.TrimSpace(hash)
	if hash == "" || strings.Contains(hash, "/") || strings.Contains(hash, "\\") || strings.Contains(hash, "..") {
		return nil, ErrInvalidHash
	}

	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(hash), "."))
	fileName := strings.TrimSuffix(hash, filepath.Ext(hash))
	if fileName == "" {
		return nil, ErrInvalidHash
	}

	// 1. Video files -> 415 unsupported
	if ext == "webm" || ext == "mp4" {
		return &EncodeResult{IsVideo: true}, nil
	}

	// 2. Check local disk cache for existing .avif
	cachePath := e.getCachePath(fileName)
	if cachedData, err := os.ReadFile(cachePath); err == nil && len(cachedData) > 0 {
		return &EncodeResult{
			Data:        cachedData,
			ContentType: "image/avif",
		}, nil
	}

	// 3. Ensure destination cache directory exists
	if err := os.MkdirAll(filepath.Dir(cachePath), 0755); err != nil {
		return nil, fmt.Errorf("creating cache dir: %w", err)
	}

	// 4. Fetch original from CDN
	cdnURL := e.getCDNURL(fileName, hash)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cdnURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")

	resp, err := e.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching original image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream error fetching image: status %d", resp.StatusCode)
	}

	bin, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading image body: %w", err)
	}

	contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type")))

	// 5. PNG alpha transparency check
	if ext == "png" || strings.HasPrefix(contentType, "image/png") {
		isOpaque := e.checkPNGOpaqueness(bin)
		if !isOpaque {
			// Serve as raw PNG without transcoding
			return &EncodeResult{
				Data:        bin,
				ContentType: "image/png",
			}, nil
		}
	}

	// 6. Already AVIF -> write to disk cache and serve
	if ext == "avif" || contentType == "image/avif" {
		_ = os.WriteFile(cachePath, bin, 0644)
		return &EncodeResult{
			Data:        bin,
			ContentType: "image/avif",
		}, nil
	}

	// 7. Transcode to AVIF with FFmpeg (HW -> SW fallback)
	if err := e.transcode(ctx, bin, cachePath); err != nil {
		_ = os.Remove(cachePath)
		return nil, fmt.Errorf("encoding image to avif: %w", err)
	}

	// 8. Read encoded file from disk
	encodedData, err := os.ReadFile(cachePath)
	if err != nil {
		_ = os.Remove(cachePath)
		return nil, fmt.Errorf("reading encoded avif file: %w", err)
	}

	return &EncodeResult{
		Data:        encodedData,
		ContentType: "image/avif",
	}, nil
}

func (e *Encoder) getCachePath(fileName string) string {
	if len(fileName) >= 4 {
		return filepath.Join(e.cacheDir, fileName[:2], fileName[2:4], fileName+".avif")
	}
	return filepath.Join(e.cacheDir, fileName+".avif")
}

func (e *Encoder) getCDNURL(fileName, hash string) string {
	if len(fileName) >= 4 {
		return fmt.Sprintf("%s/original/%s/%s/%s", e.cdnBaseURL, fileName[:2], fileName[2:4], hash)
	}
	return fmt.Sprintf("%s/original/%s", e.cdnBaseURL, hash)
}

func (e *Encoder) checkPNGOpaqueness(bin []byte) bool {
	if err := image.EnsureVipsStarted(); err != nil {
		return false
	}

	img, err := vips.NewImageFromBuffer(bin)
	if err != nil {
		return false
	}
	defer img.Close()

	if !img.HasAlpha() {
		return true
	}

	bands := img.Bands()
	if bands < 2 {
		return true
	}

	alpha, err := img.ExtractBandToImage(bands-1, 1)
	if err != nil {
		return false
	}
	defer alpha.Close()

	minAlpha, _, _, err := alpha.Min()
	if err != nil {
		return false
	}

	return minAlpha >= 255
}

// transcode runs FFmpeg to convert raw image bytes to an AVIF file.
func (e *Encoder) transcode(ctx context.Context, bin []byte, outFile string) error {
	// Try hardware encoder first
	err := e.runFFmpeg(ctx, hwEncoder, "null", bin, outFile)
	if err == nil {
		return nil
	}

	// Fallback to software encoder
	return e.runFFmpeg(ctx, swEncoder, reScale, bin, outFile)
}

func (e *Encoder) runFFmpeg(ctx context.Context, enc, vf string, bin []byte, outFile string) error {
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-loglevel", "error",
		"-y",
		"-f", "image2pipe",
		"-i", "pipe:",
		"-c:v", enc,
		"-vf", vf,
		"-pix_fmt", "yuv444p10le",
		"-crf", "12",
		"-b:v", "0",
		outFile,
	)
	cmd.Stdin = bytes.NewReader(bin)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg (%s): %w: %s", enc, err, stderr.String())
	}

	// Validate output file integrity
	validateCmd := exec.CommandContext(ctx, "ffmpeg",
		"-v", "error",
		"-i", outFile,
		"-f", "null",
		"-",
	)
	var valStderr bytes.Buffer
	validateCmd.Stderr = &valStderr

	if err := validateCmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg validate (%s): %w: %s", enc, err, valStderr.String())
	}

	return nil
}
