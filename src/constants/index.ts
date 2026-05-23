import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_SERVER_PORT = 3002;
const DEFAULT_MAX_SIGNALING_MESSAGE_BYTES = 256 * 1024;
const DEFAULT_LOG_LEVEL = "info";
const DEFAULT_AUTH_JWT_ISSUER = "cam_frontend";
const DEFAULT_AUTH_JWT_AUDIENCE = "cam_serv";
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
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET?.trim() || "";
if (
  AUTH_JWT_SECRET.length < 32 ||
  AUTH_JWT_SECRET.includes("replace-with-shared-service-token-secret")
) {
  throw new Error(
    "AUTH_JWT_SECRET must be a strong secret (>=32 chars) and not a placeholder.",
  );
}
const AUTH_JWT_ISSUER =
  process.env.AUTH_JWT_ISSUER?.trim() || DEFAULT_AUTH_JWT_ISSUER;
const AUTH_JWT_AUDIENCE =
  process.env.AUTH_JWT_AUDIENCE?.trim() || DEFAULT_AUTH_JWT_AUDIENCE;
const MAX_SIGNALING_MESSAGE_BYTES = parsePositiveInt(
  process.env.MAX_SIGNALING_MESSAGE_BYTES,
  DEFAULT_MAX_SIGNALING_MESSAGE_BYTES,
);

const MAX_PEER_ID_LENGTH = 128;
const RESERVED_MESSAGE_TYPES = new Set(["register", "ping", "pong"]);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "https://site.com",
  "http://localhost:3000",
];
const ALLOWED_HTTP_METHODS = process.env.ALLOWED_HTTP_METHODS?.split(",").map(
  (method) => method.trim().toUpperCase(),
) || ["GET", "POST", "OPTIONS"];
export {
  APP_ROOT,
  SERVER_PORT,
  WS_ENDPOINT,
  HEALTH_ENDPOINT,
  APP_NAME,
  LOG_LEVEL,
  AUTH_JWT_SECRET,
  AUTH_JWT_ISSUER,
  AUTH_JWT_AUDIENCE,
  MAX_SIGNALING_MESSAGE_BYTES,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  MAX_PEER_ID_LENGTH,
  RESERVED_MESSAGE_TYPES,
  ALLOWED_ORIGINS,
  ALLOWED_HTTP_METHODS,
};
