import { UNKNOWN, toggled } from "../solver/cells.js";
import { RULES, solve } from "../solver/solve.js";
import { CELL, LABEL, cellAt, hitTest, layoutPuzzles } from "./layout.js";
import { drawBoard } from "./view.js";

const MIN_SCALE = 0.00005;
const MAX_SCALE = 6;
const DETAIL_CELL = 8;

const board = document.querySelector("#board");
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const zoomLabel = document.querySelector("#zoom-label");
const rulesEl = document.querySelector("#rules");

const camera = { ox: 24, oy: 24, scale: 1, dpr: 1 };
const lodCache = new Map();
let entries = [];
let grids = [];
let layout = { items: [], contentWidth: 0, contentHeight: 0 };
let drag = null;
let solving = false;
let solveAgain = false;

for (const rule of RULES) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.dataset.rule = rule.id;
  input.addEventListener("change", () => runSolver());
  label.append(input, document.createTextNode(rule.label));
  rulesEl.append(label);
}

document.querySelector("#fit").addEventListener("click", () => fitAll());
document.querySelector("#zoom-in").addEventListener("click", () => zoomAt(board.clientWidth / 2, board.clientHeight / 2, 1.2));
document.querySelector("#zoom-out").addEventListener("click", () => zoomAt(board.clientWidth / 2, board.clientHeight / 2, 1 / 1.2));
document.querySelector("#solve").addEventListener("click", () => runSolver());

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("keydown", onKey);
window.addEventListener("resize", resize);

resize();
loadPuzzles();

function ruleOptions() {
  const rules = {};
  for (const input of rulesEl.querySelectorAll("input")) rules[input.dataset.rule] = input.checked;
  return { rules };
}

function runSolver() {
  if (!entries.length) return;
  if (solving) {
    solveAgain = true;
    return;
  }
  solving = true;
  solveAgain = false;
  const options = ruleOptions();
  const next = new Array(entries.length);
  let index = 0;
  const step = () => {
    const end = Math.min(entries.length, index + 200);
    for (; index < end; index += 1) next[index] = solve(entries[index].puzzle, options).grid;
    if (index < entries.length) {
      statusEl.textContent = `solving ${index} / ${entries.length}`;
      requestAnimationFrame(step);
      return;
    }
    grids = next;
    lodCache.clear();
    solving = false;
    statusEl.textContent = `${entries.length} puzzles`;
    draw();
    if (solveAgain) runSolver();
  };
  statusEl.textContent = "solving…";
  requestAnimationFrame(step);
}

async function loadPuzzles() {
  const url = new URL("../data/puzzles.json", window.location.href);
  statusEl.textContent = "loading puzzles…";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("puzzles.json is not an array");
    entries = data;
    layout = layoutPuzzles(entries);
    grids = entries.map((entry) => entry.puzzle.rows.map(() => entry.puzzle.cols.map(() => UNKNOWN)));
    fitAll();
    runSolver();
  } catch (error) {
    statusEl.textContent = `could not load ${url.pathname}: ${error.message}`;
  }
}

function resize() {
  camera.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(board.clientWidth * camera.dpr));
  canvas.height = Math.max(1, Math.floor(board.clientHeight * camera.dpr));
  draw();
}

function draw() {
  drawBoard(ctx, {
    items: layout.items,
    entries,
    grids,
    width: board.clientWidth,
    height: board.clientHeight,
    camera,
    lodCache,
  });
  zoomLabel.textContent = `${Math.round(camera.scale * 100)}%`;
}

function detailed() {
  return camera.scale * CELL >= DETAIL_CELL;
}

function eventWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;
  return {
    sx,
    sy,
    x: (sx - camera.ox) / camera.scale,
    y: (sy - camera.oy) / camera.scale,
  };
}

function zoomAt(sx, sy, factor) {
  const next = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
  const worldX = (sx - camera.ox) / camera.scale;
  const worldY = (sy - camera.oy) / camera.scale;
  camera.scale = next;
  camera.ox = sx - worldX * camera.scale;
  camera.oy = sy - worldY * camera.scale;
  draw();
}

