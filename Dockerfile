FROM oven/bun:1.2.20-alpine AS base

FROM base AS builder
WORKDIR /usr/app
COPY . .



RUN bun install
RUN --mount=type=secret,id=build_env,target=/usr/app/.env \
    ln -s /usr/app/.env /usr/app/apps/web/.env && \
    ln -s /usr/app/.env /usr/app/apps/server/.env && \
    bun all build && \
    bun run copyfiles

# Runtime image
FROM base AS runtime
WORKDIR /usr/app

COPY --from=builder /usr/app/dist ./

EXPOSE 3000
CMD ["bun", "index.js"]
