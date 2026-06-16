import { spawn } from "node:child_process";

const commands = [
  ["client", "npm", ["run", "dev:client"]],
  ["server", "npm", ["run", "dev:server"]]
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: "pipe",
    shell: process.platform === "win32"
  });

  child.stdout.on("data", (chunk) => writeChunk(name, chunk));
  child.stderr.on("data", (chunk) => writeChunk(name, chunk));
  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

let shuttingDown = false;

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function writeChunk(name, chunk) {
  const text = chunk.toString();
  text
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => console.log(`[${name}] ${line}`));
}

function shutdown(code) {
  shuttingDown = true;
  children.forEach((child) => child.kill());
  process.exit(code);
}
