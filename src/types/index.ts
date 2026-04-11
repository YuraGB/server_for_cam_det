import * as grpc from '@grpc/grpc-js'

type StreamTypes = "liveStream" | "detectionStream"

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

type WSData = {
  routeKind: "grpc" | "file";
  streamType?: StreamTypes;
  lastSeenAt: number;
};

type LeaveMessage = {
  action?: string;
  type?: string;
};


type VideoSocket = {
  readyState: number;
  send: (data: string | Uint8Array) => void;
  close: (code?: number, reason?: string) => void;
};

type ActiveVideoStream = {
  process: Bun.Subprocess<"ignore", "pipe", "pipe">;
  stopped: boolean;
};


export type { StreamTypes, FrameData, StreamState, ReconnectingState, ReconnectTimers, WSData, LeaveMessage, VideoSocket, ActiveVideoStream }