import { spawn } from "bun";

// set limit to 3 or number of CPU cores, whichever is lower, to avoid overwhelming the system
const cpus = Math.max(1, Math.min(navigator.hardwareConcurrency ?? 1, 3));
const buns = new Array(cpus);

for (let i = 0; i < cpus; i++) {
  buns[i] = spawn({
    cmd: ["bun", "./src/server.ts"],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
}

function kill() {
  for (const bun of buns) {
    bun.kill();
  }
}

process.on("SIGINT", kill);
process.on("exit", kill);
