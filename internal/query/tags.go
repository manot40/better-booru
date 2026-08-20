package query

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
)

// TagItem represents a tag returned for a post.
type TagItem struct {
	ID       int    `bun:"id" json:"id"`
	Name     string `bun:"name" json:"name"`
	Category int16  `bun:"category" json:"category"`
}

// QueryPostTags retrieves all tags and meta tags for a specific post ID.
func QueryPostTags(ctx context.Context, bunDB *bun.DB, postID int) ([]TagItem, error) {
	var tags []TagItem

	postCTE := bunDB.NewSelect().
		TableExpr("posts AS p").
		Column("p.tag_ids", "p.meta_ids").
		Where("p.id = ?", postID).
		Limit(1)

	err := bunDB.NewSelect().
		With("post", postCTE).
		TableExpr("tags AS t").
		Column("t.id", "t.name", "t.category").
		Join("INNER JOIN post ON t.id = ANY(post.tag_ids || post.meta_ids)").
		OrderExpr("t.category DESC, t.name ASC").
		Scan(ctx, &tags)

	if err != nil {
		return nil, fmt.Errorf("querying post tags: %w", err)
	}

	return tags, nil
}
