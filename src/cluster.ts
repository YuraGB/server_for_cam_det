import { spawn } from "bun";
import os from "os";

// set limit to 3 or number of CPU cores, whichever is lower, to avoid overwhelming the system
const cpuCount = Math.max(1, Math.min(os.cpus()?.length ?? 1, 3));
const buns: Array<ReturnType<typeof spawn>> = [];

export function startCluster() {
  if (buns.length > 0) return;

  for (let i = 0; i < cpuCount; i++) {
    buns.push(
      spawn({
        cmd: ["bun", "./src/server.ts"],
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      })
    );
  }
}

export function killCluster() {
  for (const bun of buns) {
    try {
      bun?.kill?.();
    } catch (_e) {
      // ignore
    }
  }
  buns.length = 0;
}

if (import.meta.main) {
  startCluster();

  if (typeof process !== "undefined" && process && typeof process.on === "function") {
    process.on("SIGINT", killCluster);
    process.on("exit", killCluster);
  }
}
