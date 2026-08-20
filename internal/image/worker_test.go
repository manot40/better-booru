package image_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/image"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorker_AllowParallelAndActiveCount(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	w := image.NewWorker(nil, rdb, &config.Config{
		IPXAllowParallel: false,
		IPXCacheDir:      "",
	}, nil)
	assert.False(t, w.AllowParallel())
	assert.False(t, w.IsRunning())
	assert.Equal(t, 0, w.ActiveCount())

	w.SetAllowParallel(true)
	assert.True(t, w.AllowParallel())

	wParallel := image.NewWorker(nil, rdb, &config.Config{
		IPXAllowParallel: true,
		IPXCacheDir:      "",
	}, nil)
	assert.True(t, wParallel.AllowParallel())
}

func TestWorker_SingleExecutionLock(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	w := image.NewWorker(nil, rdb, &config.Config{
		IPXAllowParallel: false,
		IPXCacheDir:      "",
	}, nil)

	// Block task processing via a slow HTTP server
	started := make(chan struct{})
	unblock := make(chan struct{})

	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		close(started)
		<-unblock
		rw.Header().Set("Content-Type", "image/png")
		_, _ = rw.Write(createTestPNG(10, 10))
	}))
	defer server.Close()

	err = image.AddTask(context.Background(), rdb, "task1", server.URL+"/test.png")
	require.NoError(t, err)

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = w.Run(context.Background())
	}()

	// Wait until worker is inside processing
	<-started
	assert.True(t, w.IsRunning())
	assert.Equal(t, 1, w.ActiveCount())

	// Attempt second concurrent run while first is running -> must fail
	err2 := w.Run(context.Background())
	assert.Error(t, err2)
	assert.Contains(t, err2.Error(), "image worker is already running")

	// Release blocked worker
	close(unblock)
	wg.Wait()

	assert.False(t, w.IsRunning())
	assert.Equal(t, 0, w.ActiveCount())
}

func TestWorker_ParallelExecution(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	w := image.NewWorker(nil, rdb, &config.Config{
		IPXAllowParallel: true,
		IPXCacheDir:      "",
	}, nil)

	pngBytes := createTestPNG(20, 20)
	var processedCount atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		time.Sleep(20 * time.Millisecond)
		processedCount.Add(1)
		rw.Header().Set("Content-Type", "image/png")
		_, _ = rw.Write(pngBytes)
	}))
	defer server.Close()

	// Enqueue 6 tasks
	for i := 0; i < 6; i++ {
		err := image.AddTask(context.Background(), rdb, string(rune('a'+i)), server.URL+"/img")
		require.NoError(t, err)
	}

	// Trigger 3 concurrent workers
	workerCount := 3
	var wg sync.WaitGroup
	errorsList := make([]error, workerCount)

	for i := 0; i < workerCount; i++ {
		idx := i
		wg.Add(1)
		go func() {
			defer wg.Done()
			errorsList[idx] = w.Run(context.Background())
		}()
	}

	wg.Wait()

	for _, err := range errorsList {
		assert.NoError(t, err, "Parallel worker should not return busy error")
	}

	assert.False(t, w.IsRunning())
	assert.Equal(t, 0, w.ActiveCount())
	assert.Equal(t, int32(6), processedCount.Load(), "All tasks should have been processed")
}

func TestWorker_AddTask(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	// 1. Add URL task
	err = image.AddTask(context.Background(), rdb, "hash1", "https://example.com/test.jpg")
	require.NoError(t, err)

	// 2. Add Payload task
	payload := image.TaskPayload{
		Src:    "https://example.com/image.jpg",
		Width:  500,
		Height: 500,
		PostID: 101,
		Hash:   "hash2",
	}
	err = image.AddTask(context.Background(), rdb, "hash2", payload)
	require.NoError(t, err)
}
