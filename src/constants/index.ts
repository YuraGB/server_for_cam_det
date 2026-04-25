import path from 'path';
import { fileURLToPath } from "url";

const DEFAULT_SERVER_PORT = 3002;
const DEFAULT_MAX_SIGNALING_MESSAGE_BYTES = 256 * 1024;
const DEFAULT_LOG_LEVEL = "info";
const HEARTBEAT_INTERVAL_MS = 20_000;
const HEARTBEAT_TIMEOUT_MS = 40_000;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const currentFilePath = fileURLToPath(import.meta.url);
const srcDir = path.dirname(path.dirname(currentFilePath));
const APP_ROOT = path.resolve(srcDir, "..");
const SERVER_PORT = parsePositiveInt(process.env.PORT, DEFAULT_SERVER_PORT);
const WS_ENDPOINT = "/ws";
const HEALTH_ENDPOINT = "/health";
const APP_NAME = "WebRTCSignalingServer";
const LOG_LEVEL = process.env.LOG_LEVEL?.trim() || DEFAULT_LOG_LEVEL;
const MAX_SIGNALING_MESSAGE_BYTES = parsePositiveInt(
  process.env.MAX_SIGNALING_MESSAGE_BYTES,
  DEFAULT_MAX_SIGNALING_MESSAGE_BYTES
);

const MAX_PEER_ID_LENGTH = 128;
const RESERVED_MESSAGE_TYPES = new Set(["register", "ping", "pong"]);

export {
    APP_ROOT,
    SERVER_PORT,
    WS_ENDPOINT,
    HEALTH_ENDPOINT,
    APP_NAME,
    LOG_LEVEL,
    MAX_SIGNALING_MESSAGE_BYTES,
    HEARTBEAT_INTERVAL_MS,
    HEARTBEAT_TIMEOUT_MS,
    MAX_PEER_ID_LENGTH,
    RESERVED_MESSAGE_TYPES,
}
