import { MAX_PEER_ID_LENGTH, RESERVED_MESSAGE_TYPES } from "../../constants";
import type { RegisterMessage, SignalMessage, WSData } from "../../types";

export const clients = new Map<string, Bun.ServerWebSocket<WSData>>();

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

export {
  sendJson,
  isNonEmptyString,
    normalizeMessage,
    removeClientMapping,
    handleRegister,
    handleForward,
}