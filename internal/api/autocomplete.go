package api

import (
	"regexp"
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

var reUnderscore = regexp.MustCompile(`_+`)

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
	qTerm := "%" + q + "%"
	if q == "" {
		return c.JSON([]AutocompleteItem{})
	} else {
		q = strings.Join(strings.Fields(q), "_")
	}

	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	if h.bunDB != nil {
		var tags []db.Tag
		err := h.bunDB.NewSelect().
			Model(&tags).
			Column("name", "category", "posts_count").
			ColumnExpr(
				"CASE WHEN name ILIKE ? THEN 1 WHEN name ILIKE ? THEN .8 ELSE word_similarity(name, ?) END AS relevance",
				q+"%", qTerm, q).
			Where("name ILIKE ? OR ? <% name", qTerm, q).
			Order("relevance DESC", "posts_count DESC").
			Limit(limit).
			Scan(c.Context())

		if err == nil {
			var items []AutocompleteItem
			for i := range tags {
				tag := &tags[i]
				items = append(items, AutocompleteItem{
					Label:     reUnderscore.ReplaceAllString(tag.Name, " "),
					Value:     tag.Name,
					Category:  tag.Category,
					PostCount: int(tag.PostsCount),
				})
			}

			return c.JSON(items)
		}
	}

	return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Failed querying autocomplete data"})
}
