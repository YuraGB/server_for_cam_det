import type { StreamTypes } from "../grpc";
type FrameData = {
  frame_id?: number | string;
  timestamp?: number | string | { toNumber?: () => number };
  camera_id?: number | string;
  detections?: unknown;
  image?: Buffer | Uint8Array | ArrayBuffer;
};

type WSLike = {
  readyState: number;
  bufferedAmount?: number;
  send: (data: string | Uint8Array) => void;
};

const MAX_WS_BUFFER_BYTES = 8 * 1024 * 1024;
const clients = new Map<StreamTypes, Set<WSLike>>();

function normalizeTimestamp(value: FrameData["timestamp"]): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Date.now();
}

function normalizeImageBytes(image: FrameData["image"]): Uint8Array | null {
  if (!image) return null;
  if (Buffer.isBuffer(image)) return image;
  if (image instanceof Uint8Array) return image;
  if (image instanceof ArrayBuffer) return new Uint8Array(image);
  return null;
}

function buildPacket(meta: unknown, imageBytes: Uint8Array): Uint8Array {
  const metaJson = JSON.stringify(meta);
  const metaBuf = Buffer.from(metaJson);
  const metaLen = metaBuf.byteLength;
  const totalLen = 4 + metaLen + imageBytes.byteLength;
  const packet = new Uint8Array(totalLen);
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);

  view.setUint32(0, metaLen, false);
  packet.set(metaBuf, 4);
  packet.set(imageBytes, 4 + metaLen);

  return packet;
}

function broadcastFrame(frame: FrameData, streamType: StreamTypes): void {
  const streamClients = clients.get(streamType);
  if (!streamClients || streamClients.size === 0) return;

  const imageBytes = normalizeImageBytes(frame.image);
  if (!imageBytes) return;

  const meta = {
    frameId: frame.frame_id ,
    timestamp: normalizeTimestamp(frame.timestamp),
    cameraId: frame.camera_id,
    detections: frame.detections ?? [],
  };

  const payload = buildPacket(meta, imageBytes);

  for (const ws of streamClients) {
    if (ws.readyState !== 1) {
      streamClients.delete(ws);
      continue;
    }

    if ((ws.bufferedAmount ?? 0) > MAX_WS_BUFFER_BYTES) {
      continue;
    }

    try {
      ws.send(payload);
    } catch {
      streamClients.delete(ws);
    }
  }
}

function addClient(streamType: StreamTypes, ws: WSLike): void {
  if (!clients.has(streamType)) clients.set(streamType, new Set());
  clients.get(streamType)!.add(ws);
}

function removeClient(streamType: StreamTypes, ws: WSLike): void {
  const streamClients = clients.get(streamType);
  if (!streamClients) return;

  streamClients.delete(ws);
  if (streamClients.size === 0) clients.delete(streamType);
}

export { broadcastFrame, clients, addClient, removeClient };
