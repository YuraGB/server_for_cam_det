import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} from "../../../constants";
import { clients, getIPFromRequest, isTrustedOrigin } from "../../utils";
import type { AuthContext, WSData } from "../../../types";
import { authenticateRequest } from "../Authentication";
import { canConnect } from "./wsLimits";

function startHeartbeatMonitor(): () => void {
  const timer = setInterval(() => {
    const now = Date.now();

    for (const [peerId, ws] of clients) {
      const socket = ws as Bun.ServerWebSocket<WSData>;
      const elapsed = now - (socket.data.lastSeenAt ?? 0);

      if (socket.readyState !== 1) {
        if (clients.get(peerId) === socket) {
          clients.delete(peerId);
        }
        continue;
      }

      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        if (clients.get(peerId) === socket) {
          clients.delete(peerId);
        }
        socket.close(1001, "heartbeat timeout");
        continue;
      }

      try {
        socket.send('{"type":"ping"}');
      } catch {
        if (clients.get(peerId) === socket) {
          clients.delete(peerId);
        }
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(timer);
}

async function validationWebsoketConnection(
  request: Request,
  server: Bun.Server<unknown>,
): Promise<Response | boolean> {
  // Validate the Origin header to prevent unauthorized cross-origin WebSocket connections
  const isValidOrigin = isTrustedOrigin(request);
  if (!isValidOrigin) {
    return new Response("Forbidden", { status: 403 });
  }

  const ip = getIPFromRequest(request, server) ?? "unknown";
  const isAllowed = await canConnect(ip);

  if (!isAllowed) {
    return new Response("Too Many Requests", { status: 429 });
  }

  return isAllowed;
}

async function authenticateWebSocket(
  request: Request,
): Promise<{ success: boolean; auth?: AuthContext; error?: Response }> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.ok) {
      return {
        success: false,
        error: new Response("Unauthorized", { status: 401 }),
      };
    }
    return { success: true, auth: authResult.auth };
  } catch {
    return {
      success: false,
      error: new Response("Internal Server Error", { status: 500 }),
    };
  }
}

export {
  startHeartbeatMonitor,
  validationWebsoketConnection,
  authenticateWebSocket,
};
