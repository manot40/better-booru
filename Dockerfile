FROM oven/bun:1-alpine AS base

FROM base AS builder
WORKDIR /usr/app
COPY . .

RUN bun install --frozen-lockfile
RUN bun all build && bun run copyfiles

# Runtime image
FROM base AS runtime
WORKDIR /usr/app

COPY --from=builder /usr/app/dist ./

EXPOSE 3000
CMD ["bun", "index.js"]
