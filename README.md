# cam_serv

Production-ready WebRTC signaling server on Bun + Elysia.

## What It Does

- accepts WebSocket peer connections
- registers peers by `peerId`
- forwards signaling messages to a target peer
- removes stale peers with heartbeat monitoring
- exposes a lightweight health endpoint

## Run

```bash
bun install
bun run start
```

Development mode:

```bash
bun run dev
```

Type check:

```bash
bun run typecheck
```

## Endpoints

- `GET /` -> `OK`
- `GET /health` -> server health and connected peer count
- `GET /ws` -> WebSocket signaling endpoint

## WebSocket Flow

1. Connect to `ws://host:3002/ws`
2. Register with:

```json
{
  "type": "register",
  "peerId": "alice"
}
```

3. Send signaling message to another peer:

```json
{
  "type": "offer",
  "targetPeerId": "bob",
  "sdp": "..."
}
```

The target peer receives the same payload plus sender `peerId`:

```json
{
  "type": "offer",
  "targetPeerId": "bob",
  "sdp": "...",
  "peerId": "alice"
}
```

## Server Messages

The server may send:

- `{"type":"connected"}` after socket open
- `{"type":"registered","peerId":"alice"}` after successful register
- `{"type":"ping"}` as heartbeat
- `{"type":"error", ...}` for invalid payloads, missing target, duplicate peer replacement, and size violations

## Production Notes

- peer registration is validated before forwarding is allowed
- duplicate `peerId` registration replaces the old connection cleanly
- oversized messages are rejected and the socket is closed
- stale peers are cleaned up by heartbeat timeout
- `/health` can be used by probes and load balancers

## Configuration

Environment variables:

- `PORT` default `3002`
- `LOG_LEVEL` default `info`
- `MAX_SIGNALING_MESSAGE_BYTES` default `262144`

See [.env.example](/D:/Projects/cam_serv/.env.example).
