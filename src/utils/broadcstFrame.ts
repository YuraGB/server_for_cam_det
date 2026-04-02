/**
 * This module manages WebSocket clients and provides a function to broadcast frames to all connected clients.
 * It is used by the gRPC stream to send detection frames to WebSocket clients in real-time.
 * The clients are stored in a Set, and the broadcastFrame function iterates over them to send data.
 */

import type { StreamTypes } from "../grpc";

import type { MergeSchema, StandaloneInputSchema, UnwrapRoute } from "elysia";
import type { ElysiaWS } from "elysia/ws";
import type { ServerWebSocket } from "elysia/ws/bun";

type WS = ElysiaWS<
  ServerWebSocket<{}>,
  MergeSchema<UnwrapRoute<StandaloneInputSchema<never>, {}>, {}>
>;


const clients = new Map<StreamTypes, Set<WS>>()

// Send frame data to all clients connected to the specified stream type
function broadcastFrame(frame: any, streamType: StreamTypes): void {
  try {  
    for (const ws of clients.get(streamType) || []) {
        if (ws.readyState === 1) {

          // Optimize by sending metadata and image as a single binary packet
          const meta = {
            frameId: frame.frameId,
            timestamp: frame.timestamp.toNumber(),
            cameraId: frame.cameraId,
            detections: frame.detections,
          };

          const metaBuf = Buffer.from(JSON.stringify(meta));

          const header = Buffer.alloc(4);
          header.writeUInt32BE(metaBuf.length);

          const packet = Buffer.concat([
            header,
            metaBuf,
            frame.image 
          ]);

          ws.send(new Uint8Array(packet)); // Convert Buffer to Uint8Array for WebSocket        
        }
    }
    
  } catch (err) {
    console.error('[WS] Error during frame sending:', err)
  }
}

// Add a new WebSocket client to the appropriate stream type set
function addClient(streamType: StreamTypes, ws: any) {
  if (!clients.has(streamType)) {
    clients.set(streamType, new Set())
  }
  clients.get(streamType)!.add(ws)
}

// Remove a WebSocket client from the appropriate stream type set
function removeClient(streamType: StreamTypes, ws: any) {
  clients.get(streamType)?.delete(ws)
}

export { broadcastFrame, clients, addClient, removeClient }