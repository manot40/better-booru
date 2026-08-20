package cache

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Store defines operations for a key-value and queue store.
type Store interface {
	Has(ctx context.Context, key string) (bool, error)
	Get(ctx context.Context, key string) (string, bool, error)
	GetEntries(ctx context.Context) (map[string]string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration, replace bool) error
	Pop(ctx context.Context) (key string, value string, ok bool, err error)
	Delete(ctx context.Context, key string) (bool, error)
	Clear(ctx context.Context) error
	Size(ctx context.Context) (int64, error)
}

// RedisStore implements Store backed by Redis HSET and list queue.
type RedisStore struct {
	client   *redis.Client
	hashKey  string
	queueKey string
}

// NewRedisStore creates a new RedisStore for a given cache namespace.
func NewRedisStore(client *redis.Client, cacheKey string) *RedisStore {
	return &RedisStore{
		client:   client,
		hashKey:  cacheKey,
		queueKey: "queue:" + cacheKey,
	}
}

// Connect initializes a Redis connection client.
func Connect(redisURL string) (*redis.Client, error) {
	if redisURL == "" {
		return nil, errors.New("redis url is required")
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis url: %w", err)
	}

	client := redis.NewClient(opt)
	return client, nil
}

// Has checks if a key exists in the hash.
func (s *RedisStore) Has(ctx context.Context, key string) (bool, error) {
	exists, err := s.client.HExists(ctx, s.hashKey, key).Result()
	if err != nil {
		return false, fmt.Errorf("redis hexists: %w", err)
	}
	return exists, nil
}

// Get returns the value associated with a key from the hash.
func (s *RedisStore) Get(ctx context.Context, key string) (string, bool, error) {
	val, err := s.client.HGet(ctx, s.hashKey, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("redis hget: %w", err)
	}
	return val, true, nil
}

// GetEntries returns all key-value pairs stored in the hash.
func (s *RedisStore) GetEntries(ctx context.Context) (map[string]string, error) {
	entries, err := s.client.HGetAll(ctx, s.hashKey).Result()
	if err != nil {
		return nil, fmt.Errorf("redis hgetall: %w", err)
	}
	return entries, nil
}

// Set stores a key-value pair and pushes the key onto the queue if new.
func (s *RedisStore) Set(ctx context.Context, key string, value string, ttl time.Duration, replace bool) error {
	exists, err := s.Has(ctx, key)
	if err != nil {
		return err
	}

	if !exists || replace {
		pipe := s.client.Pipeline()
		pipe.HSet(ctx, s.hashKey, key, value)
		if !exists {
			pipe.RPush(ctx, s.queueKey, key)
		}
		if ttl > 0 {
			// HEXPIRE is supported in Redis 7.4+, fallback to EXPIRE on individual keys if needed
			pipe.HExpire(ctx, s.hashKey, ttl, key)
		}
		_, err := pipe.Exec(ctx)
		if err != nil {
			return fmt.Errorf("redis set pipe: %w", err)
		}
	}

	return nil
}

// Pop dequeues the oldest key from the list queue and retrieves/deletes it from the hash.
func (s *RedisStore) Pop(ctx context.Context) (key string, value string, ok bool, err error) {
	key, err = s.client.LPop(ctx, s.queueKey).Result()
	if errors.Is(err, redis.Nil) {
		return "", "", false, nil
	}
	if err != nil {
		return "", "", false, fmt.Errorf("redis lpop: %w", err)
	}

	val, err := s.client.HGet(ctx, s.hashKey, key).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		return key, "", true, fmt.Errorf("redis hget after pop: %w", err)
	}

	_ = s.client.HDel(ctx, s.hashKey, key)
	return key, val, true, nil
}

// Delete removes a key from the hash.
func (s *RedisStore) Delete(ctx context.Context, key string) (bool, error) {
	count, err := s.client.HDel(ctx, s.hashKey, key).Result()
	if err != nil {
		return false, fmt.Errorf("redis hdel: %w", err)
	}
	return count > 0, nil
}

// Clear removes all keys from both the hash and the list queue.
func (s *RedisStore) Clear(ctx context.Context) error {
	err := s.client.Del(ctx, s.hashKey, s.queueKey).Err()
	if err != nil {
		return fmt.Errorf("redis clear: %w", err)
	}
	return nil
}

// Size returns the number of fields in the hash.
func (s *RedisStore) Size(ctx context.Context) (int64, error) {
	size, err := s.client.HLen(ctx, s.hashKey).Result()
	if err != nil {
		return 0, fmt.Errorf("redis hlen: %w", err)
	}
	return size, nil
}
