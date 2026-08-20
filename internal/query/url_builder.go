package query

import (
	"fmt"

	"github.com/uptrace/bun"
)

// SQL expression constants and generators for CDN and processed image URLs.

// BaseFileURL returns SQL for the original Danbooru CDN file URL.
func BaseFileURL() string {
	return `CONCAT('https://cdn.donmai.us/original/', SUBSTR(p.hash, 1, 2), '/', SUBSTR(p.hash, 3, 2), '/', p.hash, '.', p.file_ext)`
}

// BaseSampleURL returns SQL for the sample Danbooru CDN URL.
func BaseSampleURL() string {
	return `CASE WHEN p.sample_ext != '' AND p.sample_ext IS NOT NULL THEN CONCAT('https://cdn.donmai.us/sample/', SUBSTR(p.hash, 1, 2), '/', SUBSTR(p.hash, 3, 2), '/', 'sample-', p.hash, '.', p.sample_ext) END`
}

// BasePreviewURL returns SQL for the preview 720x720 Danbooru CDN URL.
func BasePreviewURL() string {
	return `CASE WHEN p.preview_ext != '' AND p.preview_ext IS NOT NULL THEN CONCAT('https://cdn.donmai.us/720x720/', SUBSTR(p.hash, 1, 2), '/', SUBSTR(p.hash, 3, 2), '/', p.hash, '.', p.preview_ext) END`
}

// LQIPExpr returns SQL expression to encode the bytea LQIP column as a base64 Data URL.
func LQIPExpr() string {
	return `CASE WHEN p.lqip IS NOT NULL THEN CONCAT('data:image/webp;base64,', encode(p.lqip, 'base64')) END`
}

// PreviewDimExpr returns SQL to choose the preview dimension from posts_images or fallback to posts.
func PreviewDimExpr(dim string) string {
	return fmt.Sprintf(`COALESCE(MAX(CASE WHEN pi.type = 'PREVIEW' THEN pi.%s END), p.preview_%s)`, dim, dim)
}

// ProcessedFileURLExpr returns SQL expression prioritizing cached local/S3 images over Danbooru CDN.
func ProcessedFileURLExpr(baseURL, s3PublicURL string) string {
	return fmt.Sprintf(`COALESCE(
		MAX(CASE WHEN pi.type = 'ORIGINAL' THEN CONCAT(CASE WHEN pi.loc = 'CDN' THEN '%s' ELSE '%s' END, '/images/original/', pi.id) END),
		%s
	)`, s3PublicURL, baseURL, BaseFileURL())
}

// ProcessedPreviewURLExpr returns SQL expression prioritizing cached local/S3 preview images over Danbooru CDN.
func ProcessedPreviewURLExpr(baseURL, s3PublicURL string) string {
	return fmt.Sprintf(`COALESCE(
		MAX(CASE WHEN pi.type = 'PREVIEW' THEN CONCAT(CASE WHEN pi.loc = 'CDN' THEN '%s' ELSE '%s' END, '/images/preview/', pi.id) END),
		%s
	)`, s3PublicURL, baseURL, BasePreviewURL())
}

// ApplySelectFields adds all dynamic columns (URLs, LQIP, dimensions) to a bun select query.
func ApplySelectFields(q *bun.SelectQuery, baseURL, s3PublicURL string) *bun.SelectQuery {
	return q.
		Column("p.id", "p.hash", "p.score", "p.source", "p.rating", "p.width", "p.height", "p.file_ext", "p.file_size").
		Column("p.sample_width", "p.sample_height", "p.pixiv_id", "p.parent_id", "p.uploader_id", "p.has_notes", "p.has_children", "p.created_at").
		ColumnExpr(LQIPExpr() + " AS lqip").
		ColumnExpr(ProcessedFileURLExpr(baseURL, s3PublicURL) + " AS file_url").
		ColumnExpr(BaseSampleURL() + " AS sample_url").
		ColumnExpr(ProcessedPreviewURLExpr(baseURL, s3PublicURL) + " AS preview_url").
		ColumnExpr(PreviewDimExpr("width") + " AS preview_width").
		ColumnExpr(PreviewDimExpr("height") + " AS preview_height")
}
