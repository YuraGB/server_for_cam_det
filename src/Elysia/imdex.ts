import Elysia from "elysia";
import type { Serve } from "bun";
import { HEALTH_ENDPOINT, MAX_SIGNALING_MESSAGE_BYTES, SERVER_PORT, WS_ENDPOINT } from "../constants";
import type { RegisterMessage, SignalMessage, WSData } from "../types";

export const clients = new Map<string, Bun.ServerWebSocket<WSData>>();

const MAX_PEER_ID_LENGTH = 128;
const RESERVED_MESSAGE_TYPES = new Set(["register", "ping", "pong"]);

const app = new Elysia({ name: "WebRTCSignalingServer" });
app.get("/", () => "OK");
app.get(HEALTH_ENDPOINT, () => ({
  status: "ok",
  peers: clients.size,
  uptimeSeconds: Math.floor(process.uptime()),
}));

const elysiaHandler = app.fetch;

function sendJson(ws: Bun.ServerWebSocket<WSData>, payload: unknown): boolean {
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function isNonEmptyString(value: unknown, maxLength = Number.MAX_SAFE_INTEGER): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function normalizeMessage(message: string | Buffer | Uint8Array | ArrayBuffer): string | null {
  if (typeof message === "string") return message;
  if (message instanceof Buffer) return message.toString("utf8");
  if (message instanceof Uint8Array) return Buffer.from(message).toString("utf8");
  if (message instanceof ArrayBuffer) return Buffer.from(message).toString("utf8");
  return null;
}

function removeClientMapping(ws: Bun.ServerWebSocket<WSData>): void {
  const peerId = ws.data.peerId;
  if (!peerId) return;

  if (clients.get(peerId) === ws) {
    clients.delete(peerId);
  }

  delete ws.data.peerId;
}

function handleRegister(ws: Bun.ServerWebSocket<WSData>, data: RegisterMessage): void {
  const peerId = data.peerId.trim();
  if (!isNonEmptyString(peerId, MAX_PEER_ID_LENGTH)) {
    sendJson(ws, { type: "error", code: "INVALID_PEER_ID", message: "peerId is required." });
    return;
  }

  removeClientMapping(ws);

  const existingClient = clients.get(peerId);
  if (existingClient && existingClient !== ws) {
    sendJson(existingClient, { type: "error", code: "PEER_REPLACED", message: "Peer re-registered from another connection." });
    existingClient.close(4001, "peer replaced");
  }

  ws.data.peerId = peerId;
  clients.set(peerId, ws);
  sendJson(ws, { type: "registered", peerId });
}

function handleForward(ws: Bun.ServerWebSocket<WSData>, data: SignalMessage): void {
  if (!ws.data.peerId) {
    sendJson(ws, { type: "error", code: "NOT_REGISTERED", message: "Register peerId before sending signaling messages." });
    return;
  }

  if (!isNonEmptyString(data.targetPeerId, MAX_PEER_ID_LENGTH)) {
    sendJson(ws, { type: "error", code: "INVALID_TARGET", message: "targetPeerId is required." });
    return;
  }

  if (!isNonEmptyString(data.type, MAX_PEER_ID_LENGTH) || RESERVED_MESSAGE_TYPES.has(data.type)) {
    sendJson(ws, { type: "error", code: "INVALID_TYPE", message: "Unsupported signaling message type." });
    return;
  }

  if (data.targetPeerId === ws.data.peerId) {
    sendJson(ws, { type: "error", code: "SELF_TARGET", message: "targetPeerId must be different from peerId." });
    return;
  }

  const target = clients.get(data.targetPeerId);
  if (!target || target.readyState !== 1) {
    sendJson(ws, { type: "error", code: "TARGET_NOT_FOUND", message: `Peer ${data.targetPeerId} is not connected.` });
    return;
  }

  const forwarded = sendJson(target, {
    ...data,
    peerId: ws.data.peerId,
  });

  if (!forwarded) {
    removeClientMapping(target);
    target.close(1011, "send failed");
    sendJson(ws, { type: "error", code: "TARGET_SEND_FAILED", message: `Failed to deliver message to ${data.targetPeerId}.` });
  }
}

export default {
  port: SERVER_PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === WS_ENDPOINT) {
      const success = server.upgrade(req, {
        data: {
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
      sendJson(ws, { type: "connected" });
    },

    message(ws: Bun.ServerWebSocket<WSData>, message: string | Buffer | Uint8Array | ArrayBuffer) {
      ws.data.lastSeenAt = Date.now();

      const payload = normalizeMessage(message);
      if (!payload) {
        sendJson(ws, { type: "error", code: "INVALID_MESSAGE", message: "Message payload is not supported." });
        return;
      }

      if (Buffer.byteLength(payload, "utf8") > MAX_SIGNALING_MESSAGE_BYTES) {
        sendJson(ws, { type: "error", code: "MESSAGE_TOO_LARGE", message: "Message exceeds allowed size." });
        ws.close(1009, "message too large");
        return;
      }

      if (payload === "ping" || payload === "pong") {
        return;
      }

      let data: unknown;
      try {
        data = JSON.parse(payload);
      } catch {
        sendJson(ws, { type: "error", code: "INVALID_JSON", message: "Message must be valid JSON." });
        return;
      }

      if (!data || typeof data !== "object") {
        sendJson(ws, { type: "error", code: "INVALID_SHAPE", message: "Message must be a JSON object." });
        return;
      }

      const typedData = data as {
        type?: unknown;
        peerId?: unknown;
        targetPeerId?: unknown;
        [key: string]: unknown;
      };
      if (typedData.type === "pong") {
        return;
      }

      if (typedData.type === "register" && isNonEmptyString(typedData.peerId, MAX_PEER_ID_LENGTH)) {
        handleRegister(ws, typedData as RegisterMessage);
        return;
      }

      handleForward(ws, typedData as SignalMessage);
    },

    close(ws: Bun.ServerWebSocket<WSData>) {
      removeClientMapping(ws);
    },
  } as Bun.WebSocketHandler<WSData>,
} satisfies Serve.Options<WSData>;
