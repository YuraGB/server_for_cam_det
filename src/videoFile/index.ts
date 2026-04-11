import fs from "fs";
import { basename } from "path";
import { FFMPEG_PATH, TEST_VIDEO_FRAME_INTERVAL_MS, TEST_VIDEO_PATH } from "../constants";

type VideoSocket = {
  readyState: number;
  send: (data: string | Uint8Array) => void;
  close: (code?: number, reason?: string) => void;
};

type ActiveVideoStream = {
  process: Bun.Subprocess<"ignore", "pipe", "pipe">;
  stopped: boolean;
};

const JPEG_START_MARKER = 0xffd8;
const JPEG_END_MARKER = 0xffd9;
const activeStreams = new WeakMap<VideoSocket, ActiveVideoStream>();

function sendEvent(ws: VideoSocket, payload: unknown): boolean {
  if (ws.readyState !== 1) return false;

  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function buildFramePacket(meta: unknown, payloadBytes: Uint8Array): Uint8Array {
  const metaJson = JSON.stringify(meta);
  const metaBuf = Buffer.from(metaJson);
  const metaLen = metaBuf.byteLength;
  const packet = new Uint8Array(4 + metaLen + payloadBytes.byteLength);
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);

  view.setUint32(0, metaLen, false);
  packet.set(metaBuf, 4);
  packet.set(payloadBytes, 4 + metaLen);

  return packet;
}

function sendFrame(ws: VideoSocket, meta: unknown, payloadBytes: Uint8Array): boolean {
  if (ws.readyState !== 1) return false;

  try {
    ws.send(buildFramePacket(meta, payloadBytes));
    return true;
  } catch {
    return false;
  }
}

function findJpegEnd(buffer: Buffer, startIndex: number): number {
  for (let index = startIndex + 2; index < buffer.length; index += 1) {
    if (buffer.readUInt16BE(index - 1) === JPEG_END_MARKER) {
      return index + 1;
    }
  }

  return -1;
}

async function* readJpegFrames(stdout: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = stdout.getReader();
  let buffered = Buffer.alloc(0);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        return;
      }

      buffered = Buffer.concat([buffered, Buffer.from(value)]);

      while (true) {
        const startIndex = buffered.indexOf(Buffer.from([0xff, 0xd8]));
        if (startIndex === -1) {
          if (buffered.length > 1) {
            buffered = buffered.subarray(buffered.length - 1);
          }
          break;
        }

        const endIndex = findJpegEnd(buffered, startIndex);
        if (endIndex === -1) {
          buffered = buffered.subarray(startIndex);
          break;
        }

        yield buffered.subarray(startIndex, endIndex);
        buffered = buffered.subarray(endIndex);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function createVideoProcess(): Bun.Subprocess<"ignore", "pipe", "pipe"> {
  const targetFps = Math.max(1, Math.round(1000 / TEST_VIDEO_FRAME_INTERVAL_MS));

  return Bun.spawn({
    cmd: [
      FFMPEG_PATH,
      "-hide_banner",
      "-loglevel",
      "error",
      "-re",
      "-stream_loop",
      "-1",
      "-i",
      TEST_VIDEO_PATH,
      "-vf",
      `fps=${targetFps}`,
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ],
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function startVideoFileStream(ws: VideoSocket): Promise<void> {
  console.log("[fileFrames] websocket opened");

  if (!fs.existsSync(TEST_VIDEO_PATH)) {
    sendEvent(ws, {
      type: "ERROR",
      data: {
        message: `Video file not found at ${TEST_VIDEO_PATH}`,
      },
    });
    ws.close(1008, "test video not found");
    return;
  }

  if (!fs.existsSync(FFMPEG_PATH)) {
    sendEvent(ws, {
      type: "ERROR",
      data: {
        message: `ffmpeg not found at ${FFMPEG_PATH}`,
      },
    });
    ws.close(1008, "ffmpeg not found");
    return;
  }

  const process = createVideoProcess();
  console.log("[fileFrames] ffmpeg started", {
    ffmpegPath: FFMPEG_PATH,
    videoPath: TEST_VIDEO_PATH,
  });
  const activeStream: ActiveVideoStream = {
    process,
    stopped: false,
  };

  activeStreams.set(ws, activeStream);

  void (async () => {
    const stderrText = await new Response(process.stderr).text();
    if (stderrText.trim()) {
      console.error("[fileFrames] ffmpeg stderr", stderrText.trim());
    }
  })();

  let frameIndex = 0;

  try {
    for await (const jpegFrame of readJpegFrames(process.stdout)) {
      const currentStream = activeStreams.get(ws);
      if (currentStream !== activeStream || activeStream.stopped || ws.readyState !== 1) {
        break;
      }

      const frameMeta = {
        type: "FRAME",
        frameId: `file-frame-${frameIndex}`,
        timestamp: Date.now(),
        cameraId: basename(TEST_VIDEO_PATH),
        detections: [],
        mimeType: "image/jpeg",
      };

      if (frameIndex === 0) {
        console.log("[fileFrames] first jpeg frame ready", {
          bytes: jpegFrame.byteLength,
          cameraId: frameMeta.cameraId,
        });
      }

      if (!sendFrame(ws, frameMeta, jpegFrame)) {
        console.warn("[fileFrames] failed to send frame to websocket");
        break;
      }

      frameIndex += 1;
    }

    if (activeStreams.get(ws) === activeStream && ws.readyState === 1) {
      sendEvent(ws, {
        type: "STREAM_END",
        data: {
          source: basename(TEST_VIDEO_PATH),
          totalFrames: frameIndex,
        },
      });
    }
  } catch (error) {
    console.error("[fileFrames] stream failed", error);
    if (activeStreams.get(ws) === activeStream && ws.readyState === 1) {
      sendEvent(ws, {
        type: "ERROR",
        data: {
          message: error instanceof Error ? error.message : "Failed to stream video file",
        },
      });
      ws.close(1011, "file stream failed");
    }
  } finally {
    console.log("[fileFrames] stream finished", { framesSent: frameIndex });
    if (activeStreams.get(ws) === activeStream) {
      activeStreams.delete(ws);
    }

    activeStream.stopped = true;
    process.kill();
  }
}

function stopVideoFileStream(ws: VideoSocket): void {
  const activeStream = activeStreams.get(ws);
  if (!activeStream) return;

  activeStreams.delete(ws);
  activeStream.stopped = true;
  activeStream.process.kill();
}

export { startVideoFileStream, stopVideoFileStream };
