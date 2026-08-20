package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

// Config holds the application configuration loaded from environment variables and/or config files.
type Config struct {
	Port              string `mapstructure:"port"`
	BaseURL           string `mapstructure:"base_url"`
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
	IPXMaxAge         int    `mapstructure:"ipx_max_age"`
	IPXEncoderURL     string `mapstructure:"ipx_encoder_url"`
}

// S3Enabled returns true if S3 storage is configured.
func (c *Config) S3Enabled() bool {
	return c.S3AccessKeyID != "" && c.S3SecretAccessKey != "" && c.S3Bucket != ""
}

// Load loads configuration from environment variables and optionally a local .env file.
func Load() (*Config, error) {
	v := viper.New()

	if envFile := os.Getenv("ENV_FILE"); envFile != "" {
		v.SetConfigFile(envFile)
		_ = v.ReadInConfig()
	} else {
		// Discover .env in current dir, executable dir, or parent dir
		v.SetConfigName(".env")
		v.SetConfigType("env")
		v.AddConfigPath(".")
		if execPath, err := os.Executable(); err == nil {
			v.AddConfigPath(filepath.Dir(execPath))
			v.AddConfigPath(filepath.Join(filepath.Dir(execPath), ".."))
		}
		_ = v.ReadInConfig()
	}

	return LoadWithViper(v)
}

// LoadWithViper loads configuration using a provided viper instance (useful for test isolation).
func LoadWithViper(v *viper.Viper) (*Config, error) {
	v.SetDefault("port", "3001")
	v.SetDefault("base_url", "http://localhost:3001")
	v.SetDefault("database_url", "postgresql://booru:booru@localhost:5432/booru")
	v.SetDefault("redis_url", "redis://localhost:6379")
	v.SetDefault("s3_region", "auto")
	v.SetDefault("s3_bucket", "booru")
	v.SetDefault("ipx_max_age", 604800) // 7 days in seconds

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	return &cfg, nil
}
