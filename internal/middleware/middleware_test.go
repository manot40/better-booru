package middleware_test

import (
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserConfigMiddleware(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.UserConfigMiddleware())

	app.Get("/test", func(c fiber.Ctx) error {
		cfg := middleware.GetUserConfig(c)
		if cfg == nil {
			return c.JSON(fiber.Map{"configured": false})
		}
		return c.JSON(fiber.Map{
			"configured": true,
			"rating":     cfg.Rating,
			"opt":        cfg.Opt,
		})
	})

	// 1. Without header
	req1 := httptest.NewRequest(http.MethodGet, "/test", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp1.StatusCode)

	// 2. With Base64 header
	b64 := base64.StdEncoding.EncodeToString([]byte(`{"rating":["g","s"],"opt":true}`))
	req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
	req2.Header.Set("x-user-config", b64)
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	body2, _ := io.ReadAll(resp2.Body)
	assert.Contains(t, string(body2), `"configured":true`)
	assert.Contains(t, string(body2), `"g"`)
}

func TestAdminAuthMiddleware(t *testing.T) {
	app := fiber.New()
	adminGroup := app.Group("/admin", middleware.AdminAuthMiddleware("secret123"))
	adminGroup.Get("/status", func(c fiber.Ctx) error {
		return c.SendString("OK")
	})

	// 1. No token -> 401
	req1 := httptest.NewRequest(http.MethodGet, "/admin/status", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp1.StatusCode)

	// 2. Wrong token -> 401
	req2 := httptest.NewRequest(http.MethodGet, "/admin/status?token=wrong", nil)
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp2.StatusCode)

	// 3. Valid token in query -> 200
	req3 := httptest.NewRequest(http.MethodGet, "/admin/status?token=secret123", nil)
	resp3, err := app.Test(req3)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp3.StatusCode)

	// 4. Valid token in Authorization Bearer header -> 200
	req4 := httptest.NewRequest(http.MethodGet, "/admin/status", nil)
	req4.Header.Set("Authorization", "Bearer secret123")
	resp4, err := app.Test(req4)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp4.StatusCode)
}

func TestCachingAndETagMiddleware(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControlMiddleware(3600))
	app.Use(middleware.ETagMiddleware())

	app.Get("/data", func(c fiber.Ctx) error {
		return c.SendString("hello world payload")
	})

	// First request -> should return 200 with ETag and Cache-Control
	req1 := httptest.NewRequest(http.MethodGet, "/data", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp1.StatusCode)
	etag := resp1.Header.Get("ETag")
	assert.NotEmpty(t, etag)
	assert.Contains(t, resp1.Header.Get("Cache-Control"), "public, max-age=3600")

	// Second request with If-None-Match -> should return 304 Not Modified
	req2 := httptest.NewRequest(http.MethodGet, "/data", nil)
	req2.Header.Set("If-None-Match", etag)
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotModified, resp2.StatusCode)
}
