package api

import "time"

// ErrorResponse represents an error message returned by the API.
type ErrorResponse struct {
	Error string `json:"error" example:"Post not found"`
}

// TagItem represents a tag with ID, name, and category.
type TagItem struct {
	ID       int    `json:"id" example:"101"`
	Name     string `json:"name" example:"solo"`
	Category int16  `json:"category" example:"0"` // 0: general, 1: artist, 3: copyright, 4: character, 5: meta
}

// PostItem represents a post item returned in post listings and details.
type PostItem struct {
	ID            int        `json:"id" example:"12026794"`
	Hash          string     `json:"hash" example:"92f7b4d1add652d381a0f3ded55b3f3d"`
	LQIP          *string    `json:"lqip,omitempty" example:"data:image/webp;base64,..."`
	Score         *int       `json:"score,omitempty" example:"1"`
	Rating        string     `json:"rating" example:"s" enums:"g,s,q,e"`
	Source        *string    `json:"source,omitempty" example:"https://x.com/..."`
	PixivID       *int       `json:"pixiv_id,omitempty" example:"123456"`
	ParentID      *int       `json:"parent_id,omitempty" example:"120000"`
	HasNotes      bool       `json:"has_notes" example:"false"`
	HasChildren   bool       `json:"has_children" example:"false"`
	CreatedAt     time.Time  `json:"created_at"`
	Width         int        `json:"width" example:"1366"`
	Height        int        `json:"height" example:"1992"`
	FileExt       string     `json:"file_ext" example:"jpg"`
	FileSize      int        `json:"file_size" example:"2099059"`
	FileURL       string     `json:"file_url" example:"https://cdn.donmai.us/original/..."`
	SampleURL     *string    `json:"sample_url,omitempty" example:"https://cdn.donmai.us/sample/..."`
	SampleWidth   *int       `json:"sample_width,omitempty" example:"850"`
	SampleHeight  *int       `json:"sample_height,omitempty" example:"1240"`
	PreviewURL    *string    `json:"preview_url,omitempty" example:"/api/images/preview/..."`
	PreviewWidth  *int       `json:"preview_width,omitempty" example:"123"`
	PreviewHeight *int       `json:"preview_height,omitempty" example:"180"`
	Tags          []TagItem  `json:"tags,omitempty"`
}

// PaginationMeta represents pagination details.
type PaginationMeta struct {
	Count    int     `json:"count" example:"4520"`
	Limit    int     `json:"limit" example:"50"`
	Offset   int     `json:"offset" example:"0"`
	Next     *string `json:"next,omitempty" example:"b12026790"`
	Previous *string `json:"previous,omitempty" example:"a12026850"`
}

// PostsListResponse represents the response containing paginated posts.
type PostsListResponse struct {
	Meta PaginationMeta `json:"meta"`
	Post []PostItem     `json:"post"`
}

// AutocompleteItem represents a tag completion suggestion.
type AutocompleteItem struct {
	Label     string `json:"label" example:"solo"`
	Value     string `json:"value" example:"solo"`
	Category  int16  `json:"category" example:"0"`
	PostCount int    `json:"post_count,omitempty" example:"150240"`
}

// WorkerStatusResponse represents cron worker status.
type WorkerStatusResponse struct {
	IsRunning bool       `json:"isRunning" example:"false"`
	LastRun   *time.Time `json:"lastRun,omitempty"`
}

// ActionResponse represents standard success message.
type ActionResponse struct {
	Status  string `json:"status" example:"success"`
	Message string `json:"message,omitempty" example:"Task started"`
}
