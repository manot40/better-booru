package config_test

import (
	"os"
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
	assert.Equal(t, ".cache", cfg.IPXCacheDir)
	assert.False(t, cfg.IPXAllowParallel)
	assert.False(t, cfg.IPXEnableAvif)
	assert.False(t, cfg.S3Enabled())
}

func TestLoad_IPXAllowParallel(t *testing.T) {
	v := viper.New()
	v.Set("ipx_allow_parallel", true)
	cfg, err := config.LoadWithViper(v)
	require.NoError(t, err)
	assert.True(t, cfg.IPXAllowParallel)
}

func TestLoad_IPXEnableAvif(t *testing.T) {
	v := viper.New()
	v.Set("ipx_enable_avif", true)
	cfg, err := config.LoadWithViper(v)
	require.NoError(t, err)
	assert.True(t, cfg.IPXEnableAvif)
}

// TestLoad_SystemEnvFallback verifies that system environment variables are
// picked up when no .env file is present (Docker / CI deployment pattern).
func TestLoad_SystemEnvFallback(t *testing.T) {
	const testPort = "9999"
	const testDB = "postgresql://user:pass@db:5432/mydb"

	t.Setenv("PORT", testPort)
	t.Setenv("DATABASE_URL", testDB)

	// Call Load() from a temp dir that has no .env file — it must not error.
	tmp := t.TempDir()
	orig, _ := os.Getwd()
	require.NoError(t, os.Chdir(tmp))
	t.Cleanup(func() { _ = os.Chdir(orig) })

	cfg, err := config.Load()
	require.NoError(t, err, "Load() must succeed even when no .env file exists")

	assert.Equal(t, testPort, cfg.Port, "PORT env var should override default")
	assert.Equal(t, testDB, cfg.DatabaseURL, "DATABASE_URL env var should override default")
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

