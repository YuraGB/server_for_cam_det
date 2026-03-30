/**
 * This module sets up a WebSocket server using the Elysia framework. 
 * It allows clients to connect and receive real-time updates (frames) from the server.
 * The clients are stored in a Set, and the broadcastFrame function iterates over them to send data.
 * The WebSocket server listens for connections on the '/ws' endpoint, 
 * and handles open, message, and close events to manage client connections.
 */

import Elysia from "elysia"
import { addClient, removeClient } from "../utils/broadcstFrame"
import { WS_DETECTION_ENDPOINT, WS_ENDPOINT, WS_LIVE_ENDPOINT } from "../constants"

const app = new Elysia({name: 'CameraCVServer'})

// WS для live відео
app.ws(WS_LIVE_ENDPOINT, {
  open: (ws) => {
    console.log('[WS] Клієнт підключився до liveStream')
    addClient("liveStream", ws)
  },
  close: (ws) => {
    console.log('[WS] Клієнт відключився від liveStream')
    removeClient("liveStream", ws)
  }
})

// WS для детекцій YOLO
app.ws(WS_DETECTION_ENDPOINT, {
  open: (ws) => {
    console.log('[WS] Клієнт підключився до detectionStream')
    addClient("detectionStream", ws)
  },
  close: (ws) => {
    console.log('[WS] Клієнт відключився від detectionStream')
    removeClient("detectionStream", ws)
  }
})

export default app