import options from "./Elysia";
import { APP_NAME } from "./constants";
import { startHeartbeatMonitor } from "./Elysia/modules/websockets";
import db from "./db/drizzle";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

// Run database migrations before starting the server
await migrate(db, { migrationsFolder: "./drizzle" });

const server = Bun.serve(options);
const stopHeartbeatMonitor = startHeartbeatMonitor();

console.log(`[${APP_NAME}] running on ${server.url}`);

function shutdown(signal: string): void {
  console.log(`[${APP_NAME}] received ${signal}, shutting down...`);
  stopHeartbeatMonitor();
  server.stop(true);
  process.exit(0)
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
