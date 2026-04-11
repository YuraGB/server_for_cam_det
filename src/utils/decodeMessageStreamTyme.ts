function isStreamType(value: string | null): value is StreamTypes {
  return value === "liveStream" || value === "detectionStream";
}

function decodeMessage(message: string | Buffer | Uint8Array | ArrayBuffer): string | null {
  if (typeof message === "string") return message;
  if (message instanceof Buffer) return message.toString("utf8");
  if (message instanceof Uint8Array) return Buffer.from(message).toString("utf8");
  if (message instanceof ArrayBuffer) return Buffer.from(message).toString("utf8");
  return null;
}

export { isStreamType, decodeMessage };