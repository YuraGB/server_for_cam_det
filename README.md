# cam_serv

Production-focused Bun + Elysia WebSocket gateway for camera frames streamed from gRPC.

## What It Does

- Runs a WebSocket server for browser/client consumers.
- Connects to gRPC `DetectionService` streams (`liveStream`, `detectionStream`).
- Broadcasts each frame as one binary packet: metadata header + metadata JSON + image bytes.
- Handles reconnects to gRPC streams automatically.
- Supports immediate client leave via WebSocket message `leaveStream`.

## Tech Stack

- Bun runtime
- Elysia (HTTP routes + WS upgrade integration)
- `@grpc/grpc-js`
- `@grpc/proto-loader`
- TypeScript

## Requirements

- Bun v1.3+
- Running gRPC backend with `DetectionService`
- `detection.proto` available on disk

## Install

```bash
bun install
```

## Run

```bash
bun run start
```

For development with auto-reload:

```bash
bun run dev
```

Type-check:

```bash
bun run typecheck
```

## Configuration

All runtime configuration is env-driven.

- `PORT` (default: `3002`)
- `GRPC_SERVER_ADDRESS` (default: `localhost:50051`)
- `PROTO_PATH` (default: `<project>/models/detection.proto`)
- `TEST_VIDEO_PATH` (default: `<project>/test_video.mp4`)
- `FFMPEG_PATH` (default: `C:\ProgramData\chocolatey\bin\ffmpeg.exe`)
- `TIMEOUT_RECONNECT_MS` (default: `3000`)
- `MAX_FRAME_SIZE` (default: `10485760`)
- `LOG_LEVEL` (default: `info`)

PowerShell example:

```powershell
$env:PORT="3002"
$env:GRPC_SERVER_ADDRESS="localhost:50051"
$env:PROTO_PATH="D:\Projects\cam_serv\models\detection.proto"
bun run start
```

## HTTP Endpoints

- `GET /` -> `OK`
- `GET /ws?type=liveStream` -> WebSocket upgrade
- `GET /ws?type=detectionStream` -> WebSocket upgrade
- `GET /ws/file-frames` -> WebSocket upgrade for `test_video.mp4`

If `type` is invalid, server returns `400`.

## WebSocket Protocol

### Join

Connect with query param:

- `ws://host:3002/ws?type=liveStream`
- `ws://host:3002/ws?type=detectionStream`
- `ws://host:3002/ws/file-frames`

### Leave Immediately (No Delay)

Client can leave a stream by sending JSON:

```json
{"action":"leaveStream"}
```

or:

```json
{"type":"leaveStream"}
```

Server removes the socket from broadcast set before closing the connection, so frame delivery stops immediately.

### Heartbeat

- Server sends ping payloads periodically.
- Idle/stale sockets are closed automatically.

### File Frame Events

The file route sends binary websocket packets in the same format as the gRPC frame route:

1. `4 bytes` big-endian unsigned int: metadata length
2. metadata JSON bytes
3. decoded JPEG frame bytes

Frame timing follows the source video's native playback rate.

Metadata JSON shape:

```json
{
  "frameId": "file-frame-0",
  "timestamp": 1710000000000,
  "cameraId": "test_video.mp4",
  "detections": []
}
```

## Frame Packet Format

Each WS frame is sent as binary:

1. `4 bytes` big-endian unsigned int: metadata length
2. metadata JSON bytes
3. raw image bytes

Metadata shape:

```json
{
  "frameId": "...",
  "timestamp": 1710000000000,
  "cameraId": "...",
  "detections": []
}
```

## Production Hardening Included

- Validates WS stream type during upgrade.
- Fast leave behavior for `leaveStream`.
- Drops stalled sockets from broadcast path.
- Reuses serialized frame packet per broadcast cycle.
- Prevents duplicate reconnect timers.
- Graceful shutdown for gRPC streams on `SIGINT` / `SIGTERM`.

## Suggested Folder for Proto

Create:

```text
models/detection.proto
```

Or provide absolute path via `PROTO_PATH`.

## Start Entry Points

- `index.ts` -> imports `src/server.ts`
- main runtime server: `src/server.ts`
