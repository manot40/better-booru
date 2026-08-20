package api_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
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

	danClient := danbooru.NewClientWithHTTP(upstreamServer.URL, "testuser", "testapikey", upstreamServer.Client())
	s := scraper.NewScraper(nil, rdb, danClient)
	iw := image.NewWorker(nil, rdb, nil, "")
	cw := image.NewCleanupWorker(nil, nil, "", 0)

	cfg := &config.Config{
		DanbooruAPIKey: "admin-secret-token",
		IPXMaxAge:      3600,
	}

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
		BaseCacheDir:  t.TempDir(),
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
}
