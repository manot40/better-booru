FROM oven/bun:1-alpine AS base

FROM base AS builder
WORKDIR /usr/app

ENV CI=true
ENV NITRO_PRESET=bun
COPY . .

RUN bun install
RUN bun -bun run build

# Runtime image
FROM base AS runtime
WORKDIR /usr/app

ENV NODE_ENV=production
COPY --from=builder /usr/app/.output ./

EXPOSE 3000
CMD ["bun", "run", "server/index.mjs"]
