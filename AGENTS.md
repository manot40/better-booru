# AGENTS.md - Developer & Agent Guide for Better Booru (Go Edition)

This guide provides technical specifications, architectural patterns, constraints, and instructions for AI agents and human developers maintaining and extending `booru-go`.

---

## 1. Project Overview & Architecture

`booru-go` is a high-performance Go backend service for mirroring and indexing Danbooru image boards, replacing the legacy TypeScript/ElysiaJS backend.

### Tech Stack
- **Web Framework:** [GoFiber v3](https://gofiber.io) (`github.com/gofiber/fiber/v3`)
- **Database & ORM:** PostgreSQL 16+ via [Bun ORM](https://bun.uptrace.dev) (`github.com/uptrace/bun`)
- **Cache & Task Queue:** Redis 7+ via `github.com/redis/go-redis/v9` (with `github.com/alicebob/miniredis/v2` for testing)
- **Image Processing:** Native `libvips` via [govips](https://github.com/davidbyttow/govips) (`github.com/davidbyttow/govips/v2/vips`)
- **Object Storage:** AWS SDK for Go v2 (`github.com/aws/aws-sdk-go-v2`) targeting Cloudflare R2 / AWS S3 / MinIO
- **API Documentation:** OpenAPI 2.0 / Swagger via [Swaggo](https://github.com/swaggo/swag) (`github.com/swaggo/swag`, `github.com/gofiber/swagger`)
- **Cron Scheduling:** [robfig/cron/v3](https://github.com/robfig/cron/v3)
- **Configuration:** [Viper](https://github.com/spf13/viper) with layered `.env` support

---

## 2. Directory Layout

```
booru-go/
├── cmd/
│   └── server/
│       └── main.go              # Application entrypoint, cron scheduler, graceful shutdown
├── docs/                        # Generated OpenAPI/Swagger documentation (swag init)
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── internal/
│   ├── api/                     # Fiber HTTP handlers, routing, response types
│   │   ├── admin.go             # Scraper/worker trigger and status endpoints
│   │   ├── autocomplete.go      # Tag prefix autocomplete handler
│   │   ├── images.go            # Image preview proxy & on-demand thumbnail renderer
│   │   ├── posts.go             # Post list, detail, and post tag handlers
│   │   ├── routes.go            # Central route registration and Swagger UI mount
│   │   └── types.go             # API request/response DTOs with Swaggo annotations
│   ├── cache/                   # Redis store and queue abstraction
│   ├── config/                  # Configuration loader and defaults (Viper)
│   ├── danbooru/                # Danbooru HTTP client with Cloudflare mitigation
│   ├── db/                      # Bun ORM schema models and migration runner
│   │   ├── migrations/          # Embedded SQL migration files
│   │   ├── models.go            # Post, Tag, PostImage models with Bun lifecycle hooks
│   │   └── connect.go           # Database connection & migration applicator
│   ├── image/                   # govips processing pipeline, LQIP generation, S3 caching
│   ├── middleware/              # Fiber middlewares (UserConfig, Auth, ETag, Cache-Control)
│   ├── query/                   # AST tag parser, PostgreSQL array overlap builder, pagination
│   ├── s3/                      # AWS S3 / Cloudflare R2 storage client
│   ├── scraper/                 # Background Danbooru ingestion worker
│   └── static/                  # Embedded static frontend asset provider (go:embed)
├── Dockerfile                   # Multi-stage container build with libvips-dev
├── Makefile                     # Build, test, lint, and run shortcuts
└── go.mod
```

---

## 3. Environment & Toolchain Prerequisites

### Windows (MSYS2 MinGW64)
Because `govips` links to `libvips` via CGO:
1. **MSYS2 toolchain** must be installed at `C:\msys64\mingw64\bin`.
2. Ensure `pkg-config`, `gcc`, and `mingw-w64-x86_64-libvips` are installed:
   ```bash
   pacman -S mingw-w64-x86_64-libvips mingw-w64-x86_64-gcc mingw-w64-x86_64-pkg-config
   ```
3. Always build and run tests with `CGO_ENABLED=1` and `C:\msys64\mingw64\bin` in `$env:PATH`:
   ```powershell
   $env:PATH = "C:\msys64\mingw64\bin;" + [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
   $env:CGO_ENABLED = "1"
   go test -count=1 ./...
   ```

### Linux / Docker
- Install system dependencies: `apt-get install -y libvips-dev pkg-config gcc`
- Standard build: `CGO_ENABLED=1 go build -o bin/booru-server ./cmd/server`

---

## 4. Key Architectural Patterns & Rules

### Bun ORM Schema & Indexing Hooks
> [!IMPORTANT]
> Bun ORM does **not** support arbitrary index directives inside struct tags (e.g. `index:name,using:gin`). 
> GIN indexes on PostgreSQL integer arrays (`tag_ids`, `meta_ids`), B-Tree indexes, and composite unique keys MUST be declared using Bun lifecycle hooks:
> - `bun.AfterCreateTableHook` (for `CREATE INDEX IF NOT EXISTS ... USING GIN (...)`)
> - `bun.BeforeCreateTableHook` (for `CREATE EXTENSION IF NOT EXISTS btree_gist`)

### Tag Query & AST Parser
- Danbooru tag queries support:
  - Negation: `-tag` (translated to `NOT (p.tag_ids @> ARRAY[id])`)
  - Optional / OR: `~tag1 ~tag2` (translated to `p.tag_ids && ARRAY[id1, id2]`)
  - Grouping: `(tag1 ~ tag2)`
  - Series tags with parentheses: `fate_(series)`
  - System tags: `score:>=10`, `rating:g,s`, `order:score`, `limit:100`
- Query parser creates an AST (`ASTNode`, `TermNode`, `GroupNode`, `NegationNode`) in `internal/query/tags_parser.go` which is compiled into parameterized SQL clauses.

### Danbooru API & Cloudflare Mitigation
- Danbooru blocks generic Go HTTP clients (`Go-http-client`) with a Cloudflare 403 challenge.
- All requests in `internal/danbooru/client.go` MUST provide:
  - `User-Agent: BetterBooru/1.0 (by <userId> on Danbooru)` (or modern Chrome UA fallback)
  - `Authorization: Basic <base64(userId:apiKey)>` header when credentials are present
  - `Referer: https://danbooru.donmai.us/` for image downloads to prevent CDN 403s
  - Exponential backoff retry loop on 403, 429, and 5xx responses.

### Image Optimization Pipeline (`govips`)
- Resizing uses Lanczos3 downsampling.
- Images are encoded to WebP with metadata stripped (`StripMetadata: true`).
- LQIP (Low-Quality Image Placeholder) generates a 16x16 WebP thumbnail with Gaussian blur ($\sigma=2$) returned as `data:image/webp;base64,...`.
- Previews are saved to S3 (if enabled) or local disk cache (`.cache/preview_images`) with a database record in `posts_images`.

### Fiber Context & Memory Safety
- GoFiber uses `fasthttp` request/response buffer pooling.
- Handlers MUST NOT retain raw string/byte references across goroutines. Always allocate a copy or decode to Go structs before passing to asynchronous background routines.

---

## 5. Development & Testing Rules

### Running Tests
All tests must be run without cache to verify fresh state:
```bash
# Set credentials dynamically in command environment
$env:DANBOORU_USER_ID="<your_username>"
$env:DANBOORU_API_KEY="<your_api_key>"
go test -count=1 -v ./...
```

### Writing Tests
- **No hardcoded credentials:** Tests must read credentials via `os.Getenv("DANBOORU_USER_ID")` and `os.Getenv("DANBOORU_API_KEY")`.
- **Database & Redis Isolation:** Use `httptest.Server` for upstream HTTP mocks and `miniredis.Run()` for Redis in unit tests.
- **Code Quality:** Ensure `go vet ./...` passes with 0 warnings before submitting any code changes.

### OpenAPI Documentation Workflow
Whenever request/response structs or handler annotations are modified:
```bash
# Re-generate Swagger documentation
make swagger
# or
go run github.com/swaggo/swag/cmd/swag init -g internal/api/routes.go --parseDependency --parseInternal
```
Interactive Swagger UI is accessible at `http://localhost:3001/swagger/index.html`.
