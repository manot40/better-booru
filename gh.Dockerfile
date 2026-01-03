FROM oven/bun:1.3.5-alpine AS base

FROM base AS builder
WORKDIR /usr/app
COPY . .

RUN bun ci
RUN bun copy:bin

# Runtime image
FROM base AS runtime
WORKDIR /usr/app

COPY --from=builder /usr/app/dist ./

EXPOSE 3000
CMD ["bun", "index.js"]
