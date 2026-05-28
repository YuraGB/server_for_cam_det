import type { BunFetchHandler, ElysiaFetchHandler } from "@/types";
import { WS_ENDPOINT } from "@/constants";
import {
  authenticateWebSocket,
  validationWebsoketConnection,
} from "../modules/websockets";
import { getIPFromRequest } from ".";

export default function createBunFetchHandler(
  fetchHandler: ElysiaFetchHandler,
): BunFetchHandler {
  return async (req, server) => {
    const url = new URL(req.url);

    if (url.pathname === WS_ENDPOINT) {
      const validationWsConnection: Response | boolean =
        await validationWebsoketConnection(req, server);
      if (validationWsConnection instanceof Response) {
        console.warn(
          "WebSocket connection rejected:",
          validationWsConnection.status,
          validationWsConnection.statusText,
        );
        return validationWsConnection;
      }

      /**
       * Authenticate the WebSocket connection using the same JWT-based authentication as HTTP requests.
       * The authenticateWebSocket function will extract the token, verify it, and return the authenticated user info if successful.
       * This ensures that only authenticated users can establish WebSocket connections to the signaling server.
       */
      const authResult = await authenticateWebSocket(req);

      if (!authResult.success) {
        return (
          authResult.error ?? new Response("Unauthorized", { status: 401 })
        );
      }

      if (!authResult.auth) {
        return new Response("Authentication failed", { status: 401 });
      }

      const ip = getIPFromRequest(req, server) ?? "unknown";

      if (ip === "unknown") {
        return new Response("Unable to determine client IP", { status: 400 });
      }

      // Upgrade to WebSocket and pass the authenticated user info in the connection data
      const success = server.upgrade(req, {
        data: {
          ip,
          lastSeenAt: Date.now(),
          auth: authResult.auth,
        },
      });

      if (success) return;
      return new Response("WS upgrade failed", { status: 400 });
    }

    return fetchHandler(req);
  };
}
