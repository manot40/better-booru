package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Port              string `mapstructure:"port"`
	LogsDir           string `mapstructure:"logs_dir"`
	BaseURL           string `mapstructure:"base_url"`
	RateLimit         bool   `mapstructure:"rate_limit_enable"`
	DatabaseURL       string `mapstructure:"database_url"`
	RedisURL          string `mapstructure:"redis_url"`
	DanbooruUserID    string `mapstructure:"danbooru_user_id"`
	DanbooruAPIKey    string `mapstructure:"danbooru_api_key"`
	S3Region          string `mapstructure:"s3_region"`
	S3Bucket          string `mapstructure:"s3_bucket"`
	S3Endpoint        string `mapstructure:"s3_endpoint"`
	S3AccessKeyID     string `mapstructure:"s3_access_key_id"`
	S3SecretAccessKey string `mapstructure:"s3_secret_access_key"`
	S3PublicEndpoint  string `mapstructure:"s3_public_endpoint"`
	IPXAllowParallel  bool   `mapstructure:"ipx_allow_parallel"`
	IPXCacheDir       string `mapstructure:"ipx_cache_dir"`
	IPXEnableAvif     bool   `mapstructure:"ipx_enable_avif"`
	IPXMaxAge         int    `mapstructure:"ipx_max_age"`
}

// S3Enabled returns true if S3 storage is configured.
func (c *Config) S3Enabled() bool {
	return c.S3AccessKeyID != "" && c.S3SecretAccessKey != "" && c.S3Bucket != ""
}

// Load loads configuration from environment variables and optionally a local .env file.
func Load() (*Config, error) {
	v := viper.New()

	setDefaults(v)
	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	if execPath, err := os.Executable(); err == nil {
		v.AddConfigPath(filepath.Dir(execPath))
		v.AddConfigPath(filepath.Join(filepath.Dir(execPath), ".."))
	}

	if err := v.ReadInConfig(); err != nil {
		// ConfigFileNotFoundError is expected when running in Docker / CI
		// with environment variables injected directly — not a fatal error.
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading .env file: %w", err)
		}
	}

	return LoadWithViper(v, false)
}

// LoadWithViper loads configuration using a provided viper instance (useful for test isolation).
func LoadWithViper(v *viper.Viper, forTest bool) (*Config, error) {
	if forTest {
		setDefaults(v)
	}

	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer("-", "_", ".", "_"))

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("port", "3001")
	v.SetDefault("logs_dir", "")
	v.SetDefault("base_url", "http://localhost:3001")
	v.SetDefault("rate_limit_enable", true)
	v.SetDefault("database_url", "postgresql://booru:booru@localhost:5432/booru")
	v.SetDefault("redis_url", "redis://localhost:6379")
	v.SetDefault("s3_region", "auto")
	v.SetDefault("s3_bucket", "booru")
	v.SetDefault("ipx_allow_parallel", false)
	v.SetDefault("ipx_enable_avif", false)
	v.SetDefault("ipx_max_age", 604800) // 7 days in seconds
	v.SetDefault("ipx_cache_dir", ".cache")
}
