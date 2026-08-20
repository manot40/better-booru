package api_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/api"
	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/image"
	"github.com/manot40/better-booru/internal/scraper"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestApp(t *testing.T) (*fiber.App, *miniredis.Miniredis, *httptest.Server) {
	mr, err := miniredis.Run()
	require.NoError(t, err)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})

	// Upstream mock server
	upstreamServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/posts.json" {
			posts := []danbooru.DanbooruResponse{
				{
					ID:          1001,
					MD5:         "testmd5hash1001",
					Score:       15,
					Rating:      "g",
					ImageWidth:  800,
					ImageHeight: 600,
					FileExt:     "jpg",
					FileSize:    100000,
					MediaAsset: danbooru.MediaAsset{
						Variants: []danbooru.Variant{
							{Type: "original", URL: "https://danbooru.donmai.us/test.jpg", Width: 800, Height: 600, FileExt: "jpg"},
						},
					},
				},
			}
			_ = json.NewEncoder(w).Encode(posts)
		} else if r.URL.Path == "/posts/1001.json" {
			post := danbooru.DanbooruResponse{
				ID:          1001,
				MD5:         "testmd5hash1001",
				Score:       15,
				Rating:      "g",
				ImageWidth:  800,
				ImageHeight: 600,
				FileExt:     "jpg",
				FileSize:    100000,
				MediaAsset: danbooru.MediaAsset{
					Variants: []danbooru.Variant{
						{Type: "original", URL: "https://danbooru.donmai.us/test.jpg", Width: 800, Height: 600, FileExt: "jpg"},
					},
				},
			}
			_ = json.NewEncoder(w).Encode(post)
		} else if r.URL.Path == "/counts/posts.json" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"counts": map[string]int{"posts": 100},
			})
		} else if r.URL.Path == "/autocomplete.json" {
			items := []danbooru.AutocompleteItem{
				{Label: "solo", Value: "solo", Category: 0, PostCount: 50000},
			}
			_ = json.NewEncoder(w).Encode(items)
		} else {
			http.NotFound(w, r)
		}
	}))

	cfg := &config.Config{
		DanbooruAPIKey: "admin-secret-token",

		IPXAllowParallel: false,
		IPXCacheDir:      t.TempDir(),
		IPXMaxAge:        3600,
	}

	danClient := danbooru.NewClientWithHTTP(upstreamServer.URL, "testuser", "testapikey", upstreamServer.Client())
	s := scraper.NewScraper(nil, rdb, danClient)
	iw := image.NewWorker(nil, rdb, cfg, nil)
	cw := image.NewCleanupWorker(nil, cfg, nil)

	app := fiber.New()
	api.SetupRoutes(app, api.Dependencies{
		Config:        cfg,
		BunDB:         nil,
		RedisClient:   rdb,
		DanClient:     danClient,
		S3Storage:     nil,
		Scraper:       s,
		ImageWorker:   iw,
		CleanupWorker: cw,
	})

	return app, mr, upstreamServer
}

func TestAPI_ListPosts(t *testing.T) {
	app, mr, upstream := setupTestApp(t)
	defer mr.Close()
	defer upstream.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/posts?tags=solo&limit=10", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var res api.PostsListResponse
	err = json.Unmarshal(body, &res)
	require.NoError(t, err)
	assert.Equal(t, 100, res.Meta.Count)
	require.Len(t, res.Post, 1)
	assert.Equal(t, 1001, res.Post[0].ID)
}

func TestAPI_GetPostDetail(t *testing.T) {
	app, mr, upstream := setupTestApp(t)
	defer mr.Close()
	defer upstream.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/posts/1001", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var post api.PostItem
	err = json.Unmarshal(body, &post)
	require.NoError(t, err)
	assert.Equal(t, 1001, post.ID)
	assert.Equal(t, "testmd5hash1001", post.Hash)
}

func TestAPI_Autocomplete(t *testing.T) {
	app, mr, upstream := setupTestApp(t)
	defer mr.Close()
	defer upstream.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/autocomplete?q=sol", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var items []api.AutocompleteItem
	err = json.Unmarshal(body, &items)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "solo", items[0].Value)
}

