package image_test

import (
	"context"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	imgpkg "github.com/manot40/better-booru/internal/image"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestPNG(w, h int) []byte {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	tmpFile, _ := os.CreateTemp("", "test-*.png")
	defer os.Remove(tmpFile.Name())
	_ = png.Encode(tmpFile, img)
	_ = tmpFile.Close()
	data, _ := os.ReadFile(tmpFile.Name())
	return data
}

func TestGenerateLQIP(t *testing.T) {
	pngBytes := createTestPNG(100, 100)
	require.NotEmpty(t, pngBytes)

	lqip, err := imgpkg.GenerateLQIP(pngBytes)
	require.NoError(t, err)
	assert.NotEmpty(t, lqip)
}

func TestProcessImage(t *testing.T) {
	pngBytes := createTestPNG(200, 200)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(pngBytes)
	}))
	defer server.Close()

	payload := imgpkg.ProcessPayload{
		Src:     server.URL + "/test.png",
		Width:   100,
		Height:  100,
		Quality: 80,
	}

	res, err := imgpkg.ProcessImage(context.Background(), payload, false, server.Client())
	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, "webp", res.FileType)
	assert.Equal(t, "LOCAL", res.Loc)
	assert.NotEmpty(t, res.Data)
	assert.Equal(t, len(res.Data), res.FileSize)
}
