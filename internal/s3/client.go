package s3

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
	"github.com/manot40/better-booru/internal/config"
)

// Client provides S3 storage operations.
type Client struct {
	s3Client  *awss3.Client
	bucket    string
	publicURL string
	endpoint  string
	enabled   bool
}

// NewClient initializes an S3 client from configuration.
func NewClient(ctx context.Context, cfg *config.Config) (*Client, error) {
	if !cfg.S3Enabled() {
		return &Client{enabled: false}, nil
	}

	region := cfg.S3Region
	if region == "" {
		region = "auto"
	}

	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.S3AccessKeyID, cfg.S3SecretAccessKey, ""),
		),
	}

	if cfg.S3Endpoint != "" {
		opts = append(opts, awsconfig.WithEndpointResolverWithOptions(
			aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...any) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:               cfg.S3Endpoint,
					SigningRegion:     region,
					HostnameImmutable: true,
				}, nil
			}),
		))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("loading aws config: %w", err)
	}

	s3Client := awss3.NewFromConfig(awsCfg, func(o *awss3.Options) {
		o.UsePathStyle = true
	})

	return &Client{
		s3Client:  s3Client,
		bucket:    cfg.S3Bucket,
		publicURL: strings.TrimRight(cfg.S3PublicEndpoint, "/"),
		endpoint:  strings.TrimRight(cfg.S3Endpoint, "/"),
		enabled:   true,
	}, nil
}

// Enabled reports whether S3 storage is enabled and configured.
func (c *Client) Enabled() bool {
	return c != nil && c.enabled && c.s3Client != nil
}

// Upload uploads raw bytes to the specified key in S3.
func (c *Client) Upload(ctx context.Context, key string, data []byte, contentType string) error {
	if !c.Enabled() {
		return errors.New("s3 is not enabled")
	}

	key = strings.TrimLeft(key, "/")
	input := &awss3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	}

	_, err := c.s3Client.PutObject(ctx, input)
	if err != nil {
		return fmt.Errorf("uploading %s to s3: %w", key, err)
	}

	return nil
}

// Delete removes an object from S3.
func (c *Client) Delete(ctx context.Context, key string) error {
	if !c.Enabled() {
		return nil
	}

	key = strings.TrimLeft(key, "/")
	input := &awss3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}

	_, err := c.s3Client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("deleting %s from s3: %w", key, err)
	}

	return nil
}

// Exists checks if an object exists in S3.
func (c *Client) Exists(ctx context.Context, key string) (bool, error) {
	if !c.Enabled() {
		return false, nil
	}

	key = strings.TrimLeft(key, "/")
	input := &awss3.HeadObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}

	_, err := c.s3Client.HeadObject(ctx, input)
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) {
			if apiErr.ErrorCode() == "NotFound" || apiErr.ErrorCode() == "NoSuchKey" {
				return false, nil
			}
		}
		var notFound *s3types.NotFound
		if errors.As(err, &notFound) {
			return false, nil
		}
		return false, fmt.Errorf("checking existence of %s in s3: %w", key, err)
	}

	return true, nil
}

// PublicURL returns the public access URL for a given S3 key.
func (c *Client) PublicURL(key string) string {
	if c == nil {
		return ""
	}
	key = strings.TrimLeft(key, "/")
	if c.publicURL != "" {
		return c.publicURL + "/" + key
	}
	if c.endpoint != "" {
		return fmt.Sprintf("%s/%s/%s", c.endpoint, c.bucket, key)
	}
	return fmt.Sprintf("https://%s.s3.amazonaws.com/%s", c.bucket, key)
}
