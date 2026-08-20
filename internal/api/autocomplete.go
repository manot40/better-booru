package api

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/manot40/better-booru/internal/danbooru"
	"github.com/manot40/better-booru/internal/db"
	"github.com/uptrace/bun"
)

// AutocompleteHandler handles tag autocomplete suggestions.
type AutocompleteHandler struct {
	bunDB     *bun.DB
	danClient *danbooru.Client
}

// NewAutocompleteHandler creates a new AutocompleteHandler.
func NewAutocompleteHandler(bunDB *bun.DB, danClient *danbooru.Client) *AutocompleteHandler {
	return &AutocompleteHandler{
		bunDB:     bunDB,
		danClient: danClient,
	}
}

// AutocompleteHandler godoc
// @Summary      Autocomplete tags
// @Description  Returns tag autocomplete suggestions matching the query prefix
// @Tags         tags
// @Accept       json
// @Produce      json
// @Param        q      query     string  true   "Tag search query prefix"
// @Param        limit  query     int     false  "Maximum suggestions to return (default 10, max 50)"
// @Success      200    {array}   api.AutocompleteItem
// @Failure      400    {object}  api.ErrorResponse
// @Failure      500    {object}  api.ErrorResponse
// @Router       /api/autocomplete [get]
func (h *AutocompleteHandler) Autocomplete(c fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		return c.JSON([]AutocompleteItem{})
	}

	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	// 1. Check database for local matching tags
	var items []AutocompleteItem
	seen := make(map[string]struct{})

	if h.bunDB != nil {
		var tags []db.Tag
		err := h.bunDB.NewSelect().
			Model(&tags).
			Where("name ILIKE ?", q+"%").
			Order("name ASC").
			Limit(limit).
			Scan(c.Context())

		if err == nil {
			for _, t := range tags {
				seen[t.Name] = struct{}{}
				items = append(items, AutocompleteItem{
					Label:    t.Name,
					Value:    t.Name,
					Category: t.Category,
				})
			}
		}
	}

	// 2. If results are fewer than requested limit, fetch additional from upstream Danbooru
	if len(items) < limit && h.danClient != nil {
		remoteItems, err := h.danClient.Autocomplete(c.Context(), q)
		if err == nil {
			for _, ri := range remoteItems {
				if _, exists := seen[ri.Value]; !exists {
					seen[ri.Value] = struct{}{}
					items = append(items, AutocompleteItem{
						Label:     ri.Label,
						Value:     ri.Value,
						Category:  ri.Category,
						PostCount: ri.PostCount,
					})
					if len(items) >= limit {
						break
					}
				}
			}
		}
	}

	return c.JSON(items)
}
