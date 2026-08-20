package danbooru_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClient_ListPosts(t *testing.T) {
	mockPosts := []danbooru.DanbooruResponse{
		{
			ID:     1001,
			MD5:    "abc12345",
			Score:  15,
			Rating: "g",
			MediaAsset: danbooru.MediaAsset{
				ImageWidth:  1920,
				ImageHeight: 1080,
				Variants: []danbooru.Variant{
					{Type: "original", URL: "https://cdn.donmai.us/orig.jpg", Width: 1920, Height: 1080, FileExt: "jpg"},
					{Type: "sample", URL: "https://cdn.donmai.us/sample.jpg", Width: 800, Height: 450, FileExt: "jpg"},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/posts.json", r.URL.Path)
		assert.Equal(t, "user123", r.URL.Query().Get("login"))
		assert.Equal(t, "key456", r.URL.Query().Get("api_key"))
		assert.Equal(t, "50", r.URL.Query().Get("limit"))
		assert.Equal(t, "1girl", r.URL.Query().Get("tags"))

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mockPosts)
	}))
	defer server.Close()

	client := danbooru.NewClientWithHTTP(server.URL, "user123", "key456", server.Client())
	posts, err := client.ListPosts(context.Background(), "1", "1girl", 50)
	require.NoError(t, err)
	require.Len(t, posts, 1)
	assert.Equal(t, 1001, posts[0].ID)
	assert.Equal(t, "abc12345", posts[0].MD5)

	img := danbooru.GetDanbooruImage(&posts[0])
	assert.Equal(t, "https://cdn.donmai.us/orig.jpg", img.FileURL)
	require.NotNil(t, img.SampleURL)
	assert.Equal(t, "https://cdn.donmai.us/sample.jpg", *img.SampleURL)
}

func TestClient_GetPost(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/posts/999.json" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		assert.Equal(t, "/posts/123.json", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(danbooru.DanbooruResponse{
			ID:  123,
			MD5: "hash123",
		})
	}))
	defer server.Close()

	client := danbooru.NewClientWithHTTP(server.URL, "", "", server.Client())

	// Found
	post, err := client.GetPost(context.Background(), 123)
	require.NoError(t, err)
	require.NotNil(t, post)
	assert.Equal(t, 123, post.ID)

	// Not Found
	notFound, err := client.GetPost(context.Background(), 999)
	require.NoError(t, err)
	assert.Nil(t, notFound)
}

func TestClient_CountPosts(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/counts/posts.json", r.URL.Path)
		assert.Equal(t, "solo", r.URL.Query().Get("tags"))
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(danbooru.PostCountResponse{
			Counts: struct {
				Posts int `json:"posts"`
			}{Posts: 4242},
		})
	}))
	defer server.Close()

	client := danbooru.NewClientWithHTTP(server.URL, "", "", server.Client())
	count, err := client.CountPosts(context.Background(), "solo")
	require.NoError(t, err)
	assert.Equal(t, 4242, count)
}

func TestClient_Autocomplete(t *testing.T) {
	mockSuggestions := []danbooru.AutocompleteItem{
		{Label: "solo", Value: "solo", Category: 0, PostCount: 10000},
		{Label: "hatsune_miku", Value: "hatsune_miku", Category: 4, PostCount: 5000},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/autocomplete.json", r.URL.Path)
		assert.Equal(t, "miku", r.URL.Query().Get("search[query]"))
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mockSuggestions)
	}))
	defer server.Close()

	client := danbooru.NewClientWithHTTP(server.URL, "", "", server.Client())
	items, err := client.Autocomplete(context.Background(), "miku")
	require.NoError(t, err)
	require.Len(t, items, 2)
	assert.Equal(t, "solo", items[0].Label)
	assert.Equal(t, int16(4), items[1].Category)
}
