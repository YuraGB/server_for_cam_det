/**
 * "app" can be changed to Fastly (example) 
 * if we want to switch to nodejs against bunjs,
 *  but for now we will use Elysia 
**/
import options from "./Elysia/imdex" 
import { startGRPCStream } from "./grpc"

// ------------------------------
// Start the WebSocket server and then start the gRPC stream
// ------------------------------
// The WebSocket server listens for client connections and manages them,
// while the gRPC stream continuously receives frames and broadcasts them to connected clients.
// ------------------------------
// app.listen(SERVER_PORT, () => {
//   console.log(`[WS] Сервер запущено на порту ${SERVER_PORT}`)

Bun.serve(options)
  
  // ------------------------------
  // Start the gRPC stream after the WebSocket server is up and running
  // ------------------------------
  // This ensures that we can immediately broadcast frames to any clients that connect right after the server starts.
  // ------------------------------
 startGRPCStream()