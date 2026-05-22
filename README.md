# cam_serv

Production-ready WebRTC signaling server on Bun + Elysia.

## What It Does

- accepts WebSocket peer connections
- verifies JWT bearer tokens on WebSocket upgrade
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

## Authentication

`cam_serv` does not initialize `better-auth` directly. It expects a short-lived JWT access token from the frontend auth server and verifies it locally during WebSocket upgrade.

Send the token as either:

```text
Authorization: Bearer <jwt>
```

or for browser WebSocket clients:

```text
ws://host:3002/ws?access_token=<jwt>
```

Required JWT claims:

- `sub` user id
- `iss` must match `AUTH_JWT_ISSUER`
- `aud` must include `AUTH_JWT_AUDIENCE`
- `exp` unix timestamp in seconds

Optional claims already supported:

- `email`
- `role`
- `roles`
- `permissions`

After successful JWT verification, `cam_serv` upserts the authenticated user into its local `shadow_users` table in `db.sqlite`. This keeps auth ownership in the frontend auth server while still letting the signaling server store local user state and server-specific metadata.

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
- `AUTH_JWT_SECRET` shared HMAC secret for service tokens
- `AUTH_JWT_ISSUER` default `cam_frontend`
- `AUTH_JWT_AUDIENCE` default `cam_serv`

See [.env.example](/D:/Projects/cam_serv/.env.example).