function fitBox(box) {
  const pad = 24;
  const viewW = Math.max(1, board.clientWidth - pad * 2);
  const viewH = Math.max(1, board.clientHeight - pad * 2);
  if (box.width <= 0 || box.height <= 0) return;
  camera.scale = clamp(Math.min(viewW / box.width, viewH / box.height), MIN_SCALE, MAX_SCALE);
  camera.ox = (board.clientWidth - box.width * camera.scale) / 2 - box.x * camera.scale;
  camera.oy = (board.clientHeight - box.height * camera.scale) / 2 - box.y * camera.scale;
  draw();
}

function fitAll() {
  fitBox({ x: 0, y: 0, width: layout.contentWidth || 1, height: layout.contentHeight || 1 });
}

function frame(item) {
  const viewW = Math.max(1, board.clientWidth - 48);
  const viewH = Math.max(1, board.clientHeight - 48);
  const fitScale = Math.min(viewW / item.width, viewH / item.height);
  camera.scale = clamp(Math.max(fitScale, DETAIL_CELL / CELL), MIN_SCALE, MAX_SCALE);
  camera.ox = (board.clientWidth - item.width * camera.scale) / 2 - item.x * camera.scale;
  camera.oy = (board.clientHeight - item.height * camera.scale) / 2 - item.y * camera.scale;
  draw();
}

function onWheel(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
}

function onKey(event) {
  if (event.key === "+" || event.key === "=") zoomAt(board.clientWidth / 2, board.clientHeight / 2, 1.2);
  if (event.key === "-" || event.key === "_") zoomAt(board.clientWidth / 2, board.clientHeight / 2, 1 / 1.2);
  if (event.key === "0") fitAll();
}

function onPointerDown(event) {
  if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // A pointer id from outside the browser's input stream cannot be captured.
  }
  const world = eventWorld(event);
  const item = hitTest(layout.items, world.x, world.y);
  const cell = item && detailed() ? cellAt(item, world.x, world.y) : null;
  if ((event.button === 0 && cell) || (event.button === 2 && cell)) {
    const target = toggled(grids[item.index][cell.row][cell.column], event.button);
    drag = { type: "paint", item, target, last: `${cell.row},${cell.column}` };
    setCell(item.index, cell, target);
    return;
  }
  if (event.button === 0 && item && detailed() && onTitle(item, world)) {
    drag = {
      type: "pan",
      sx: event.clientX,
      sy: event.clientY,
      ox: camera.ox,
      oy: camera.oy,
      moved: false,
      titleId: item.id,
    };
    return;
  }
  if (event.button === 2) return;
  drag = {
    type: "pan",
    sx: event.clientX,
    sy: event.clientY,
    ox: camera.ox,
    oy: camera.oy,
    moved: false,
    lod: event.button === 0 && item && !detailed() ? item : null,
  };
}

function onPointerMove(event) {
  if (!drag) {
    const world = eventWorld(event);
    const item = hitTest(layout.items, world.x, world.y);
    const cell = item && detailed() ? cellAt(item, world.x, world.y) : null;
    canvas.style.cursor = cell ? "pointer" : "default";
    return;
  }
  if (drag.type === "pan") {
    const dx = event.clientX - drag.sx;
    const dy = event.clientY - drag.sy;
    if (dx * dx + dy * dy > 16) drag.moved = true;
    camera.ox = drag.ox + dx;
    camera.oy = drag.oy + dy;
    draw();
    return;
  }
  const world = eventWorld(event);
  const cell = cellAt(drag.item, world.x, world.y);
  if (!cell) return;
  const key = `${cell.row},${cell.column}`;
  if (key === drag.last) return;
  drag.last = key;
  setCell(drag.item.index, cell, drag.target);
}

function onTitle(item, world) {
  return world.x >= item.x && world.x < item.x + item.width && world.y >= item.y && world.y < item.y + LABEL;
}

function onPointerUp() {
  if (drag && drag.type === "pan" && !drag.moved && drag.titleId) {
    window.location.href = `puzzle.html?id=${encodeURIComponent(drag.titleId)}`;
  } else if (drag && drag.type === "pan" && drag.lod && !drag.moved) {
    frame(drag.lod);
  }
  drag = null;
}

function setCell(index, cell, value) {
  grids[index][cell.row][cell.column] = value;
  lodCache.delete(index);
  draw();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
