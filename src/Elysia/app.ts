import Elysia from "elysia";
import { routes } from "./modules/Routes";

/**
 * Main Elysia application instance that serves both HTTP routes and WebSocket connections for the WebRTC signaling server.
 * The fetch handler is customized to upgrade HTTP requests to WebSocket connections when the WS_ENDPOINT is hit,
 * while still allowing Elysia to handle regular HTTP routes defined in the Routes module.
 */
const app = new Elysia({ name: "main" }).use(routes);
const elysiaHandler = app.fetch;

export { elysiaHandler };
