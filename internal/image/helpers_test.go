package image_test

import (
	"testing"

	"github.com/manot40/better-booru/internal/image"
	"github.com/stretchr/testify/assert"
)

func TestReduceSize(t *testing.T) {
	// Standard large image: 3000x2000 = 6,000,000 px (> 2M) -> division by 3
	item := image.PreviewCalc{
		Width:   3000,
		Height:  2000,
		FileURL: "https://example.com/image.jpg",
	}
	src, w, h, ok := image.ReduceSize(item)
	assert.True(t, ok)
	assert.Equal(t, "https://example.com/image.jpg", src)
	assert.Equal(t, 1000, w)
	assert.Equal(t, 667, h)

	// Medium image: 1500x1000 = 1,500,000 px (> 1M) -> division by 2
	item2 := image.PreviewCalc{
		Width:   1500,
		Height:  1000,
		FileURL: "https://example.com/image.png",
	}
	src2, w2, h2, ok2 := image.ReduceSize(item2)
	assert.True(t, ok2)
	assert.Equal(t, 750, w2)
	assert.Equal(t, 500, h2)
	assert.Equal(t, "https://example.com/image.png", src2)

	// Video file without preview -> ok = false
	itemVideo := image.PreviewCalc{
		Width:   1920,
		Height:  1080,
		FileURL: "https://example.com/video.mp4",
	}
	_, _, _, okVideo := image.ReduceSize(itemVideo)
	assert.False(t, okVideo)

	// Video file with preview -> uses preview
	previewURL := "https://example.com/preview.jpg"
	previewW := 720
	previewH := 480
	itemVideoWithPreview := image.PreviewCalc{
		Width:         1920,
		Height:        1080,
		FileURL:       "https://example.com/video.mp4",
		PreviewURL:    &previewURL,
		PreviewWidth:  &previewW,
		PreviewHeight: &previewH,
	}
	srcV, wV, hV, okV := image.ReduceSize(itemVideoWithPreview)
	assert.True(t, okV)
	assert.Equal(t, previewURL, srcV)
	assert.Equal(t, 720, wV)
	assert.Equal(t, 480, hV)
}

func TestGetHash(t *testing.T) {
	url := "https://example.com/test.jpg"
	mods := map[string]string{
		"f": "webp",
		"w": "500",
		"h": "300",
	}
	hash1 := image.GetHash(url, mods)
	hash2 := image.GetHash(url, mods)
	assert.Equal(t, hash1, hash2)
	assert.Len(t, hash1, 32)
}

func TestGetFilePath(t *testing.T) {
	hash := "abcd1234ef56"
	path := image.GetFilePath("/cache", hash, "")
	assert.Contains(t, path, "ab")
	assert.Contains(t, path, "cd")
	assert.Contains(t, path, "abcd1234ef56")
}
