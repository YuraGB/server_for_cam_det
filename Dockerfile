# syntax=docker/dockerfile:1.7

##############################
# Builder
##############################
FROM oven/bun:1.2 AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun build \
    --compile \
    --minify \
    --target=bun-linux-x64-modern \
    --outfile server \
    ./src/index.ts


##############################
# Runtime
##############################
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/server .

RUN chmod +x server

EXPOSE 3000

USER nobody

ENTRYPOINT ["./server"]