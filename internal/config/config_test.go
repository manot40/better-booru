package config_test

import (
	"testing"

	"github.com/manot40/better-booru/internal/config"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Defaults(t *testing.T) {
	v := viper.New()
	cfg, err := config.LoadWithViper(v)
	require.NoError(t, err)

	assert.Equal(t, "3001", cfg.Port)
	assert.Equal(t, "http://localhost:3001", cfg.BaseURL)
	assert.Equal(t, "postgresql://booru:booru@localhost:5432/booru", cfg.DatabaseURL)
	assert.Equal(t, "redis://localhost:6379", cfg.RedisURL)
	assert.Equal(t, 604800, cfg.IPXMaxAge)
	assert.False(t, cfg.S3Enabled())
}

func TestConfig_S3Enabled(t *testing.T) {
	cfg := &config.Config{
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
		S3Bucket:          "my-bucket",
	}
	assert.True(t, cfg.S3Enabled())

	cfg.S3Bucket = ""
	assert.False(t, cfg.S3Enabled())
}
