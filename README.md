# Better Booru (Go Edition)

[![Go Version](https://img.shields.io/badge/Go-1.24%2B-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenAPI](https://img.shields.io/badge/Swagger-OpenAPI%202.0-85EA2D?style=flat&logo=swagger)](http://localhost:3001/swagger/index.html)

A high-performance Golang mirror and indexing backend for Danbooru image boards. Engineered for low latency, efficient memory utilization, and scalable image caching using native `libvips`.

---

## ✨ Features

- **⚡ Fast Web Framework:** Built on [GoFiber v3](https://gofiber.io) with native `context.Context` integration, connection pooling, and weak ETag support.
- **🔍 Advanced AST Tag Parser:** Supports full Danbooru search query syntax including negation (`-tag`), OR groups (`~tag1 ~tag2`), parentheses `(a ~ b)`, and series tags (`fate_(series)`).
- **🐘 Optimized PostgreSQL Indexing:** [Bun ORM](https://bun.uptrace.dev) schema with PostgreSQL GIN array indexes (`tag_ids`, `meta_ids`) for sub-millisecond tag filtering.
- **🖼️ Native `libvips` Image Processing:** Hardware-accelerated image resizing with Lanczos3, metadata stripping, WebP encoding, and 16x16 Gaussian blur LQIP (Low-Quality Image Placeholder) generation via [govips](https://github.com/davidbyttow/govips).
- **☁️ Hybrid Storage:** Cloudflare R2 / AWS S3 / MinIO integration with fallback to local disk caching.
- **📊 Redis Queue & Cache:** Asynchronous worker pipeline for background image optimization and post count caching.
- **🤖 Resilient Scraper:** Background Danbooru feed ingestion with browser user-agent headers, BasicAuth, and exponential backoff retry to mitigate Cloudflare bot challenges.
- **📜 Swagger / OpenAPI UI:** Interactive documentation at `/swagger/index.html` generated via `swaggo/swag`.
- **📦 Single Binary Deployment:** Bundles frontend SPA assets via `go:embed`.

---

## 🛠️ Prerequisites

- **Go:** 1.23 or newer
- **libvips:** 8.15+ development libraries (`libvips-dev` on Linux / `mingw-w64-x86_64-libvips` on Windows MSYS2)
- **PostgreSQL:** 16+ (requires `btree_gist` extension)
- **Redis:** 7+

---

## 🚀 Getting Started

### 1. Clone & Setup Environment

```bash
git clone https://github.com/manot40/better-booru.git
cd better-booru/booru-go
cp .env.example .env
```

Edit `.env` to configure your environment:

```env
PORT=3001
BASE_URL=http://localhost:3001
DATABASE_URL=postgresql://booru:booru@127.0.0.1:5432/booru
REDIS_URL=redis://127.0.0.1:6379

# Danbooru API Credentials (Required for scraper and admin routes)
DANBOORU_USER_ID=your_danbooru_username
DANBOORU_API_KEY=your_danbooru_api_key

# S3 / Cloudflare R2 Storage (Optional)
S3_REGION=auto
S3_BUCKET=booru
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://pub-<id>.r2.dev
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
```

---

### 2. Build & Run

#### Using Makefile:
```bash
# Generate Swagger docs and build binary
make all

# Run server
make run
```

#### Windows (PowerShell with MSYS2 MinGW64):
```powershell
$env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH
$env:CGO_ENABLED = "1"
go run ./cmd/server
```

#### Linux / macOS:
```bash
CGO_ENABLED=1 go run ./cmd/server
```

---

## 🐳 Docker Deployment

A multi-stage `Dockerfile` is provided for containerized deployments:

```bash
# Build image
docker build -t better-booru .

# Run container
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  -v booru-cache:/app/.cache/preview_images \
  better-booru
```

---

## 📖 API Endpoints & Swagger

Once the server is running, visit **`http://localhost:3001/swagger/index.html`** for interactive OpenAPI documentation.

### Core Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/posts` | Paginated post listing with tag search and cursor pagination |
| `GET` | `/api/posts/:id` | Detailed post metadata, URLs, and tags |
| `GET` | `/api/posts/:id/tags` | Associated tags for a post |
| `GET` | `/api/autocomplete` | Tag completion suggestions matching search prefix |
| `GET` | `/api/images/preview/:hash` | Serves optimized WebP preview thumbnail (or generates on-demand) |
| `GET` | `/swagger/*` | Interactive Swagger UI |

### Administrative Endpoints (`?token=<DANBOORU_API_KEY>`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/scrap/trigger` | Manually starts background Danbooru scraper |
| `GET` | `/api/scrap/status` | Current status and last run timestamp of scraper |
| `GET` | `/api/images/trigger` | Starts background image optimization queue worker |
| `GET` | `/api/images/cleanup` | Removes expired image cache files past TTL |
| `GET` | `/api/images/status` | Current status of image optimization worker |

---

## 🧪 Testing

Run all unit and integration tests across packages:

```bash
# Run tests with dynamic environment variables
$env:DANBOORU_USER_ID="<your_username>"
$env:DANBOORU_API_KEY="<your_api_key>"
go test -count=1 -v ./...
```

Run test coverage report:
```bash
make test-coverage
```

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
