import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { puzzleSolved } from "./src/solver/line.js";
import { solve } from "./src/solver/solve.js";

const REPORT_MS = 10_000;
const SKIP = new Set(["manifest.json", "progress.json"]);

if (isMainThread) {
  await main();
} else {
  parentPort.on("message", async (file) => {
    if (file === null) {
      parentPort.close();
      return;
    }
    parentPort.postMessage(await solveFile(file));
  });
}

async function solveFile(file) {
  const id = path.basename(file, ".json");
  const { puzzle } = JSON.parse(await readFile(file, "utf8"));
  const began = performance.now();
  const { grid } = solve(puzzle);
  return { id, ms: performance.now() - began, solved: puzzleSolved(puzzle, grid) };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const puzzleDir = path.join(root, "data", "puzzles");
  const names = (await readdir(puzzleDir))
    .filter((name) => name.endsWith(".json") && !SKIP.has(name))
    .sort((a, b) => Number(path.basename(a, ".json")) - Number(path.basename(b, ".json")));

  const workerCount = Math.max(1, os.availableParallelism() - 4);
  const times = [];
  let solved = 0;
  let sum = 0;
  let slowest = null;
  let next = 0;
  let inflight = 0;
  let stop = false;

  console.log(`${workerCount} workers`);

  if (names.length === 0) {
    report("done");
    return;
  }

  const timer = setInterval(() => report("progress"), REPORT_MS);
  const workers = [];

  const finished = new Promise((resolve, reject) => {
    const send = (worker) => {
      if (stop || next >= names.length) {
        worker.postMessage(null);
        return;
      }
      inflight += 1;
      worker.postMessage(path.join(puzzleDir, names[next]));
      next += 1;
    };

    for (let i = 0; i < workerCount; i += 1) {
      const worker = new Worker(new URL(import.meta.url));
      workers.push(worker);
      worker.on("message", (result) => {
        inflight -= 1;
        times.push(result.ms);
        sum += result.ms;
        if (result.solved) solved += 1;
        if (slowest === null || result.ms > slowest.ms) slowest = { id: result.id, ms: result.ms };
        if (stop || next >= names.length) {
          if (inflight === 0) resolve();
          return;
        }
        send(worker);
      });
      worker.on("error", reject);
      send(worker);
    }
  });

  process.on("SIGINT", () => {
    stop = true;
    for (const worker of workers) worker.terminate();
    clearInterval(timer);
    report("stopped");
    process.exit(130);
  });

  try {
    await finished;
  } finally {
    clearInterval(timer);
    for (const worker of workers) worker.postMessage(null);
  }
  report("done");

  function quantile(sorted, p) {
    const index = (sorted.length - 1) * p;
    const low = Math.floor(index);
    const high = Math.ceil(index);
    if (low === high) return sorted[low];
    const weight = index - low;
    return sorted[low] * (1 - weight) + sorted[high] * weight;
  }

  function report(label) {
    const count = times.length;
    const percent = count === 0 ? 0 : (100 * solved) / count;
    let line = `${label}  ${count} / ${names.length}  solved ${solved} (${percent.toFixed(1)}%)`;
    if (count > 0) {
      const sorted = times.toSorted((a, b) => a - b);
      const avg = sum / count;
      line += `  time ms  avg ${avg.toFixed(1)}  p50 ${quantile(sorted, 0.50).toFixed(1)}  p75 ${quantile(sorted, 0.75).toFixed(1)}  p90 ${quantile(sorted, 0.9).toFixed(1)}  p99 ${quantile(sorted, 0.99).toFixed(1)}`;
      line += `  slowest ${slowest.id} (${slowest.ms.toFixed(1)})`;
    }
    console.log(line);
  }
}
