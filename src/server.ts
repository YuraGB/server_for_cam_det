import options from "./Elysia/imdex";
import { startGRPCStream, stopGRPCStream } from "./grpc";
import { APP_NAME } from "./constants";

const server = Bun.serve(options);
startGRPCStream();

console.log(`[${APP_NAME}] running on ${server.url}`);

function shutdown(signal: string): void {
  console.log(`[${APP_NAME}] received ${signal}, shutting down...`);
  stopGRPCStream();
  server.stop(true);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));