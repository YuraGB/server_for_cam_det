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