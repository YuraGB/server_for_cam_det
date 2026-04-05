
import path from 'path';

 const PROTO_PATH = path.resolve('E:\\Progects\\test\\camera_cv_service\\models\\detection.proto')
 const SERVER_PORT = 3002
 const GRPC_SERVER_ADDRESS = 'localhost:50051'
 const WS_ENDPOINT = '/ws'
 const WS_LIVE_ENDPOINT = `${WS_ENDPOINT}/live`
 const WS_DETECTION_ENDPOINT = `${WS_ENDPOINT}/detection`
 const TIMEOUT_RECONNECT_MS = 3000
 const APP_NAME = 'CameraCVServer'
 const LOG_LEVEL = 'info'
 const MAX_FRAME_SIZE = 10 * 1024 * 1024 // 10 MB

export {
    PROTO_PATH,
    SERVER_PORT,
    GRPC_SERVER_ADDRESS,
    WS_ENDPOINT,
    WS_LIVE_ENDPOINT,
    WS_DETECTION_ENDPOINT,
    TIMEOUT_RECONNECT_MS,
    APP_NAME,
    LOG_LEVEL,
    MAX_FRAME_SIZE
    }
