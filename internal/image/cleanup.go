package image

import (
	"context"
	"fmt"
	"os"
	"sync/atomic"
	"time"

	"github.com/manot40/better-booru/internal/db"
	"github.com/uptrace/bun"
)

// CleanupWorker removes expired preview cache files.
type CleanupWorker struct {
	bunDB        *bun.DB
	s3Storage    S3Storage
	baseCacheDir string
	maxAge       time.Duration
	running      atomic.Bool
}

// NewCleanupWorker creates a new cleanup worker.
func NewCleanupWorker(bunDB *bun.DB, s3Storage S3Storage, baseCacheDir string, maxAge time.Duration) *CleanupWorker {
	if maxAge <= 0 {
		maxAge = 7 * 24 * time.Hour // Default 7 days
	}
	return &CleanupWorker{
		bunDB:        bunDB,
		s3Storage:    s3Storage,
		baseCacheDir: baseCacheDir,
		maxAge:       maxAge,
	}
}

// IsRunning returns whether cleanup is currently in progress.
func (c *CleanupWorker) IsRunning() bool {
	return c.running.Load()
}

// Run performs cleanup of expired preview cache entries.
func (c *CleanupWorker) Run(ctx context.Context) (int, error) {
	if !c.running.CompareAndSwap(false, true) {
		return 0, fmt.Errorf("cleanup worker is already running")
	}
	defer c.running.Store(false)

	cutoff := time.Now().Add(-c.maxAge)

	var oldImages []db.PostImage
	err := c.bunDB.NewSelect().
		Model(&oldImages).
		Column("id", "loc", "type").
		Where("created_at < ? AND orphaned = false AND type = 'PREVIEW'", cutoff).
		Scan(ctx)

	if err != nil {
		return 0, fmt.Errorf("finding expired images: %w", err)
	}

	if len(oldImages) == 0 {
		return 0, nil
	}

	cleanedIDs := make([]string, 0, len(oldImages))
	for _, img := range oldImages {
		if img.Loc == "LOCAL" {
			filePath := GetFilePath(c.baseCacheDir, img.ID)
			_ = os.Remove(filePath)
		} else if img.Loc == "CDN" && c.s3Storage != nil && c.s3Storage.Enabled() {
			key := fmt.Sprintf("images/%s/%s", img.Type, img.ID)
			_ = c.s3Storage.Delete(ctx, key)
		}
		cleanedIDs = append(cleanedIDs, img.ID)
	}

	if len(cleanedIDs) > 0 {
		_, err = c.bunDB.NewUpdate().
			Model((*db.PostImage)(nil)).
			Set("orphaned = true").
			Where("id IN (?)", bun.In(cleanedIDs)).
			Exec(ctx)
		if err != nil {
			return len(cleanedIDs), fmt.Errorf("updating orphaned status: %w", err)
		}
	}

	return len(cleanedIDs), nil
}
