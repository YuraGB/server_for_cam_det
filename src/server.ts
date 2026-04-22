import options from "./Elysia";
import { APP_NAME } from "./constants";
import { startHeartbeatMonitor } from "./websockets";

const server = Bun.serve(options);
const stopHeartbeatMonitor = startHeartbeatMonitor();

console.log(`[${APP_NAME}] running on ${server.url}`);

function shutdown(signal: string): void {
  console.log(`[${APP_NAME}] received ${signal}, shutting down...`);
  stopHeartbeatMonitor();
  server.stop(true);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
