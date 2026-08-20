package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

// AdminAuthMiddleware validates that requests to admin endpoints match the configured API key.
func AdminAuthMiddleware(apiKey string) fiber.Handler {
	return func(c fiber.Ctx) error {
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "API key authentication not configured",
			})
		}

		token := c.Query("token")
		if token == "" {
			authHeader := c.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
			} else {
				token = authHeader
			}
		}

		if token != apiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		return c.Next()
	}
}
