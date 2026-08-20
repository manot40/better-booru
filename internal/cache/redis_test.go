package cache_test

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/manot40/better-booru/internal/cache"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRedisStore(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	ctx := context.Background()
	store := cache.NewRedisStore(rdb, "test_queue")

	// Initial size should be 0
	sz, err := store.Size(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(0), sz)

	// Set item 1
	err = store.Set(ctx, "k1", "val1", 0, true)
	require.NoError(t, err)

	// Set item 2
	err = store.Set(ctx, "k2", "val2", 0, true)
	require.NoError(t, err)

	sz, err = store.Size(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(2), sz)

	// Has and Get
	has1, err := store.Has(ctx, "k1")
	require.NoError(t, err)
	assert.True(t, has1)

	v1, ok, err := store.Get(ctx, "k1")
	require.NoError(t, err)
	assert.True(t, ok)
	assert.Equal(t, "val1", v1)

	// GetEntries
	entries, err := store.GetEntries(ctx)
	require.NoError(t, err)
	assert.Len(t, entries, 2)
	assert.Equal(t, "val1", entries["k1"])
	assert.Equal(t, "val2", entries["k2"])

	// Pop item 1 (FIFO)
	pk1, pv1, pok1, err := store.Pop(ctx)
	require.NoError(t, err)
	assert.True(t, pok1)
	assert.Equal(t, "k1", pk1)
	assert.Equal(t, "val1", pv1)

	// Pop item 2
	pk2, pv2, pok2, err := store.Pop(ctx)
	require.NoError(t, err)
	assert.True(t, pok2)
	assert.Equal(t, "k2", pk2)
	assert.Equal(t, "val2", pv2)

	// Pop empty
	_, _, pok3, err := store.Pop(ctx)
	require.NoError(t, err)
	assert.False(t, pok3)

	// Test Delete & Clear
	_ = store.Set(ctx, "k3", "val3", 0, true)
	del, err := store.Delete(ctx, "k3")
	require.NoError(t, err)
	assert.True(t, del)

	_ = store.Set(ctx, "k4", "val4", 0, true)
	err = store.Clear(ctx)
	require.NoError(t, err)

	sz, err = store.Size(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(0), sz)
}

func TestConnect(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	defer mr.Close()

	client, err := cache.Connect("redis://" + mr.Addr())
	require.NoError(t, err)
	require.NotNil(t, client)
	defer client.Close()

	pong, err := client.Ping(context.Background()).Result()
	require.NoError(t, err)
	assert.Equal(t, "PONG", pong)

	// Invalid URL
	_, err = cache.Connect("invalid://url")
	assert.Error(t, err)

	// Empty URL
	_, err = cache.Connect("")
	assert.Error(t, err)
}
