import Elysia from "elysia";
import { addClient, clients, removeClient } from "../utils/broadcstFrame";
import type { Serve } from "bun";
import { SERVER_PORT, WS_ENDPOINT } from "../constants";
import type { StreamTypes } from "../grpc";

type WSData = {
  streamType: StreamTypes;
  lastSeenAt: number;
};

type LeaveMessage = {
  action?: string;
  type?: string;
};

const HEARTBEAT_INTERVAL_MS = 20_000;
const HEARTBEAT_TIMEOUT_MS = 40_000;

const app = new Elysia({ name: "CameraCVServer" });
app.get("/", () => "OK");
const elysiaHandler = app.fetch;

function isStreamType(value: string | null): value is StreamTypes {
  return value === "liveStream" || value === "detectionStream";
}

function decodeMessage(message: string | Buffer | Uint8Array | ArrayBuffer): string | null {
  if (typeof message === "string") return message;
  if (message instanceof Buffer) return message.toString("utf8");
  if (message instanceof Uint8Array) return Buffer.from(message).toString("utf8");
  if (message instanceof ArrayBuffer) return Buffer.from(message).toString("utf8");
  return null;
}

setInterval(() => {
  const now = Date.now();

  for (const [streamType, streamClients] of clients) {
    for (const ws of streamClients) {
      const socket = ws as Bun.ServerWebSocket<WSData>;
      const elapsed = now - socket.data.lastSeenAt;

      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        removeClient(streamType, socket);
        socket.close(1001, "heartbeat timeout");
        continue;
      }

      try {
        socket.send('{"type":"ping"}');
      } catch {
        removeClient(streamType, socket);
      }
    }
  }
}, HEARTBEAT_INTERVAL_MS);

export default {
  port: SERVER_PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === WS_ENDPOINT) {
      const streamType = url.searchParams.get("type");
      if (!isStreamType(streamType)) {
        return new Response("Invalid stream type. Use liveStream or detectionStream.", { status: 400 });
      }

      const success = server.upgrade(req, {
        data: {
          streamType,
          lastSeenAt: Date.now(),
        },
      });

      if (success) return;
      return new Response("WS upgrade failed", { status: 400 });
    }

    return elysiaHandler(req);
  },

  websocket: {
    open(ws: Bun.ServerWebSocket<WSData>) {
      ws.data.lastSeenAt = Date.now();
      addClient(ws.data.streamType, ws);
    },

    message(ws: Bun.ServerWebSocket<WSData>, message: string | Buffer | Uint8Array | ArrayBuffer) {
      ws.data.lastSeenAt = Date.now();

      const payload = decodeMessage(message);
      if (!payload || payload === "ping" || payload === "pong") return;

      let parsed: LeaveMessage | null = null;
      try {
        parsed = JSON.parse(payload) as LeaveMessage;
      } catch {
        return;
      }

      const action = parsed.action ?? parsed.type;
      if (action === "leaveStream") {
        // Immediate unsubscribe before close to remove disconnect lag.
        removeClient(ws.data.streamType, ws);
        ws.close(1000, "left stream");
      }
    },

    close(ws: Bun.ServerWebSocket<WSData>) {
      removeClient(ws.data.streamType, ws);
    },
  } as Bun.WebSocketHandler<WSData>,
} satisfies Serve.Options<WSData>;