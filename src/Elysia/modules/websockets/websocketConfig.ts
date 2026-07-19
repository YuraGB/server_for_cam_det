import {
  handleForward,
  handleRegister,
  isNonEmptyString,
  removeClientMapping,
  normalizeMessage,
  sendJson,
} from "@/Elysia/utils";
import { MAX_PEER_ID_LENGTH, MAX_SIGNALING_MESSAGE_BYTES } from "@/constants";
import type { RegisterMessage, SignalMessage, WSData } from "@/types";
import { disconnect } from "./wsLimits";

const websocketConfig = {
  open(ws: Bun.ServerWebSocket<WSData>) {
    ws.data.lastSeenAt = Date.now();
    sendJson(ws, { type: "connected", peerId: ws.data.peerId ?? null });
  },

  message(
    ws: Bun.ServerWebSocket<WSData>,
    message: string | Buffer | Uint8Array | ArrayBuffer,
  ) {
    ws.data.lastSeenAt = Date.now();

    const payload = normalizeMessage(message);
    if (!payload) {
      sendJson(ws, {
        type: "error",
        code: "INVALID_MESSAGE",
        message: "Message payload is not supported.",
      });
      return;
    }

    if (Buffer.byteLength(payload, "utf8") > MAX_SIGNALING_MESSAGE_BYTES) {
      sendJson(ws, {
        type: "error",
        code: "MESSAGE_TOO_LARGE",
        message: "Message exceeds allowed size.",
      });
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
      sendJson(ws, {
        type: "error",
        code: "INVALID_JSON",
        message: "Message must be valid JSON.",
      });
      return;
    }

    if (!data || typeof data !== "object") {
      sendJson(ws, {
        type: "error",
        code: "INVALID_SHAPE",
        message: "Message must be a JSON object.",
      });
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

    if (typedData.type === "register") {
      if (isNonEmptyString(typedData.peerId, MAX_PEER_ID_LENGTH)) {
        handleRegister(ws, typedData as RegisterMessage);
        return;
      }

      sendJson(ws, {
        type: "error",
        code: "INVALID_PEER_ID",
        message: "peerId is required.",
      });
      return;
    }

    handleForward(ws, typedData as SignalMessage);
  },

  close(ws: Bun.ServerWebSocket<WSData>) {
    removeClientMapping(ws);
    void disconnect(ws.data.ip);
  },
} as Bun.WebSocketHandler<WSData>;

export default websocketConfig;
