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
    ./src/server.ts


##############################
# Runtime
##############################
FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=builder /app/server /app/server
COPY --from=builder /app/drizzle /app/drizzle

EXPOSE 3000

USER nonroot:nonroot

ENTRYPOINT ["/app/server"]