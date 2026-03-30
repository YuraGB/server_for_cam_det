/**
 * This module manages WebSocket clients and provides a function to broadcast frames to all connected clients.
 * It is used by the gRPC stream to send detection frames to WebSocket clients in real-time.
 * The clients are stored in a Set, and the broadcastFrame function iterates over them to send data.
 */

import type { StreamTypes } from "../grpc";

// import type { InputSchema, MergeSchema, StandaloneInputSchema, UnwrapRoute } from "elysia";
// import type { ElysiaWS } from "elysia/ws";
// import type { ServerWebSocket } from "elysia/ws/bun";

// type WS = ElysiaWS<
//   ServerWebSocket<{}>,
//   MergeSchema<UnwrapRoute<StandaloneInputSchema<never>, {}>, {}>
// >;

const clients = new Map<StreamTypes, Set<WebSocket>>()

// Відправка кадру всім клієнтам
function broadcastFrame(frame: any, streamType: StreamTypes): void {
 let data = frame;

  try {
    // If frame wasn't serialized, we can convert it to string or handle it as needed
    if(typeof frame === 'object' && frame !== null) {
      data = JSON.stringify(frame)
    } 
    for (const ws of clients.get(streamType) || []) {
        if (ws.readyState === 1) {
          ws.send(data)
        }
    }
    
  } catch (err) {
    console.error('[WS] Помилка при відправці кадру:', err)
  }
}

function addClient(streamType: StreamTypes, ws: any) {
  if (!clients.has(streamType)) {
    clients.set(streamType, new Set())
  }
  clients.get(streamType)!.add(ws)
}


function removeClient(streamType: StreamTypes, ws: any) {
  clients.get(streamType)?.delete(ws)
}

export { broadcastFrame, clients, addClient, removeClient }