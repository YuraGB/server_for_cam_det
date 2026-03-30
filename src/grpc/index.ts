import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { broadcastFrame } from '../utils/broadcstFrame'
import {GRPC_SERVER_ADDRESS, PROTO_PATH, TIMEOUT_RECONNECT_MS} from '../constants'

// ------------------------------
// Налаштування gRPC
// ------------------------------

export type StreamTypes = "liveStream" | "detectionStream"

const streams:Record<StreamTypes, grpc.ClientReadableStream<any> | null> = {
  liveStream: null,
  detectionStream: null
}

// Завантаження proto
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const proto = grpc.loadPackageDefinition(packageDef) as any
const DetectionService = proto.detection.DetectionService

// ------------------------------
// gRPC клієнт
// ------------------------------
const grpcClient = new DetectionService(
  GRPC_SERVER_ADDRESS,
  grpc.credentials.createInsecure()
)

// Підписка на стрім з C++ сервера
function startGRPCStream(): void {
  startStream("liveStream")
  startStream("detectionStream")
}

function startStream(streamType: StreamTypes) {
  // Закриваємо старий стрім
  if (streams[streamType]) {
    console.log(`[gRPC] Закриваємо старий стрім ${streamType}`)
    streams[streamType]?.cancel()
    streams[streamType] = null
  }

  // Створюємо новий стрім
  let call: grpc.ClientReadableStream<any>
  if (streamType === "liveStream") {
    call = grpcClient.StreamLiveFrames({})
  } else {
    call = grpcClient.StreamDetectionFrames({})
  }

  streams[streamType] = call

  call.on('data', (frame: any) => {
    try {
      if (frame.image) {
        frame.image_base64 = Buffer.from(frame.image).toString('base64')
        delete frame.image
      }
      broadcastFrame(frame, streamType)
    } catch (err) {
      console.error(`[gRPC] Помилка обробки кадру (${streamType}):`, err)
    }
  })

  call.on('end', () => scheduleReconnect(streamType))
  call.on('error', (err) => {
    console.error(`[gRPC] Помилка стріму ${streamType}:`, err.message)
    scheduleReconnect(streamType)
  })
}

function scheduleReconnect(streamType: StreamTypes) {
  console.log(`[gRPC] Стрім ${streamType} завершено, перепідключення через ${TIMEOUT_RECONNECT_MS}ms...`)
  setTimeout(() => startStream(streamType), TIMEOUT_RECONNECT_MS)
}

export { startGRPCStream }