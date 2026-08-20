package danbooru

import "time"

// Variant represents a media variant in Danbooru media_asset.
type Variant struct {
	Type    string `json:"type"` // "original", "sample", "720x720", "360x360", "180x180"
	URL     string `json:"url"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	FileExt string `json:"file_ext"`
}

// MediaAsset represents asset details attached to Danbooru post.
type MediaAsset struct {
	ID          int       `json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	MD5         string    `json:"md5"`
	FileExt     string    `json:"file_ext"`
	FileSize    int       `json:"file_size"`
	ImageWidth  int       `json:"image_width"`
	ImageHeight int       `json:"image_height"`
	Variants    []Variant `json:"variants"`
}

// DanbooruResponse represents raw post JSON from Danbooru API.
type DanbooruResponse struct {
	ID                 int        `json:"id"`
	CreatedAt          string     `json:"created_at"`
	UploaderID         int        `json:"uploader_id"`
	Score              int        `json:"score"`
	Source             string     `json:"source"`
	MD5                string     `json:"md5"`
	Rating             string     `json:"rating"`
	ImageWidth         int        `json:"image_width"`
	ImageHeight        int        `json:"image_height"`
	TagString          string     `json:"tag_string"`
	TagStringGeneral   string     `json:"tag_string_general"`
	TagStringCharacter string     `json:"tag_string_character"`
	TagStringCopyright string     `json:"tag_string_copyright"`
	TagStringArtist    string     `json:"tag_string_artist"`
	TagStringMeta      string     `json:"tag_string_meta"`
	FavCount           int        `json:"fav_count"`
	FileExt            string     `json:"file_ext"`
	LastNotedAt        *string    `json:"last_noted_at"`
	ParentID           *int       `json:"parent_id"`
	HasChildren        bool       `json:"has_children"`
	PixivID            *int       `json:"pixiv_id"`
	FileSize           int        `json:"file_size"`
	IsDeleted          bool       `json:"is_deleted"`
	MediaAsset         MediaAsset `json:"media_asset"`
}

// ExtractedImage represents normalized image variant properties.
type ExtractedImage struct {
	Width         int
	Height        int
	FileExt       string
	FileURL       string
	SampleURL     *string
	SampleExt     *string
	SampleWidth   *int
	SampleHeight  *int
	PreviewURL    *string
	PreviewExt    *string
	PreviewWidth  *int
	PreviewHeight *int
}

// GetDanbooruImage extracts image variants (original, sample, 720x720 preview) from Danbooru post.
func GetDanbooruImage(data *DanbooruResponse) ExtractedImage {
	img := ExtractedImage{
		Width:   data.MediaAsset.ImageWidth,
		Height:  data.MediaAsset.ImageHeight,
		FileExt: data.FileExt,
	}

	if len(data.MediaAsset.Variants) > 0 {
		for _, v := range data.MediaAsset.Variants {
			switch v.Type {
			case "original":
				img.Width = v.Width
				img.Height = v.Height
				img.FileExt = v.FileExt
				img.FileURL = v.URL
			case "sample":
				u := v.URL
				ext := v.FileExt
				w := v.Width
				h := v.Height
				img.SampleURL = &u
				img.SampleExt = &ext
				img.SampleWidth = &w
				img.SampleHeight = &h
			case "720x720":
				u := v.URL
				ext := v.FileExt
				w := v.Width
				h := v.Height
				img.PreviewURL = &u
				img.PreviewExt = &ext
				img.PreviewWidth = &w
				img.PreviewHeight = &h
			}
		}
	}

	return img
}

// AutocompleteItem represents a single tag suggestion from Danbooru autocomplete.
type AutocompleteItem struct {
	Label     string `json:"label"`
	Value     string `json:"value"`
	Category  int16  `json:"category"`
	PostCount int    `json:"post_count,omitempty"`
}

// PostCountResponse represents Danbooru /counts/posts.json response.
type PostCountResponse struct {
	Counts struct {
		Posts int `json:"posts"`
	} `json:"counts"`
}
