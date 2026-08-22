package api

// @title           Better Booru API
// @version         1.0
// @description     High-performance Golang mirror service for Danbooru image board.
// @host            localhost:3001
// @BasePath        /
// @schemes         http https

// @securityDefinitions.apikey ApiKeyAuth
// @in query
// @name token
// @description Token or API Key for administrative routes

import (
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	_ "github.com/manot40/better-booru/docs"
	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/encoder"
	"github.com/manot40/better-booru/internal/image"
	"github.com/manot40/better-booru/internal/middleware"
	"github.com/manot40/better-booru/internal/scraper"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"
)

// Dependencies contains the application service dependencies required by the API.
type Dependencies struct {
	Config        *config.Config
	BunDB         *bun.DB
	RedisClient   *redis.Client
	DanClient     *danbooru.Client
	S3Storage     image.S3Storage
	LogWriter     io.Writer
	Scraper       *scraper.Scraper
	ImageWorker   *image.Worker
	CleanupWorker *image.CleanupWorker
}

// SetupRoutes registers all application handlers and middlewares onto the Fiber app.
func SetupRoutes(app *fiber.App, deps Dependencies) {
	loggerCfg := logger.Config{
		Format:     "[${time}] ${status} - ${latency} ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
	}
	if deps.LogWriter != nil {
		loggerCfg.Stream = deps.LogWriter
	}

	// Global middlewares
	app.Use(recover.New())
	app.Use(logger.New(loggerCfg))
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-Config", "User-Config", "If-None-Match"},
		AllowMethods: []string{"GET", "POST", "HEAD", "PUT", "DELETE", "PATCH", "OPTIONS"},
	}))
	if deps.Config.RateLimit {
		app.Use(limiter.New(limiter.Config{
			Next: func(c fiber.Ctx) bool {
				path := c.Path()
				return path == "/" || path == "/favicon.ico" || strings.HasPrefix(path, "/web_assets")
			},
			MaxFunc: func(c fiber.Ctx) int {
				if strings.HasPrefix(c.Path(), "/images/preview") {
					return 100
				}
				return 50
			},
			Expiration:        5 * time.Second,
			LimiterMiddleware: limiter.SlidingWindow{},
		}))
	}

	// UserConfig & Caching middleware
	apiGroup := app.Group("/api")
	apiGroup.Use(middleware.UserConfigMiddleware())
	apiGroup.Use(middleware.CacheControlMiddleware(60 * 5))
	apiGroup.Use(middleware.ETagMiddleware())

	// Post Handlers
	postHandler := NewPostHandler(deps.BunDB, deps.RedisClient, deps.DanClient, deps.Config)
	apiGroup.Get("/posts", postHandler.ListPostsHandler)
	apiGroup.Get("/posts/:id", postHandler.GetPostHandler)
	apiGroup.Get("/posts/:id/tags", postHandler.GetPostTagsHandler)

	// Autocomplete Handlers
	autocompleteHandler := NewAutocompleteHandler(deps.BunDB, deps.DanClient)
	apiGroup.Get("/autocomplete", autocompleteHandler.Autocomplete)

	// Image Preview and Encoder Handlers
	var enc *encoder.Encoder
	baseCacheDir := ".cache/preview_images"
	encoderEnabled := false
	maxAge := 604800
	if deps.Config != nil {
		baseCacheDir = filepath.Join(deps.Config.IPXCacheDir, "preview_images")
		encoderEnabled = deps.Config.IPXEnableAvif
		if deps.Config.IPXEnableAvif {
			enc = encoder.New(deps.Config.IPXCacheDir)
		}
		if deps.Config.IPXMaxAge > 0 {
			maxAge = deps.Config.IPXMaxAge
		}
	}

	imgHandler := NewImageHandler(deps.BunDB, deps.S3Storage, baseCacheDir, enc, encoderEnabled)
	imgGroup := app.Group("/images", middleware.CacheControlMiddleware(maxAge), middleware.ETagMiddleware())
	imgGroup.Get("/preview/:hash", imgHandler.PreviewHandler)
	imgGroup.Get("/encoder/:hash", imgHandler.EncoderHandler)
	imgGroup.Get("/:b64", imgHandler.ProxyHandler)

	// Admin & Background Worker Handlers (Protected by API Key)
	adminHandler := NewAdminHandler(deps.Scraper, deps.ImageWorker, deps.CleanupWorker)
	adminGroup := apiGroup.Group("", middleware.AdminAuthMiddleware(deps.Config.DanbooruAPIKey))

	adminGroup.Get("/scrap/trigger", adminHandler.ScrapTriggerHandler)
	adminGroup.Get("/scrap/status", adminHandler.ScrapStatusHandler)

	adminGroup.Get("/images/trigger", adminHandler.ImagesTriggerHandler)
	adminGroup.Get("/images/cleanup", adminHandler.ImagesCleanupHandler)
	adminGroup.Get("/images/status", adminHandler.ImagesStatusHandler)
}
