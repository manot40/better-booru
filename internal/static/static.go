package static

import (
	"embed"
	"io/fs"
)

//go:embed all:public
var publicFS embed.FS

// GetFS returns an io/fs.FS rooted at the public subfolder.
func GetFS() (fs.FS, error) {
	return fs.Sub(publicFS, "public")
}
