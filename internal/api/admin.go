package api

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/image"
	"github.com/manot40/better-booru/internal/scraper"
)

// AdminHandler manages background tasks and maintenance operations.
type AdminHandler struct {
	scraper       *scraper.Scraper
	imageWorker   *image.Worker
	cleanupWorker *image.CleanupWorker
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(s *scraper.Scraper, iw *image.Worker, cw *image.CleanupWorker) *AdminHandler {
	return &AdminHandler{
		scraper:       s,
		imageWorker:   iw,
		cleanupWorker: cw,
	}
}

// ScrapTriggerHandler godoc
// @Summary      Trigger Danbooru scraper
// @Description  Manually starts the Danbooru scrape worker in the background
// @Tags         admin
// @Accept       json
// @Produce      json
// @Success      200  {object}  api.ActionResponse
// @Failure      401  {object}  api.ErrorResponse
// @Failure      409  {object}  api.ErrorResponse
// @Security     ApiKeyAuth
// @Router       /api/scrap/trigger [get]
func (h *AdminHandler) ScrapTriggerHandler(c fiber.Ctx) error {
	if h.scraper == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(ErrorResponse{Error: "Scraper not configured"})
	}

	if h.scraper.IsBusy() {
		return c.Status(fiber.StatusConflict).JSON(ErrorResponse{Error: "Scraper is already running"})
	}

	go func() {
		_ = h.scraper.Run(context.Background())
	}()

	return c.JSON(ActionResponse{
		Status:  "success",
		Message: "Scraper triggered",
	})
}

// ScrapStatusHandler godoc
// @Summary      Get scraper status
// @Description  Returns whether scraper worker is currently active and its last run time
// @Tags         admin
// @Produce      json
// @Success      200  {object}  api.WorkerStatusResponse
// @Failure      401  {object}  api.ErrorResponse
// @Security     ApiKeyAuth
// @Router       /api/scrap/status [get]
func (h *AdminHandler) ScrapStatusHandler(c fiber.Ctx) error {
	if h.scraper == nil {
		return c.JSON(WorkerStatusResponse{IsRunning: false})
	}

	var lastRun *time.Time
	lr := h.scraper.LastRun()
	if !lr.IsZero() {
		lastRun = &lr
	}

	return c.JSON(WorkerStatusResponse{
		IsRunning: h.scraper.IsBusy(),
		LastRun:   lastRun,
	})
}

// ImagesTriggerHandler godoc
// @Summary      Trigger image optimization worker
// @Description  Processes pending tasks from the Redis image optimization queue
// @Tags         admin
// @Produce      json
// @Success      200  {object}  api.ActionResponse
// @Failure      401  {object}  api.ErrorResponse
// @Failure      409  {object}  api.ErrorResponse
// @Security     ApiKeyAuth
// @Router       /api/images/trigger [get]
func (h *AdminHandler) ImagesTriggerHandler(c fiber.Ctx) error {
	if h.imageWorker == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(ErrorResponse{Error: "Image worker not configured"})
	}

	if h.imageWorker.IsRunning() {
		return c.Status(fiber.StatusConflict).JSON(ErrorResponse{Error: "Image worker is already running"})
	}

	go func() {
		_ = h.imageWorker.Run(context.Background())
	}()

	return c.JSON(ActionResponse{
		Status:  "success",
		Message: "Image worker triggered",
	})
}

// ImagesCleanupHandler godoc
// @Summary      Trigger image cache cleanup
// @Description  Removes expired image previews past TTL
// @Tags         admin
// @Produce      json
// @Success      200  {object}  api.ActionResponse
// @Failure      401  {object}  api.ErrorResponse
// @Security     ApiKeyAuth
// @Router       /api/images/cleanup [get]
func (h *AdminHandler) ImagesCleanupHandler(c fiber.Ctx) error {
	if h.cleanupWorker == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(ErrorResponse{Error: "Cleanup worker not configured"})
	}

	cleaned, err := h.cleanupWorker.Run(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error: fmt.Sprintf("Cleanup failed: %v", err),
		})
	}

	return c.JSON(ActionResponse{
		Status:  "success",
		Message: fmt.Sprintf("Cleaned %d expired images", cleaned),
	})
}

// ImagesStatusHandler godoc
// @Summary      Get image worker status
// @Description  Returns whether image optimization worker is currently processing tasks
// @Tags         admin
// @Produce      json
// @Success      200  {object}  api.WorkerStatusResponse
// @Failure      401  {object}  api.ErrorResponse
// @Security     ApiKeyAuth
// @Router       /api/images/status [get]
func (h *AdminHandler) ImagesStatusHandler(c fiber.Ctx) error {
	if h.imageWorker == nil {
		return c.JSON(WorkerStatusResponse{IsRunning: false})
	}

	return c.JSON(WorkerStatusResponse{
		IsRunning: h.imageWorker.IsRunning(),
	})
}