func TestAPI_AdminEndpoints(t *testing.T) {
	app, mr, upstream := setupTestApp(t)
	defer mr.Close()
	defer upstream.Close()

	// 1. Scrap Status without auth -> 401
	req1 := httptest.NewRequest(http.MethodGet, "/api/scrap/status", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp1.StatusCode)

	// 2. Scrap Status with auth -> 200
	req2 := httptest.NewRequest(http.MethodGet, "/api/scrap/status?token=admin-secret-token", nil)
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp2.StatusCode)

	// 3. Images Status with auth -> 200
	req3 := httptest.NewRequest(http.MethodGet, "/api/images/status?token=admin-secret-token", nil)
	resp3, err := app.Test(req3)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp3.StatusCode)

	// 4. Images Trigger without auth -> 401
	req4 := httptest.NewRequest(http.MethodGet, "/api/images/trigger", nil)
	resp4, err := app.Test(req4)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp4.StatusCode)

	// 5. Images Trigger with auth -> 200
	req5 := httptest.NewRequest(http.MethodGet, "/api/images/trigger?token=admin-secret-token", nil)
	resp5, err := app.Test(req5)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp5.StatusCode)
}

func TestAPI_ImagesTrigger_Parallel(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	// Block task processing via a slow HTTP server
	started := make(chan struct{})
	unblock := make(chan struct{})

	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		select {
		case started <- struct{}{}:
		default:
		}
		<-unblock
		rw.Header().Set("Content-Type", "image/png")
		_, _ = rw.Write([]byte("mock"))
	}))
	defer server.Close()

	// Setup app with allowParallel = false
	cfg := &config.Config{
		DanbooruAPIKey:   "admin-secret-token",
		IPXAllowParallel: false,
		IPXCacheDir:      t.TempDir(),
		IPXMaxAge:        3600,
	}

	iw := image.NewWorker(nil, rdb, cfg, nil)

	app := fiber.New()
	api.SetupRoutes(app, api.Dependencies{
		Config:      cfg,
		RedisClient: rdb,
		ImageWorker: iw,
	})

	// Add a task to queue
	err = image.AddTask(context.Background(), rdb, "test_hash", server.URL+"/img.png")
	require.NoError(t, err)

	// Start worker in background
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = iw.Run(context.Background())
	}()

	<-started

	// 1. While worker is running and allowParallel is false -> 409 Conflict
	reqConflict := httptest.NewRequest(http.MethodGet, "/api/images/trigger?token=admin-secret-token", nil)
	respConflict, err := app.Test(reqConflict)
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, respConflict.StatusCode)

	// 2. Enable allowParallel -> now triggers should return 200 OK even while running
	iw.SetAllowParallel(true)
	reqParallel := httptest.NewRequest(http.MethodGet, "/api/images/trigger?token=admin-secret-token", nil)
	respParallel, err := app.Test(reqParallel)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, respParallel.StatusCode)

	// Unblock worker
	close(unblock)
	wg.Wait()
}

func TestAPI_ImageEncoder_Disabled(t *testing.T) {
	cfg := &config.Config{
		IPXEnableAvif: false,
		IPXCacheDir:   t.TempDir(),
	}

	app := fiber.New()
	api.SetupRoutes(app, api.Dependencies{
		Config: cfg,
	})

	req := httptest.NewRequest(http.MethodGet, "/images/encoder/testimage.jpg", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestAPI_ImageEncoder_Enabled_VideoAndCache(t *testing.T) {
	tempCacheDir := t.TempDir()
	cfg := &config.Config{
		IPXEnableAvif: true,
		IPXCacheDir:   tempCacheDir,
	}

	app := fiber.New()
	api.SetupRoutes(app, api.Dependencies{
		Config: cfg,
	})

	// 1. Video files -> 415 Unsupported Media Type
	reqVideo := httptest.NewRequest(http.MethodGet, "/images/encoder/video1234.mp4", nil)
	respVideo, err := app.Test(reqVideo)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnsupportedMediaType, respVideo.StatusCode)

	// 2. Cached file -> 200 OK with ETag & Cache-Control
	cachedFilePath := tempCacheDir + "/original_images/12/34/12345678.avif"
	require.NoError(t, os.MkdirAll(tempCacheDir+"/original_images/12/34", 0755))
	require.NoError(t, os.WriteFile(cachedFilePath, []byte("avif-binary-data"), 0644))

	reqCache := httptest.NewRequest(http.MethodGet, "/images/encoder/12345678.jpg", nil)
	respCache, err := app.Test(reqCache)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, respCache.StatusCode)
	assert.Equal(t, "image/avif", respCache.Header.Get("Content-Type"))
	assert.Contains(t, respCache.Header.Get("Cache-Control"), "public")
	etag := respCache.Header.Get("ETag")
	assert.NotEmpty(t, etag)

	// 3. ETag If-None-Match -> 304 Not Modified
	reqEtag := httptest.NewRequest(http.MethodGet, "/images/encoder/12345678.jpg", nil)
	reqEtag.Header.Set("If-None-Match", etag)
	respEtag, err := app.Test(reqEtag)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotModified, respEtag.StatusCode)
}

