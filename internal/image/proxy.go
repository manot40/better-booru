package image

import (
	"context"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	errFail         = "Failed to request proxied image"
	errInvalidURL   = "Invalid image URL format"
	errUnrecognized = "Invalid image format sent from upstream"
)

var (
	ProxyCachePath      = filepath.Join(os.TempDir(), ".booru-cache", "proxied")
	proxyCachePathExist = false
)

type ProxiedImage struct {
	Content  []byte
	MimeType string
}

func FetchProxiedImage(ctx *context.Context, hc *http.Client, b64str string) (*ProxiedImage, error) {
	if !proxyCachePathExist {
		os.MkdirAll(ProxyCachePath, 0700)
		proxyCachePathExist = true
	}

	b64dec, err := base64.StdEncoding.DecodeString(b64str)
	if err != nil {
		return nil, errors.New(errInvalidURL)
	}

	url := string(b64dec)
	if !strings.HasPrefix(url, "") {
		return nil, errors.New(errInvalidURL)
	}

	cachePath := filepath.Join(ProxyCachePath, filepath.Base(url))
	cache, err := os.ReadFile(cachePath)
	if err == nil {
		ext := strings.TrimPrefix(filepath.Ext(cachePath), ".")
		return &ProxiedImage{
			Content:  cache,
			MimeType: strings.Join([]string{"image", ext}, "/"),
		}, nil
	}

	req, err := http.NewRequestWithContext(*ctx, http.MethodGet, url, nil)
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
	if err != nil {
		return nil, errors.New(errFail)
	}

	resp, err := hc.Do(req)
	if err != nil {
		return nil, errors.New(errFail)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New(errFail)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && len(contentType) > 6 && contentType[:6] != "image/" {
		return nil, errors.New(errUnrecognized)
	}

	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.New(errUnrecognized)
	}

	os.WriteFile(cachePath, bytes, 0644)
	return &ProxiedImage{
		Content:  bytes,
		MimeType: contentType,
	}, nil
}
