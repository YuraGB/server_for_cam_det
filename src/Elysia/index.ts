import type { Serve } from "bun";
import { SERVER_PORT } from "../constants";
import type { WSData } from "../types";
import websocketConfig from "./modules/websockets/websocketConfig";
import createBunFetchHandler from "./utils/bunFetchHandler";
import { elysiaHandler } from "./app";

/**
 * Custom fetch handler for Bun that integrates with the Elysia application.
 * It checks if the incoming request is targeting the WebSocket endpoint (WS_ENDPOINT)
 * and performs necessary validation and authentication before upgrading to a WebSocket connection.
 * For all other HTTP requests, it delegates handling to the Elysia application.
 */
const bunFetchHandler = createBunFetchHandler(elysiaHandler) as (
  this: Bun.Server<WSData>,
  req: Request,
  server: Bun.Server<WSData>,
) => Bun.MaybePromise<Response | void | undefined>;

/**
 * Serve options for Bun.
 * The fetch function is overridden to handle WebSocket upgrade requests at the WS_ENDPOINT,
 * while delegating other HTTP requests to the Elysia handler. It also includes origin validation and authentication for WebSocket connections.
 * The websocketConfig object defines the handlers for WebSocket events such as connection open and message reception.
 */
export default {
  port: SERVER_PORT,

  // Handle HTTP requests and upgrade to WebSocket when the WS_ENDPOINT is hit
  fetch: bunFetchHandler,

  // WebSocket handlers are managed separately in ./modules/websockets/websocketConfig.ts
  websocket: websocketConfig,
} satisfies Serve.Options<WSData>;
