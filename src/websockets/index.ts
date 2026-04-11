setInterval(() => {
  const now = Date.now();

  for (const [streamType, streamClients] of clients) {
    for (const ws of streamClients) {
      const socket = ws as Bun.ServerWebSocket<WSData>;
      const elapsed = now - socket.data.lastSeenAt;

      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        removeClient(streamType, socket);
        socket.close(1001, "heartbeat timeout");
        continue;
      }

      try {
        socket.send('{"type":"ping"}');
      } catch {
        removeClient(streamType, socket);
      }
    }
  }
}, HEARTBEAT_INTERVAL_MS);