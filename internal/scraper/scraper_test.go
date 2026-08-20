package scraper_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/scraper"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScraper_IsBusyAndLastRun(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	userID := os.Getenv("DANBOORU_USER_ID")
	apiKey := os.Getenv("DANBOORU_API_KEY")

	danClient := danbooru.NewClientWithHTTP("https://danbooru.donmai.us", userID, apiKey, nil)
	s := scraper.NewScraper(nil, rdb, danClient)

	assert.False(t, s.IsBusy())
	assert.True(t, s.LastRun().IsZero())

	// Running without bunDB should fail gracefully
	err = s.Run(context.Background())
	assert.Error(t, err)
	assert.False(t, s.IsBusy())
	assert.False(t, s.LastRun().IsZero())
}

func TestScraper_FetchLiveDanbooru(t *testing.T) {
	userID := os.Getenv("DANBOORU_USER_ID")
	apiKey := os.Getenv("DANBOORU_API_KEY")
	if userID == "" || apiKey == "" {
		t.Skip("DANBOORU_USER_ID and DANBOORU_API_KEY not set; skipping live Danbooru test")
	}

	danClient := danbooru.NewClientWithHTTP("https://danbooru.donmai.us", userID, apiKey, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	posts, err := danClient.ListPosts(ctx, "", "", 5)
	require.NoError(t, err)
	require.NotEmpty(t, posts, "Expected live posts from Danbooru")

	// Validate fresh post structure
	firstPost := posts[0]
	assert.Greater(t, firstPost.ID, 0)
	assert.NotEmpty(t, firstPost.MD5)
	assert.NotEmpty(t, firstPost.Rating)

	// Validate live image extraction
	imgInfo := danbooru.GetDanbooruImage(&firstPost)
	assert.NotEmpty(t, imgInfo.FileURL)
	assert.Greater(t, imgInfo.Width, 0)
	assert.Greater(t, imgInfo.Height, 0)
}
