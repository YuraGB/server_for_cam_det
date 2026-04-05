import path from 'path';
import { fileURLToPath } from "url";

const DEFAULT_SERVER_PORT = 3002;
const DEFAULT_GRPC_SERVER_ADDRESS = "localhost:50051";
const DEFAULT_TIMEOUT_RECONNECT_MS = 3_000;
const DEFAULT_MAX_FRAME_SIZE = 10 * 1024 * 1024;
const DEFAULT_LOG_LEVEL = "info";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const currentFilePath = fileURLToPath(import.meta.url);
const srcDir = path.dirname(path.dirname(currentFilePath));
const defaultProtoPath = path.resolve(srcDir, "..", "models", "detection.proto");

const PROTO_PATH = process.env.PROTO_PATH?.trim() || defaultProtoPath;
const SERVER_PORT = parsePositiveInt(process.env.PORT, DEFAULT_SERVER_PORT);
const GRPC_SERVER_ADDRESS = process.env.GRPC_SERVER_ADDRESS?.trim() || DEFAULT_GRPC_SERVER_ADDRESS;
const WS_ENDPOINT = "/ws";
const TIMEOUT_RECONNECT_MS = parsePositiveInt(process.env.TIMEOUT_RECONNECT_MS, DEFAULT_TIMEOUT_RECONNECT_MS);
const APP_NAME = "CameraCVServer";
const LOG_LEVEL = process.env.LOG_LEVEL?.trim() || DEFAULT_LOG_LEVEL;
const MAX_FRAME_SIZE = parsePositiveInt(process.env.MAX_FRAME_SIZE, DEFAULT_MAX_FRAME_SIZE);

export {
    PROTO_PATH,
    SERVER_PORT,
    GRPC_SERVER_ADDRESS,
    WS_ENDPOINT,
    TIMEOUT_RECONNECT_MS,
    APP_NAME,
    LOG_LEVEL,
    MAX_FRAME_SIZE
    }
