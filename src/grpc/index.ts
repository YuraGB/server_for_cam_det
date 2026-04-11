import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import fs from "fs"
import { broadcastFrame } from '../utils/broadcstFrame'
import { GRPC_SERVER_ADDRESS, PROTO_PATH, TIMEOUT_RECONNECT_MS } from '../constants'

export type StreamTypes = "liveStream" | "detectionStream"

interface FrameData {
  image?: Buffer
  image_base64?: string
  [key: string]: any
}

type StreamState = {
  [key in StreamTypes]: grpc.ClientReadableStream<FrameData> | null
}

type ReconnectingState = {
  [key in StreamTypes]: boolean
}

type ReconnectTimers = {
  [key in StreamTypes]: ReturnType<typeof setTimeout> | null
}

const streams: StreamState = {
  liveStream: null,
  detectionStream: null
}

// Track if we are already trying to reconnect a specific stream
const reconnecting: ReconnectingState = {
  liveStream: false,
  detectionStream: false
}

const reconnectTimers: ReconnectTimers = {
  liveStream: null,
  detectionStream: null
}

let grpcClient: any = null

function getGrpcClient(): any | null {
  if (grpcClient) return grpcClient

  if (!fs.existsSync(PROTO_PATH)) {
    console.warn(
      `[gRPC] detection proto not found at PROTO_PATH="${PROTO_PATH}". ` +
      `gRPC streams are disabled until the file is available.`
    )
    return null
  }

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    defaults: true,
  })
  const detectionProto = grpc.loadPackageDefinition(packageDefinition) as any
  const DetectionService = detectionProto.detection.DetectionService

  grpcClient = new DetectionService(
    GRPC_SERVER_ADDRESS,
    grpc.credentials.createInsecure(),
    {
      'grpc.max_receive_message_length': 100 * 1024 * 1024,
    }
  )

  return grpcClient
}

function clearReconnectTimer(streamType: StreamTypes): void {
  const timer = reconnectTimers[streamType]
  if (!timer) return
  clearTimeout(timer)
  reconnectTimers[streamType] = null
}

function scheduleReconnect(streamType: StreamTypes): void {
  clearReconnectTimer(streamType)
  reconnectTimers[streamType] = setTimeout(() => {
    reconnectTimers[streamType] = null
    startStream(streamType)
  }, TIMEOUT_RECONNECT_MS)
}

function startStream(streamType: StreamTypes) {
  const client = getGrpcClient()
  if (!client) return

  clearReconnectTimer(streamType)

  // Clear any existing stream
  if (streams[streamType]) {
    // Remove listeners before cancelling to prevent the "reconnect loop"
    streams[streamType]!.removeAllListeners()
    streams[streamType]!.cancel()
    streams[streamType] = null
  }

  reconnecting[streamType] = false

  const call = streamType === "liveStream" 
    ? client.StreamLiveFrames({}) 
    : client.StreamDetectionFrames({})

  streams[streamType] = call

  call.on('data', (frame: FrameData) => {
    broadcastFrame(frame, streamType)
  })

  const handleExit = (reason: string): void => {
    if (reconnecting[streamType]) return
    reconnecting[streamType] = true
    
    console.warn(`[gRPC] Stream ${streamType} exited (${reason}). Reconnecting...`)
    
    // Cleanup
    call.removeAllListeners()
    call.cancel()
    if (streams[streamType] === call) {
      streams[streamType] = null
    }

    scheduleReconnect(streamType)
  }

  call.on('end', () => handleExit('ended'))
  call.on('error', (err: grpc.ServiceError) => {
    // Ignore internal cancellation errors triggered by us
    if (err.code === grpc.status.CANCELLED) return
    handleExit(`error: ${err.message}`)
  })
}

function startGRPCStream() {
  startStream("liveStream")
  startStream("detectionStream")
}

function stopGRPCStream(): void {
  for (const streamType of ["liveStream", "detectionStream"] as const) {
    clearReconnectTimer(streamType)
    reconnecting[streamType] = false

    const stream = streams[streamType]
    if (!stream) continue

    stream.removeAllListeners()
    stream.cancel()
    streams[streamType] = null
  }
}

export { startGRPCStream, stopGRPCStream }
