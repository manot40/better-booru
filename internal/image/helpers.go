package image

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"path/filepath"
	"regexp"
	"strings"
)

var photoExtRegex = regexp.MustCompile(`\.(webp|png|jpe?g)$`)

// PreviewCalc holds parameters needed to calculate thumbnail size.
type PreviewCalc struct {
	Width         int
	Height        int
	SampleURL     *string
	SampleWidth   *int
	SampleHeight  *int
	PreviewURL    *string
	PreviewWidth  *int
	PreviewHeight *int
	FileURL       string
}

// ReduceSize computes the source image and resized dimensions.
// Returns ok=false for non-image assets without a fallback preview.
func ReduceSize(item PreviewCalc) (src string, w int, h int, ok bool) {
	src = item.FileURL
	if item.SampleURL != nil && *item.SampleURL != "" {
		src = *item.SampleURL
	} else if item.PreviewURL != nil && *item.PreviewURL != "" {
		src = *item.PreviewURL
	}

	w = item.Width
	if item.SampleWidth != nil && *item.SampleWidth > 0 {
		w = *item.SampleWidth
	} else if item.PreviewWidth != nil && *item.PreviewWidth > 0 {
		w = *item.PreviewWidth
	}

	h = item.Height
	if item.SampleHeight != nil && *item.SampleHeight > 0 {
		h = *item.SampleHeight
	} else if item.PreviewHeight != nil && *item.PreviewHeight > 0 {
		h = *item.PreviewHeight
	}

	if !photoExtRegex.MatchString(strings.ToLower(src)) {
		if item.PreviewURL == nil || *item.PreviewURL == "" {
			return "", 0, 0, false
		}
		src = *item.PreviewURL
		if item.PreviewWidth != nil && *item.PreviewWidth > 0 {
			w = *item.PreviewWidth
		}
		if item.PreviewHeight != nil && *item.PreviewHeight > 0 {
			h = *item.PreviewHeight
		}
	}

	square := w * h
	division := 1
	if square > 2_000_000 {
		division = 3
	} else if square > 1_000_000 {
		division = 2
	}

	finalW := int(math.Round(float64(w) / float64(division)))
	finalH := int(math.Round(float64(h) / float64(division)))
	return src, finalW, finalH, true
}

// GetHash returns MD5 hex hash of JSON containing URL and image transformation modifiers.
func GetHash(srcURL string, modifiers map[string]string) string {
	payload := make(map[string]string, len(modifiers)+1)
	for k, v := range modifiers {
		payload[k] = v
	}
	payload["id"] = srcURL

	data, _ := json.Marshal(payload)
	hash := md5.Sum(data)
	return hex.EncodeToString(hash[:])
}

// GetFilePath computes deterministic file path: baseDir/ab/cd/abcd...
func GetFilePath(baseDir, hash string, ext string) string {
	var path string
	if len(hash) < 4 {
		path = filepath.Join(baseDir, hash)
	} else {
		path = filepath.Join(baseDir, hash[:2], hash[2:4], hash)
	}

	if ext != "" {
		return fmt.Sprintf("%s.%s", path, ext)
	}
	return path
}
