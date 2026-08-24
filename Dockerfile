FROM golang:1.26-alpine3.24 AS base-go
WORKDIR /app

RUN apk update && apk add --no-cache build-base make pkgconfig vips-dev
# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

FROM base-go AS docs
WORKDIR /app

RUN go install github.com/swaggo/swag/cmd/swag@v1.16.6

COPY . .
# Generate swagger docs and build binary
RUN make swagger

FROM node:24.19-alpine AS builder-web
WORKDIR /app

RUN npm -g add pnpm@11

COPY ./web/ ./
COPY --from=docs /app/docs ./docs

RUN pnpm ci
RUN pnpm run build

FROM base-go AS builder
WORKDIR /app

COPY --from=docs /app/docs ./docs
COPY --from=builder-web /app/.output/public ./internal/static/public

COPY . .

ENV CGO_ENABLED=1 \
    GOOS=linux
RUN make build

FROM alpine:3.24 AS runner
WORKDIR /app

RUN apk update && apk add --no-cache ca-certificates ffmpeg tzdata vips

RUN addgroup -S booru && adduser -S booru -G booru
RUN mkdir -p /app/.cache/preview_images && chown -R booru:booru /app

COPY --from=builder --chown=booru:booru /app/bin/booru-server /app/booru-server

USER booru
ENTRYPOINT ["/app/booru-server"]
