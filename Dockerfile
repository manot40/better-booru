FROM oven/bun:1.3-alpine AS base

FROM base AS builder
WORKDIR /usr/app
COPY . .

RUN bun ci
RUN --mount=type=secret,id=build_env,target=/usr/app/.env \
    bun --env-file=./.env all build && \
    bun run copyfiles

# Runtime image
FROM base AS runtime
WORKDIR /usr/app

COPY --from=builder /usr/app/dist ./

EXPOSE 3000
CMD ["bun", "index.js"]
