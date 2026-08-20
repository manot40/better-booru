package s3_test

import (
	"context"
	"testing"

	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClient_Disabled(t *testing.T) {
	cfg := &config.Config{
		S3AccessKeyID: "",
	}
	client, err := s3.NewClient(context.Background(), cfg)
	require.NoError(t, err)
	assert.False(t, client.Enabled())

	// Operations should fail or be noop gracefully
	err = client.Upload(context.Background(), "test.jpg", []byte("123"), "image/jpeg")
	assert.Error(t, err)

	err = client.Delete(context.Background(), "test.jpg")
	assert.NoError(t, err)

	exists, err := client.Exists(context.Background(), "test.jpg")
	assert.NoError(t, err)
	assert.False(t, exists)
}

func TestClient_EnabledAndPublicURL(t *testing.T) {
	cfg := &config.Config{
		S3AccessKeyID:     "minioadmin",
		S3SecretAccessKey: "minioadmin",
		S3Bucket:          "booru-images",
		S3Region:          "us-east-1",
		S3Endpoint:        "http://localhost:9000",
		S3PublicEndpoint:  "https://cdn.example.com",
	}

	client, err := s3.NewClient(context.Background(), cfg)
	require.NoError(t, err)
	assert.True(t, client.Enabled())

	// Custom CDN URL
	url := client.PublicURL("images/preview/abc12345.webp")
	assert.Equal(t, "https://cdn.example.com/images/preview/abc12345.webp", url)

	// Endpoint fallback
	cfgNoCDN := &config.Config{
		S3AccessKeyID:     "minioadmin",
		S3SecretAccessKey: "minioadmin",
		S3Bucket:          "booru-images",
		S3Region:          "us-east-1",
		S3Endpoint:        "http://localhost:9000",
	}
	clientNoCDN, err := s3.NewClient(context.Background(), cfgNoCDN)
	require.NoError(t, err)
	urlNoCDN := clientNoCDN.PublicURL("images/preview/abc12345.webp")
	assert.Equal(t, "http://localhost:9000/booru-images/images/preview/abc12345.webp", urlNoCDN)

	// AWS standard fallback
	cfgStandard := &config.Config{
		S3AccessKeyID:     "key",
		S3SecretAccessKey: "secret",
		S3Bucket:          "my-bucket",
	}
	clientStd, err := s3.NewClient(context.Background(), cfgStandard)
	require.NoError(t, err)
	urlStd := clientStd.PublicURL("images/preview/abc.webp")
	assert.Equal(t, "https://my-bucket.s3.amazonaws.com/images/preview/abc.webp", urlStd)
}
