package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"strings"
	"time"

	"github.com/manot40/better-booru/internal/config"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bundebug"
	"github.com/uptrace/bun/migrate"
)

// Post maps to "posts" table.
type Post struct {
	bun.BaseModel `bun:"table:posts,alias:p"`

	ID            int       `bun:"id,pk" json:"id"`
	LQIP          []byte    `bun:"lqip,type:bytea" json:"lqip,omitempty"`
	Hash          string    `bun:"hash,unique,notnull" json:"hash"`
	Score         *int      `bun:"score" json:"score"`
	Source        *string   `bun:"source" json:"source"`
	Rating        string    `bun:"rating,notnull" json:"rating"` // g, s, q, e
	TagIDs        []int     `bun:"tag_ids,array,notnull" json:"tag_ids"`
	MetaIDs       []int     `bun:"meta_ids,array,notnull" json:"meta_ids"`
	PreviewExt    *string   `bun:"preview_ext" json:"preview_ext"`
	PreviewWidth  *int      `bun:"preview_width" json:"preview_width"`
	PreviewHeight *int      `bun:"preview_height" json:"preview_height"`
	SampleExt     *string   `bun:"sample_ext" json:"sample_ext"`
	SampleWidth   *int      `bun:"sample_width" json:"sample_width"`
	SampleHeight  *int      `bun:"sample_height" json:"sample_height"`
	Width         int       `bun:"width,notnull" json:"width"`
	Height        int       `bun:"height,notnull" json:"height"`
	FileExt       string    `bun:"file_ext,notnull" json:"file_ext"`
	FileSize      int       `bun:"file_size,notnull" json:"file_size"`
	PixivID       *int      `bun:"pixiv_id" json:"pixiv_id"`
	ParentID      *int      `bun:"parent_id" json:"parent_id"`
	UploaderID    int       `bun:"uploader_id,notnull" json:"uploader_id"`
	HasNotes      bool      `bun:"has_notes,notnull,default:false" json:"has_notes"`
	HasChildren   bool      `bun:"has_children,notnull,default:false" json:"has_children"`
	CreatedAt     time.Time `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`

	Images []PostImage `bun:"rel:has-many,join:id=post_id" json:"images,omitempty"`
}

var _ bun.AfterCreateTableHook = (*Post)(nil)

// AfterCreateTable creates btree and gin indexes on the posts table.
func (*Post) AfterCreateTable(ctx context.Context, query *bun.CreateTableQuery) error {
	_, err := query.DB().NewCreateIndex().
		Model((*Post)(nil)).
		Index("idx_score").
		Column("score").
		Using("btree").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("creating idx_score: %w", err)
	}

	_, err = query.DB().NewCreateIndex().
		Model((*Post)(nil)).
		Index("idx_posts_tag_ids").
		Column("tag_ids").
		Using("gin").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("creating idx_posts_tag_ids: %w", err)
	}

	_, err = query.DB().NewCreateIndex().
		Model((*Post)(nil)).
		Index("idx_posts_meta_ids").
		Column("meta_ids").
		Using("gin").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("creating idx_posts_meta_ids: %w", err)
	}

	return nil
}

// Tag maps to "tags" table.
type Tag struct {
	bun.BaseModel `bun:"table:tags,alias:t"`

	ID       int    `bun:"id,pk,autoincrement" json:"id"`
	Name     string `bun:"name,unique,notnull" json:"name"`
	Category int16  `bun:"category,notnull" json:"category"`
}

// PostImage maps to "posts_images" table.
type PostImage struct {
	bun.BaseModel `bun:"table:posts_images,alias:pi"`

	ID        string     `bun:"id,pk" json:"id"`
	PostID    int        `bun:"post_id,notnull" json:"post_id"`
	Loc       string     `bun:"loc,notnull" json:"loc"`   // CDN | LOCAL
	Type      string     `bun:"type,notnull" json:"type"` // PREVIEW | ORIGINAL
	Width     int        `bun:"width,notnull" json:"width"`
	Height    int        `bun:"height,notnull" json:"height"`
	FileType  string     `bun:"file_type,notnull" json:"file_type"`
	FileSize  int        `bun:"file_size,notnull" json:"file_size"`
	Orphaned  bool       `bun:"orphaned,notnull,default:false" json:"orphaned"`
	UpdatedAt *time.Time `bun:"updated_at" json:"updated_at"`
	CreatedAt time.Time  `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`

	Post *Post `bun:"rel:belongs-to,join:post_id=id" json:"post,omitempty"`
}

var _ bun.BeforeCreateTableHook = (*PostImage)(nil)

// BeforeCreateTable sets foreign keys for posts_images table.
func (*PostImage) BeforeCreateTable(ctx context.Context, query *bun.CreateTableQuery) error {
	query.ForeignKey(`("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE`)
	return nil
}

var _ bun.AfterCreateTableHook = (*PostImage)(nil)

// AfterCreateTable creates the composite unique index on posts_images(post_id, type).
func (*PostImage) AfterCreateTable(ctx context.Context, query *bun.CreateTableQuery) error {
	_, err := query.DB().NewCreateIndex().
		Model((*PostImage)(nil)).
		Index("posts_images_by_type").
		Unique().
		Column("post_id", "type").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("creating posts_images_by_type index: %w", err)
	}
	return nil
}

//go:embed migrations/*.sql
var migrationFS embed.FS

// Connect creates a bun.DB connection using the provided configuration.
func Connect(cfg *config.Config, debug bool) (*bun.DB, error) {
	if cfg.DatabaseURL == "" || cfg.DatabaseURL == "noop" {
		return nil, nil
	}

	dsn := cfg.DatabaseURL
	// If sslmode is not explicitly specified, default to sslmode=disable for seamless local development
	if !strings.Contains(dsn, "sslmode=") {
		if strings.Contains(dsn, "?") {
			dsn += "&sslmode=disable"
		} else {
			dsn += "?sslmode=disable"
		}
	}

	opts := []pgdriver.Option{
		pgdriver.WithDSN(dsn),
	}
	if strings.Contains(dsn, "sslmode=disable") {
		opts = append(opts, pgdriver.WithInsecure(true))
	}

	sqldb := sql.OpenDB(pgdriver.NewConnector(opts...))

	// Configure pool parameters per best practices
	sqldb.SetMaxOpenConns(25)
	sqldb.SetMaxIdleConns(10)
	sqldb.SetConnMaxLifetime(5 * time.Minute)
	sqldb.SetConnMaxIdleTime(1 * time.Minute)

	db := bun.NewDB(sqldb, pgdialect.New())

	if debug {
		db.AddQueryHook(bundebug.NewQueryHook(
			bundebug.WithVerbose(true),
		))
	}

	return db, nil
}

// RunMigrations runs all pending migrations.
func RunMigrations(ctx context.Context, db *bun.DB) error {
	migrations := migrate.NewMigrations()
	if err := migrations.Discover(migrationFS); err != nil {
		return fmt.Errorf("discovering migrations: %w", err)
	}

	migrator := migrate.NewMigrator(db, migrations)
	if err := migrator.Init(ctx); err != nil {
		return fmt.Errorf("initializing migrator: %w", err)
	}

	group, err := migrator.Migrate(ctx)
	if err != nil {
		return fmt.Errorf("applying migrations: %w", err)
	}

	if group.IsZero() {
		return nil
	}

	return nil
}
