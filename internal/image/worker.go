package image

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/db"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"
)

const (
	imageQueueKey     = "image_queue"
	imageQueueListKey = "queue:image_queue"
)

// TaskPayload represents a structured image optimization task.
type TaskPayload struct {
	Src     string `json:"src"`
	Width   int    `json:"w"`
	Height  int    `json:"h"`
	PostID  int    `json:"post_id"`
	Hash    string `json:"hash"`
	Quality int    `json:"q,omitempty"`
}

// AddTask enqueues an image optimization task into Redis.
func AddTask(ctx context.Context, rdb *redis.Client, key string, payload any) error {
	var val string
	switch p := payload.(type) {
	case string:
		val = p
	default:
		data, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("marshaling task payload: %w", err)
		}
		val = string(data)
	}

	pipe := rdb.Pipeline()
	pipe.HSet(ctx, imageQueueKey, key, val)
	pipe.RPush(ctx, imageQueueListKey, key)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("enqueuing task: %w", err)
	}

	return nil
}

// Worker coordinates processing tasks from the image queue.
type Worker struct {
	bunDB         *bun.DB
	rdb           *redis.Client
	s3Storage     S3Storage
	baseCacheDir  string
	httpClient    *http.Client
	allowParallel bool
	activeCount   atomic.Int32
}

// NewWorker creates a new image processing worker.
func NewWorker(bunDB *bun.DB, rdb *redis.Client, cfg *config.Config, s3Storage S3Storage) *Worker {
	return &Worker{
		bunDB:         bunDB,
		rdb:           rdb,
		s3Storage:     s3Storage,
		baseCacheDir:  cfg.IPXCacheDir,
		httpClient:    &http.Client{Timeout: 30 * time.Second},
		allowParallel: cfg.IPXAllowParallel,
	}
}

// IsRunning returns whether the worker is currently processing tasks.
func (w *Worker) IsRunning() bool {
	return w.activeCount.Load() > 0
}

// AllowParallel returns whether multiple workers are allowed to run concurrently.
func (w *Worker) AllowParallel() bool {
	return w.allowParallel
}

// SetAllowParallel updates the parallel execution setting.
func (w *Worker) SetAllowParallel(allow bool) {
	w.allowParallel = allow
}

// ActiveCount returns the number of active workers currently running.
func (w *Worker) ActiveCount() int {
	return int(w.activeCount.Load())
}

// Run processes all pending items in the image queue.
func (w *Worker) Run(ctx context.Context) error {
	if !w.allowParallel {
		if !w.activeCount.CompareAndSwap(0, 1) {
			return errors.New("image worker is already running")
		}
		defer w.activeCount.Add(-1)
	} else {
		w.activeCount.Add(1)
		defer w.activeCount.Add(-1)
	}

	if w.rdb == nil {
		return nil
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		key, err := w.rdb.LPop(ctx, imageQueueListKey).Result()
		if errors.Is(err, redis.Nil) {
			break // Queue empty
		} else if err != nil {
			return fmt.Errorf("popping queue item: %w", err)
		}

		val, err := w.rdb.HGet(ctx, imageQueueKey, key).Result()
		if err != nil {
			continue
		}
		_ = w.rdb.HDel(ctx, imageQueueKey, key)

		if err := w.processTask(ctx, key, val); err != nil {
			slog.Warn("Failed processing image task", "key", key, "error", err)
		}
	}

	return nil
}

func (w *Worker) processTask(ctx context.Context, key, val string) error {
	if strings.HasPrefix(val, "http://") || strings.HasPrefix(val, "https://") {
		// Plain image URL task -> fetch bytes, generate LQIP and update DB
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, val, nil)
		if err != nil {
			return err
		}
		resp, err := w.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("status %d", resp.StatusCode)
		}

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}

		lqip, err := GenerateLQIP(data)
		if err != nil {
			return err
		}

		if w.bunDB != nil {
			_, err = w.bunDB.NewUpdate().
				Model((*db.Post)(nil)).
				Set("lqip = ?", lqip).
				Where("hash = ?", key).
				Exec(ctx)
			return err
		}
		return nil
	}

	// Structured TaskPayload
	var task TaskPayload
	if err := json.Unmarshal([]byte(val), &task); err != nil {
		return fmt.Errorf("unmarshaling task: %w", err)
	}

	s3Enabled := w.s3Storage != nil && w.s3Storage.Enabled()
	processed, err := ProcessImage(ctx, ProcessPayload{
		Src:     task.Src,
		Width:   task.Width,
		Height:  task.Height,
		Quality: task.Quality,
	}, s3Enabled, w.httpClient)
	if err != nil {
		return fmt.Errorf("processing image: %w", err)
	}

	_, err = SetCache(ctx, w.bunDB, w.s3Storage, w.baseCacheDir, processed.Data, CachePayload{
		ID:       key,
		PostID:   task.PostID,
		Loc:      processed.Loc,
		Type:     "PREVIEW",
		Width:    processed.Width,
		Height:   processed.Height,
		FileType: processed.FileType,
		FileSize: processed.FileSize,
	})
	if err != nil {
		return fmt.Errorf("setting cache: %w", err)
	}

	// Generate and update LQIP
	if w.bunDB != nil {
		lqip, err := GenerateLQIP(processed.Data)
		if err == nil {
			_, _ = w.bunDB.NewUpdate().
				Model((*db.Post)(nil)).
				Set("lqip = ?", lqip).
				Where("id = ?", task.PostID).
				Exec(ctx)
		}
	}

	return nil
}
