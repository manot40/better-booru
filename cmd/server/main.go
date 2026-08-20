package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/manot40/better-booru/internal/api"
	"github.com/manot40/better-booru/internal/cache"
	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/db"
	"github.com/manot40/better-booru/internal/image"
	"github.com/manot40/better-booru/internal/s3"
	"github.com/manot40/better-booru/internal/scraper"
	staticPkg "github.com/manot40/better-booru/internal/static"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron/v3"
	"github.com/uptrace/bun"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Starting Server...")

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to Database & Run Migrations
	var bunDB *bun.DB
	if cfg.DatabaseURL != "" && cfg.DatabaseURL != "noop" {
		bunDB, err = db.Connect(cfg, false)
		if err != nil {
			slog.Warn("Database connection failed, running in upstream-only mode", "error", err)
		} else {
			defer bunDB.Close()
			slog.Info("Connected to PostgreSQL")

			if err := db.RunMigrations(ctx, bunDB); err != nil {
				slog.Error("Failed to apply database migrations", "error", err)
				os.Exit(1)
			}
			slog.Info("Database migrations applied successfully")
		}
	}

	// Connect to Redis
	var rdb *redis.Client
	if cfg.RedisURL != "" {
		rdb, err = cache.Connect(cfg.RedisURL)
		if err != nil {
			slog.Warn("Redis connection failed, continuing without cache queue", "error", err)
		} else {
			defer rdb.Close()
			slog.Info("Connected to Redis")
		}
	}

	// Initialize S3 Client
	s3Client, err := s3.NewClient(ctx, cfg)
	if err != nil {
		slog.Warn("S3 initialization error", "error", err)
	}
	if s3Client != nil && s3Client.Enabled() {
		slog.Info("S3 storage client enabled", "bucket", cfg.S3Bucket)
	}

	// Initialize Danbooru Client
	danClient := danbooru.NewClient(cfg)

	// Initialize Workers
	baseCacheDir := ".cache/preview_images"
	maxAge := time.Duration(cfg.IPXMaxAge) * time.Second
	sc := scraper.NewScraper(bunDB, rdb, danClient)
	iw := image.NewWorker(bunDB, rdb, s3Client, baseCacheDir)
	cw := image.NewCleanupWorker(bunDB, s3Client, baseCacheDir, maxAge)

	// Setup Cron Scheduler
	cronRunner := cron.New(cron.WithSeconds())

	// Scraper: every 2 hours
	_, _ = cronRunner.AddFunc("0 0 */2 * * *", func() {
		slog.Info("[CRON] Starting scheduled Danbooru scraper")
		if err := sc.Run(context.Background()); err != nil {
			slog.Error("[CRON] Scraper error", "error", err)
		}
	})

	// Image Worker: every 30 minutes
	_, _ = cronRunner.AddFunc("0 */30 * * * *", func() {
		slog.Info("[CRON] Starting scheduled image optimization worker")
		if err := iw.Run(context.Background()); err != nil {
			slog.Error("[CRON] Image worker error", "error", err)
		}
	})

	// Image Cleanup: weekly on Sunday at midnight
	_, _ = cronRunner.AddFunc("0 0 0 * * 0", func() {
		slog.Info("[CRON] Starting scheduled preview cache cleanup")
		if cleaned, err := cw.Run(context.Background()); err != nil {
			slog.Error("[CRON] Cleanup worker error", "error", err)
		} else {
			slog.Info("[CRON] Cleanup completed", "cleaned", cleaned)
		}
	})

	cronRunner.Start()
	defer cronRunner.Stop()
	slog.Info("Background cron scheduler started")

	// Initialize GoFiber App
	app := fiber.New(fiber.Config{
		AppName:      "Better Booru",
		ServerHeader: "Better-Booru",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	// Setup API routes and middleware
	api.SetupRoutes(app, api.Dependencies{
		Config:        cfg,
		BunDB:         bunDB,
		RedisClient:   rdb,
		DanClient:     danClient,
		S3Storage:     s3Client,
		Scraper:       sc,
		ImageWorker:   iw,
		CleanupWorker: cw,
		BaseCacheDir:  baseCacheDir,
	})

	// Mount Static / SPA filesystem
	if staticFS, err := staticPkg.GetFS(); err == nil {
		app.Use("/", static.New("", static.Config{
			FS:         staticFS,
			IndexNames: []string{"index.html"},
			Browse:     false,
			MaxAge:     86400,
		}))
	}

	// Graceful Shutdown listener
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%s", cfg.Port)
		slog.Info("Server listening", "addr", addr, "url", cfg.BaseURL)
		if err := app.Listen(addr, fiber.ListenConfig{DisableStartupMessage: false}); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Server error", "error", err)
		}
	}()

	<-shutdownChan
	slog.Info("Shutting down server gracefully...")

	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		slog.Error("Error during server shutdown", "error", err)
	}

	slog.Info("Server exited cleanly")
}
