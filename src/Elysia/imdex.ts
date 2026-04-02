import Elysia from "elysia";
import { addClient, removeClient } from "../utils/broadcstFrame";
import type { Serve } from "bun";
import { SERVER_PORT } from "../constants";

type WSData = { streamType: "liveStream" | "detectionStream" };

// --- 1. ELYSIA APP (тільки HTTP) ---
const app = new Elysia({ name: "CameraCVServer" });


app.get("/", () => "OK");

// Elysia can handle other HTTP routes if needed, but for now we will use it mainly for WebSocket upgrades and serving static files if necessary.
const elysiaHandler = app.fetch;

// --- 2. WS + gRPC INTEGRATION ---
// The WebSocket server will be handled by Bun's native WebSocket support, while Elysia will manage the HTTP routes and upgrades.
// This allows us to have a lightweight WebSocket server that can efficiently broadcast frames to clients, while still leveraging Elysia for any additional HTTP functionality we might want to add in the future.
export default {
  port: SERVER_PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    // 👉 WS endpoint
    if (url.pathname === "/ws") {
      const streamType = url.searchParams.get("type"); // liveStream | detectionStream

      const success = server.upgrade(req, {
          data  : { streamType: streamType as "liveStream" | "detectionStream" }
      });

      if (success) return;
      return new Response("WS upgrade failed", { status: 400 });
    }

    // 👉 всі інші запити → Elysia
    return elysiaHandler(req);
  },

  websocket: {
    open(ws: Bun.ServerWebSocket<WSData>) {
      const { streamType } = ws.data;
      console.log("[WS] open:", streamType);

      addClient(streamType, ws);
    },

    message(ws: Bun.ServerWebSocket<WSData>, message: string | Buffer) {
      // Handle incoming messages if needed
    },

    close(ws: Bun.ServerWebSocket<WSData>) {
      const { streamType } = ws.data;
      console.log("[WS] close:", streamType);

      removeClient(streamType, ws);
    },
  } as Bun.WebSocketHandler<WSData>,
} satisfies Serve.Options<WSData>;