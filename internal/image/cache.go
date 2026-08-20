package image

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/manot40/better-booru/internal/db"
	"github.com/uptrace/bun"
)

// S3Storage defines interface for S3 upload operations.
type S3Storage interface {
	Enabled() bool
	Upload(ctx context.Context, key string, data []byte, contentType string) error
	Delete(ctx context.Context, key string) error
	PublicURL(key string) string
}

// CachePayload contains metadata of image to cache.
type CachePayload struct {
	ID       string
	PostID   int
	Loc      string // CDN | LOCAL
	Type     string // PREVIEW | ORIGINAL
	Width    int
	Height   int
	FileType string
	FileSize int
}

// CachedResult represents result of reading an image from cache.
type CachedResult struct {
	RedirectURL string
	FilePath    string
	Data        []byte
}

// SetCache stores the processed image into S3 or local disk and records it in posts_images.
func SetCache(ctx context.Context, bunDB *bun.DB, s3Storage S3Storage, baseCacheDir string, data []byte, meta CachePayload) (string, error) {
	loc := meta.Loc
	publicURL := ""

	if s3Storage != nil && s3Storage.Enabled() {
		loc = "CDN"
		key := fmt.Sprintf("images/%s/%s", meta.Type, meta.ID)
		if err := s3Storage.Upload(ctx, key, data, "image/"+meta.FileType); err != nil {
			return "", fmt.Errorf("uploading to s3: %w", err)
		}
		publicURL = s3Storage.PublicURL(key)
	} else {
		loc = "LOCAL"
		filePath := GetFilePath(baseCacheDir, meta.ID)
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			return "", fmt.Errorf("creating cache dir: %w", err)
		}
		if err := os.WriteFile(filePath, data, 0644); err != nil {
			return "", fmt.Errorf("writing cache file: %w", err)
		}
	}

	meta.Loc = loc
	now := time.Now()

	record := db.PostImage{
		ID:        meta.ID,
		PostID:    meta.PostID,
		Loc:       loc,
		Type:      meta.Type,
		Width:     meta.Width,
		Height:    meta.Height,
		FileType:  meta.FileType,
		FileSize:  meta.FileSize,
		Orphaned:  false,
		UpdatedAt: &now,
		CreatedAt: now,
	}

	_, err := bunDB.NewInsert().
		Model(&record).
		On("CONFLICT (post_id, type) DO UPDATE").
		Set("id = EXCLUDED.id").
		Set("loc = EXCLUDED.loc").
		Set("width = EXCLUDED.width").
		Set("height = EXCLUDED.height").
		Set("file_type = EXCLUDED.file_type").
		Set("file_size = EXCLUDED.file_size").
		Set("orphaned = false").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)

	if err != nil {
		return "", fmt.Errorf("upserting post_image: %w", err)
	}

	return publicURL, nil
}

// GetCache checks if the image exists in cache (S3 or local disk).
func GetCache(ctx context.Context, bunDB *bun.DB, s3Storage S3Storage, baseCacheDir, hash string) (*CachedResult, error) {
	var record db.PostImage
	err := bunDB.NewSelect().
		Model(&record).
		Where("id = ? AND orphaned = false", hash).
		Scan(ctx)

	if err != nil {
		return nil, nil // Cache miss
	}

	if record.Loc == "CDN" && s3Storage != nil && s3Storage.Enabled() {
		key := fmt.Sprintf("images/%s/%s", record.Type, record.ID)
		return &CachedResult{
			RedirectURL: s3Storage.PublicURL(key),
		}, nil
	}

	filePath := GetFilePath(baseCacheDir, record.ID)
	data, err := os.ReadFile(filePath)
	if err != nil {
		// File missing from disk, mark orphaned
		_, _ = bunDB.NewUpdate().
			Model((*db.PostImage)(nil)).
			Set("orphaned = true").
			Where("id = ?", record.ID).
			Exec(ctx)
		return nil, nil
	}

	return &CachedResult{
		FilePath: filePath,
		Data:     data,
	}, nil
}
