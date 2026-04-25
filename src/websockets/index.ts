import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS } from "../constants";
import { clients } from "../Elysia/utils";
import type { WSData } from "../types";

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

export { startHeartbeatMonitor };
