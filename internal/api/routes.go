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
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	_ "github.com/manot40/better-booru/docs"
	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/danbooru"
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
	Scraper       *scraper.Scraper
	ImageWorker   *image.Worker
	CleanupWorker *image.CleanupWorker
}

// SetupRoutes registers all application handlers and middlewares onto the Fiber app.
func SetupRoutes(app *fiber.App, deps Dependencies) {
	// Global middlewares
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${latency} ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-Config", "User-Config", "If-None-Match"},
		AllowMethods: []string{"GET", "POST", "HEAD", "PUT", "DELETE", "PATCH", "OPTIONS"},
	}))

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

	// Image Preview Handlers
	imageHandler := NewImageHandler(deps.BunDB, deps.S3Storage, deps.Config.IPXCacheDir)
	app.Get("/images/preview/:hash", middleware.CacheControlMiddleware(deps.Config.IPXMaxAge), imageHandler.ImagePreviewHandler)

	// Admin & Background Worker Handlers (Protected by API Key)
	adminHandler := NewAdminHandler(deps.Scraper, deps.ImageWorker, deps.CleanupWorker)
	adminGroup := apiGroup.Group("", middleware.AdminAuthMiddleware(deps.Config.DanbooruAPIKey))

	adminGroup.Get("/scrap/trigger", adminHandler.ScrapTriggerHandler)
	adminGroup.Get("/scrap/status", adminHandler.ScrapStatusHandler)

	adminGroup.Get("/images/trigger", adminHandler.ImagesTriggerHandler)
	adminGroup.Get("/images/cleanup", adminHandler.ImagesCleanupHandler)
	adminGroup.Get("/images/status", adminHandler.ImagesStatusHandler)
}
