package encoder_test

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/manot40/better-booru/internal/encoder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockS3Storage struct {
	enabled   bool
	uploaded  map[string][]byte
	types     map[string]string
	publicURL string
}

func (m *mockS3Storage) Enabled() bool {
	return m.enabled
}

func (m *mockS3Storage) Upload(ctx context.Context, key string, data []byte, contentType string) error {
	if m.uploaded == nil {
		m.uploaded = make(map[string][]byte)
		m.types = make(map[string]string)
	}
	m.uploaded[key] = data
	m.types[key] = contentType
	return nil
}

func (m *mockS3Storage) Delete(ctx context.Context, key string) error {
	delete(m.uploaded, key)
	return nil
}

func (m *mockS3Storage) PublicURL(key string) string {
	return m.publicURL + "/" + strings.TrimLeft(key, "/")
}

func createTestJPEG(w, h int) []byte {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85})
	return buf.Bytes()
}

func createTestPNG(w, h int, opaque bool) []byte {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			a := uint8(255)
			if !opaque && x < w/2 {
				a = 128
			}
			img.Set(x, y, color.RGBA{R: 50, G: 150, B: 200, A: a})
		}
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

func TestEncoder_InvalidHash(t *testing.T) {
	enc := encoder.New(t.TempDir(), nil, nil)
	ctx := context.Background()

	badHashes := []string{
		"",
		"   ",
		"../secret.jpg",
		"folder/file.jpg",
		`folder\file.jpg`,
		".jpg",
	}

	for _, h := range badHashes {
		t.Run(h, func(t *testing.T) {
			res, err := enc.Encode(ctx, h)
			assert.ErrorIs(t, err, encoder.ErrInvalidHash)
			assert.Nil(t, res)
		})
	}
}

func TestEncoder_VideoFiles(t *testing.T) {
	enc := encoder.New(t.TempDir(), nil, nil)
	ctx := context.Background()

	videos := []string{"12345678abcdef.mp4", "12345678abcdef.webm"}
	for _, v := range videos {
		t.Run(v, func(t *testing.T) {
			res, err := enc.Encode(ctx, v)
			require.NoError(t, err)
			require.NotNil(t, res)
			assert.True(t, res.IsVideo)
		})
	}
}

func TestEncoder_CacheHit(t *testing.T) {
	tempDir := t.TempDir()
	enc := encoder.New(tempDir, nil, nil)
	ctx := context.Background()

	// Pre-create cache file
	cacheFile := filepath.Join(tempDir, "original_images", "12", "34", "1234567890abcdef.avif")
	require.NoError(t, os.MkdirAll(filepath.Dir(cacheFile), 0755))
	expectedData := []byte("mock-avif-content")
	require.NoError(t, os.WriteFile(cacheFile, expectedData, 0644))

	res, err := enc.Encode(ctx, "1234567890abcdef.jpg")
	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, expectedData, res.Data)
	assert.Equal(t, "image/avif", res.ContentType)
	assert.False(t, res.IsVideo)
}

func TestEncoder_CDNNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}))
	defer server.Close()

	enc := encoder.NewWithClient(t.TempDir(), nil, nil, server.Client(), server.URL)
	ctx := context.Background()

	res, err := enc.Encode(ctx, "9999999999.jpg")
	assert.ErrorIs(t, err, encoder.ErrNotFound)
	assert.Nil(t, res)
}

func TestEncoder_AlreadyAVIF(t *testing.T) {
	avifData := []byte("genuine-avif-data")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/avif")
		_, _ = w.Write(avifData)
	}))
	defer server.Close()

	tempDir := t.TempDir()
	enc := encoder.NewWithClient(tempDir, nil, nil, server.Client(), server.URL)
	ctx := context.Background()

	res, err := enc.Encode(ctx, "aabbccddee.avif")
	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, avifData, res.Data)
	assert.Equal(t, "image/avif", res.ContentType)

	// Verify it was written to disk cache
	cached, err := os.ReadFile(filepath.Join(tempDir, "original_images", "aa", "bb", "aabbccddee.avif"))
	require.NoError(t, err)
	assert.Equal(t, avifData, cached)
}

func TestEncoder_EncodeJPEGtoAVIF(t *testing.T) {
	jpegData := createTestJPEG(100, 100)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write(jpegData)
	}))
	defer server.Close()

	tempDir := t.TempDir()
	enc := encoder.NewWithClient(tempDir, nil, nil, server.Client(), server.URL)
	ctx := context.Background()

	res, err := enc.Encode(ctx, "1122334455.jpg")
	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, "image/avif", res.ContentType)
	assert.NotEmpty(t, res.Data)

	// Verify cached file exists and matches returned data
	cached, err := os.ReadFile(filepath.Join(tempDir, "original_images", "11", "22", "1122334455.avif"))
	require.NoError(t, err)
	assert.Equal(t, res.Data, cached)
}

func TestEncoder_S3Storage_UploadAndRedirect(t *testing.T) {
	jpegData := createTestJPEG(100, 100)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write(jpegData)
	}))
	defer server.Close()

	mockS3 := &mockS3Storage{
		enabled:   true,
		publicURL: "https://s3.example.com",
	}

	tempDir := t.TempDir()
	enc := encoder.NewWithClient(tempDir, nil, mockS3, server.Client(), server.URL)
	ctx := context.Background()

	res, err := enc.Encode(ctx, "3344556677.jpg")
	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, "image/avif", res.ContentType)
	assert.Equal(t, "https://s3.example.com/images/original/3344556677.avif", res.RedirectURL)

	// Verify S3 has the object with key images/original/3344556677.avif
	s3Key := "images/original/3344556677.avif"
	assert.Contains(t, mockS3.uploaded, s3Key)
	assert.Equal(t, "image/avif", mockS3.types[s3Key])
	assert.NotEmpty(t, mockS3.uploaded[s3Key])

	// Verify temporary local file is cleaned up when S3 is enabled
	localFile := filepath.Join(tempDir, "original_images", "33", "44", "3344556677.avif")
	_, err = os.Stat(localFile)
	assert.True(t, os.IsNotExist(err), "Local cache file should be removed after upload to S3")
}

func TestEncoder_PNGTransparency(t *testing.T) {
	pngData := createTestPNG(50, 50, false) // Transparent PNG
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(pngData)
	}))
	defer server.Close()

	tempDir := t.TempDir()
	enc := encoder.NewWithClient(tempDir, nil, nil, server.Client(), server.URL)
	ctx := context.Background()

	res, err := enc.Encode(ctx, "9988776655.png")
	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, "image/png", res.ContentType)
	assert.Equal(t, pngData, res.Data)
}
