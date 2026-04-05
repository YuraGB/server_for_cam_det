import type { StreamTypes } from "../grpc";
type FrameData = {
  frameId?: number | string;
  timestamp?: number | { toNumber?: () => number };
  cameraId?: number | string;
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
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Date.now();
}

function normalizeImageBytes(image: FrameData["image"]): Buffer | null {
  if (!image) return null;
  if (Buffer.isBuffer(image)) return image;
  if (image instanceof Uint8Array) return Buffer.from(image);
  if (image instanceof ArrayBuffer) return Buffer.from(image);
  return null;
}

function broadcastFrame(frame: FrameData, streamType: StreamTypes): void {
  const streamClients = clients.get(streamType);
  if (!streamClients || streamClients.size === 0) return;

  const imageBytes = normalizeImageBytes(frame.image);
  if (!imageBytes) return;

  const meta = {
    frameId: frame.frameId,
    timestamp: normalizeTimestamp(frame.timestamp),
    cameraId: frame.cameraId,
    detections: frame.detections ?? [],
  };

  const metaBuf = Buffer.from(JSON.stringify(meta));
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(metaBuf.length);
  const packet = Buffer.concat([header, metaBuf, imageBytes]);
  const payload = new Uint8Array(packet);

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
