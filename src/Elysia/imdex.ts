import Elysia from "elysia";
import { addClient, clients, removeClient } from "../utils/broadcstFrame";
import type { Serve } from "bun";
import { FILE_WS_ENDPOINT, HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS, SERVER_PORT, WS_ENDPOINT } from "../constants";

import { startVideoFileStream, stopVideoFileStream } from "../videoFile";
import { isStreamType } from "../utils/decodeMessageStreamTyme";
import type { StreamTypes, WSData } from "../types";




const app = new Elysia({ name: "CameraCVServer" });
app.get("/", () => "OK");
const elysiaHandler = app.fetch;



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
      const streamType = url.searchParams.get("type") 
            if (!isStreamType(streamType)) {
        return new Response("Invalid stream type. Use liveStream or detectionStream.", { status: 400 });
      }

      const success = server.upgrade(req, {
        data: {
          routeKind: "grpc",
          streamType: streamType as StreamTypes,
          lastSeenAt: Date.now(),
        },
      });

      if (success) return;
      return new Response("WS upgrade failed", { status: 400 });
    }

    if (url.pathname === FILE_WS_ENDPOINT) {
      const success = server.upgrade(req, {
        data: {
          routeKind: "file",
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

      if (ws.data.routeKind === "grpc" && ws.data.streamType) {
        addClient(ws.data.streamType, ws);
        return;
      }

      void startVideoFileStream(ws);
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
        if (ws.data.routeKind === "grpc" && ws.data.streamType) {
          removeClient(ws.data.streamType, ws);
        } else {
          stopVideoFileStream(ws);
        }
        ws.close(1000, "left stream");
      }
    },

    close(ws: Bun.ServerWebSocket<WSData>) {
      if (ws.data.routeKind === "grpc" && ws.data.streamType) {
        removeClient(ws.data.streamType, ws);
        return;
      }

      stopVideoFileStream(ws);
    },
  } as Bun.WebSocketHandler<WSData>,
} satisfies Serve.Options<WSData>;
