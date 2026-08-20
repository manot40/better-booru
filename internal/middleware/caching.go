package middleware

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// CacheControlMiddleware adds Cache-Control headers to API responses.
func CacheControlMiddleware(maxAgeSeconds int) fiber.Handler {
	if maxAgeSeconds <= 0 {
		maxAgeSeconds = 3600
	}
	headerVal := fmt.Sprintf("public, max-age=%d, stale-while-revalidate=%d", maxAgeSeconds, maxAgeSeconds*24)

	return func(c fiber.Ctx) error {
		err := c.Next()
		if c.Response().StatusCode() == fiber.StatusOK {
			c.Set("Cache-Control", headerVal)
		}
		return err
	}
}

// ETagMiddleware calculates and verifies weak ETag for responses.
func ETagMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		err := c.Next()
		if err != nil {
			return err
		}

		if c.Response().StatusCode() != fiber.StatusOK {
			return nil
		}

		body := c.Response().Body()
		if len(body) == 0 {
			return nil
		}

		h := sha1.Sum(body)
		etag := `W/"` + strconv.Itoa(len(body)) + "-" + hex.EncodeToString(h[:8]) + `"`

		if match := c.Get("If-None-Match"); match != "" && match == etag {
			c.Response().ResetBody()
			return c.SendStatus(fiber.StatusNotModified)
		}

		c.Set("ETag", etag)
		return nil
	}
}
