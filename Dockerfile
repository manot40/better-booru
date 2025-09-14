FROM oven/bun:1.2.20-alpine AS base

FROM base AS builder
WORKDIR /usr/app
COPY . .

ARG S3_BUCKET=""
ENV S3_BUCKET=$S3_BUCKET
ARG S3_REGION=""
ENV S3_REGION=$S3_REGION
ARG S3_ENDPOINT=""
ENV S3_ENDPOINT=$S3_ENDPOINT
ARG S3_PUBLIC_ENDPOINT=""
ENV S3_PUBLIC_ENDPOINT=$S3_PUBLIC_ENDPOINT
ARG S3_ACCESS_KEY_ID=""
ENV S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY=""
ENV S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY

RUN bun install
RUN bun all build && bun run copyfiles
RUN bun run scripts/upload-to-cdn.ts

# Runtime image
FROM base AS runtime
WORKDIR /usr/app

COPY --from=builder /usr/app/dist ./

EXPOSE 3000
CMD ["bun", "index.js"]
