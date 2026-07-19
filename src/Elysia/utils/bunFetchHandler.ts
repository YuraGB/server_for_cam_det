import type { BunFetchHandler, ElysiaFetchHandler } from "@/types";
import { SERVICE_JWT_ISSUERS, WS_ENDPOINT } from "@/constants";
import {
  authenticateWebSocket,
  validationWebsoketConnection,
} from "../modules/websockets";
import { getIPFromRequest } from ".";
import { hasPermissionsHandler } from "./hasPermissions";
import { PERMISSIONS } from "@/constants/permissions";

const hasTokenPermission = (
  auth: NonNullable<Awaited<ReturnType<typeof authenticateWebSocket>>["auth"]>,
  permission: string,
) => auth.permissions.includes(permission);

const isServiceIssuer = (
  auth: NonNullable<Awaited<ReturnType<typeof authenticateWebSocket>>["auth"]>,
) =>
  typeof auth.claims.iss === "string" &&
  SERVICE_JWT_ISSUERS.includes(auth.claims.iss);

export default function createBunFetchHandler(
  fetchHandler: ElysiaFetchHandler,
): BunFetchHandler {
  return async (req, server) => {
    const url = new URL(req.url);

    if (url.pathname === WS_ENDPOINT) {
      const validationWsConnection = await validationWebsoketConnection(
        req,
        server,
      );
      if (validationWsConnection instanceof Response) {
        console.warn(
          "WebSocket connection rejected:",
          validationWsConnection.status,
          validationWsConnection.statusText,
        );
        return validationWsConnection;
      }

      const authResult = await authenticateWebSocket(req);
      if (!authResult.success) {
        return (
          authResult.error ?? new Response("Unauthorized", { status: 401 })
        );
      }

      if (!authResult.auth || !authResult.auth.userId) {
        return new Response("Authentication failed", { status: 401 });
      }

      const ip = getIPFromRequest(req, server) ?? "unknown";

      if (ip === "unknown") {
        return new Response("Unable to determine client IP", { status: 400 });
      }

      // Check permissions based on the type of issuer
      // Service tokens have specific permissions, while user tokens require a permission check
      if (isServiceIssuer(authResult.auth)) {
        if (
          !hasTokenPermission(authResult.auth, PERMISSIONS.SIGNALING_CONNECT)
        ) {
          return new Response("Insufficient permissions", { status: 403 });
        }
      } else {
        const hasPermissions = await hasPermissionsHandler(
          authResult.auth.userId,
          [PERMISSIONS.STREAM_READ],
        );
        if (!hasPermissions) {
          return new Response("Insufficient permissions", { status: 403 });
        }
      }

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
