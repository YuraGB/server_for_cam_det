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

`cam_serv` does not initialize `better-auth` directly. It accepts short-lived JWT access tokens from the frontend auth server via JWKS and service JWTs signed with the shared `AUTH_JWT_SECRET`.

Send the token as either:

```text
Authorization: Bearer <jwt>
```

or for browser WebSocket clients:

```text
ws://host:3002/ws?token=<jwt>
```

⚠️ **Security Warning**: Query parameter is a fallback only.

- In production, use **`wss://`** (encrypted) exclusively
- Use short-lived tokens (low TTL)
- Ensure reverse proxies, CDNs, and monitoring services do not log/cache `token` or `access_token`
- Prefer `Authorization` header when possible

## Security Features

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
- `JWT_ISSUER` better-auth issuer, default `better-auth`
- `JWT_AUDIENCE` shared audience, default `signaling`
- `SERVICE_JWT_ISSUERS` comma-separated HS256 service issuers, default `camera-cv-service`

## K8S (kubernetes)

```Bash
  # build local docker image
  docker build -t signaling-app:v1 .

  # Save
  docker save signaling-app:v1 -o signaling-app-v1.tar

  # export to k3s
  sudo k3s ctr images import signaling-app-v1.tar

  # start/apply kubernetes
  ./start.kubernetes.sh

  # delete stop kubernetes
  ./stop.kubernetes.sh
```

```bash
  #remove docker image
  sudo k3s crictl rmi frontend-app:v1
  # list images
  sudo k3s crictl images
  sudo k3s ctr images ls
```
