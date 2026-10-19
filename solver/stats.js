import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { puzzleSolved } from "./src/solver/line.js";
import { solve } from "./src/solver/solve.js";

const REPORT_MS = 10_000;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puzzleDir = path.join(root, "data", "puzzles");

const names = (await readdir(puzzleDir))
  .filter((name) => name.endsWith(".json") && name !== "manifest.json")
  .sort((a, b) => Number(path.basename(a, ".json")) - Number(path.basename(b, ".json")));

const times = [];
let solved = 0;
let sum = 0;
let slowest = null;
let stop = false;
const started = performance.now();
let lastReport = started;

process.on("SIGINT", () => {
  stop = true;
});

for (const name of names) {
  if (stop) break;
  const file = path.join(puzzleDir, name);
  const id = path.basename(name, ".json");
  const { puzzle } = JSON.parse(await readFile(file, "utf8"));
  const began = performance.now();
  const { grid } = solve(puzzle);
  const elapsed = performance.now() - began;
  times.push(elapsed);
  sum += elapsed;
  if (slowest === null || elapsed > slowest.ms) slowest = { id, ms: elapsed };
  if (puzzleSolved(puzzle, grid)) solved += 1;
  if (performance.now() - lastReport >= REPORT_MS) {
    report("progress");
    lastReport = performance.now();
  }
}

report(stop ? "stopped" : "done");
if (stop) process.exit(130);

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
