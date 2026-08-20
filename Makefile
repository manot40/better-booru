.PHONY: all build run test test-coverage vet swagger clean docker-build

APP_NAME = booru-server
BUILD_DIR = bin

all: swagger build

swagger:
	swag init -g internal/api/routes.go --parseDependency --parseInternal

build:
	CGO_ENABLED=1 go build -ldflags="-s -w" -o $(BUILD_DIR)/$(APP_NAME) ./cmd/server

run:
	CGO_ENABLED=1 go run ./cmd/server

test:
	CGO_ENABLED=1 go test -count=1 -v ./...

test-coverage:
	CGO_ENABLED=1 go test -count=1 -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

vet:
	CGO_ENABLED=1 go vet ./...

clean:
	rm -rf $(BUILD_DIR) coverage.out docs/

docker-build:
	docker build -t better-booru:latest .
