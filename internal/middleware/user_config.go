package middleware

import (
	"encoding/base64"
	"encoding/json"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// UserConfig represents client preference headers.
type UserConfig struct {
	Rating   []string `json:"rating,omitempty"`
	Provider string   `json:"provider,omitempty"`
	Opt      bool     `json:"opt,omitempty"`
}

const UserConfigContextKey = "userConfig"

// UserConfigMiddleware extracts and decodes UserConfig from headers or cookies.
func UserConfigMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		raw := c.Get("x-user-config")
		if raw == "" {
			raw = c.Get("user-config")
		}

		var jsonStr string
		if raw != "" {
			// Check if base64 encoded
			if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil {
				jsonStr = string(decoded)
			} else {
				jsonStr = raw
			}
		} else {
			jsonStr = c.Cookies("user-config")
			if jsonStr == "" {
				jsonStr = c.Cookies("user_config")
			}
		}

		if jsonStr != "" {
			var uc UserConfig
			if err := json.Unmarshal([]byte(strings.TrimSpace(jsonStr)), &uc); err == nil {
				c.Locals(UserConfigContextKey, &uc)
			}
		}

		return c.Next()
	}
}

// GetUserConfig retrieves the UserConfig pointer from fiber context.
func GetUserConfig(c fiber.Ctx) *UserConfig {
	val := c.Locals(UserConfigContextKey)
	if val == nil {
		return nil
	}
	if uc, ok := val.(*UserConfig); ok {
		return uc
	}
	return nil
}
