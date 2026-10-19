import { toggled } from "../solver/cells.js";
import { RULES, activeRules, emptyGrid, finish, runToConvergence } from "../solver/solve.js";
import { cellAt, measure } from "./layout.js";
import { drawPuzzle } from "./view.js";

const MIN_SCALE = 0.05;
const MAX_SCALE = 6;

export function mountPlayer() {
  const board = document.querySelector("#board");
  const canvas = document.querySelector("#canvas");
  const ctx = canvas.getContext("2d");
  const statusEl = document.querySelector("#status");
  const ruleListEl = document.querySelector("#rule-list");
  const stepButton = document.querySelector("#step");
  const convergeButton = document.querySelector("#converge");

  const camera = { ox: 24, oy: 24, scale: 1, dpr: 1 };
  let puzzle = null;
  let grid = null;
  let item = null;
  let nextRuleId = RULES[0]?.id ?? null;
  let drag = null;

  for (const rule of RULES) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.dataset.rule = rule.id;
    input.addEventListener("change", () => {
      syncNext();
      delete statusEl.dataset.locked;
      renderRules();
    });
    label.append(input, document.createTextNode(rule.label));
    label.dataset.rule = rule.id;
    ruleListEl.append(label);
  }

  stepButton.addEventListener("click", step);
  convergeButton.addEventListener("click", converge);
  document.querySelector("#clear").addEventListener("click", clearGrid);

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);

  resize();
  renderRules();

  function setPuzzle(nextPuzzle, id) {
    puzzle = nextPuzzle;
    grid = emptyGrid(puzzle);
    item = { id, x: 0, y: 0, index: 0, ...measure(puzzle) };
    syncNext();
    delete statusEl.dataset.locked;
    renderRules();
    fit();
  }

  function ruleOptions() {
    const rules = {};
    for (const input of ruleListEl.querySelectorAll("input")) rules[input.dataset.rule] = input.checked;
    return { rules };
  }

  function enabled() {
    return activeRules(ruleOptions());
  }

  function syncNext() {
    const list = enabled();
    if (!list.length) {
      nextRuleId = null;
      return;
    }
    if (!list.some((rule) => rule.id === nextRuleId)) nextRuleId = list[0].id;
  }

  function renderRules() {
    for (const label of ruleListEl.querySelectorAll("label")) {
      label.classList.toggle("is-next", label.dataset.rule === nextRuleId);
    }
    const next = enabled().find((rule) => rule.id === nextRuleId);
    stepButton.disabled = !puzzle || !next;
    convergeButton.disabled = !puzzle || enabled().length === 0;
    if (!statusEl.dataset.locked) {
      statusEl.textContent = next ? `next: ${next.label}` : "no rules enabled";
    }
  }

  function note(text) {
    statusEl.dataset.locked = "1";
    statusEl.textContent = text;
  }

  function step() {
    const list = enabled();
    if (!puzzle || !list.length) return;
    let index = list.findIndex((rule) => rule.id === nextRuleId);
    if (index < 0) index = 0;
    const rule = list[index];
    const changed = finish(rule.apply({ puzzle, grid }));
    nextRuleId = list[(index + 1) % list.length].id;
    const following = list.find((entry) => entry.id === nextRuleId) ?? list[(index + 1) % list.length];
    note(changed ? `${rule.label} changed the grid. Next: ${following.label}` : `${rule.label} made no change. Next: ${following.label}`);
    renderRules();
    draw();
  }

  function converge() {
    if (!puzzle) return;
    const rules = enabled();
    if (!rules.length) return;
    const result = runToConvergence(puzzle, grid, rules);
    nextRuleId = rules[0].id;
    note(result.capped ? "stopped at the pass cap" : "converged");
    renderRules();
    draw();
  }

  function clearGrid() {
    if (!puzzle) return;
    grid = emptyGrid(puzzle);
    syncNext();
    delete statusEl.dataset.locked;
    renderRules();
    draw();
  }

  function resize() {
    camera.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(board.clientWidth * camera.dpr));
    canvas.height = Math.max(1, Math.floor(board.clientHeight * camera.dpr));
    draw();
  }

  function draw() {
    ctx.setTransform(camera.dpr, 0, 0, camera.dpr, 0, 0);
    ctx.clearRect(0, 0, board.clientWidth, board.clientHeight);
    ctx.fillStyle = "#eceae4";
    ctx.fillRect(0, 0, board.clientWidth, board.clientHeight);
    if (!item || !grid) return;
    ctx.translate(camera.ox, camera.oy);
    ctx.scale(camera.scale, camera.scale);
    drawPuzzle(ctx, item, puzzle, grid);
  }

  function fit() {
    if (!item) return;
    const pad = 24;
    const viewW = Math.max(1, board.clientWidth - pad * 2);
    const viewH = Math.max(1, board.clientHeight - pad * 2);
    camera.scale = clamp(Math.min(viewW / item.width, viewH / item.height), MIN_SCALE, MAX_SCALE);
    camera.ox = (board.clientWidth - item.width * camera.scale) / 2;
    camera.oy = (board.clientHeight - item.height * camera.scale) / 2;
    draw();
  }

  function eventWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    return {
      x: (sx - camera.ox) / camera.scale,
      y: (sy - camera.oy) / camera.scale,
    };
  }

  function onWheel(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const next = clamp(camera.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_SCALE, MAX_SCALE);
    const worldX = (sx - camera.ox) / camera.scale;
    const worldY = (sy - camera.oy) / camera.scale;
    camera.scale = next;
    camera.ox = sx - worldX * camera.scale;
    camera.oy = sy - worldY * camera.scale;
    draw();
  }

  function onPointerDown(event) {
    if (!item || (event.button !== 0 && event.button !== 1 && event.button !== 2)) return;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // A pointer id from outside the browser's input stream cannot be captured.
    }
    const world = eventWorld(event);
    const cell = cellAt(item, world.x, world.y);
    if ((event.button === 0 || event.button === 2) && cell) {
      const target = toggled(grid[cell.row][cell.column], event.button);
      drag = { type: "paint", target, last: `${cell.row},${cell.column}` };
      grid[cell.row][cell.column] = target;
      draw();
      return;
    }
    if (event.button === 2) return;
    drag = { type: "pan", sx: event.clientX, sy: event.clientY, ox: camera.ox, oy: camera.oy };
  }

  function onPointerMove(event) {
    if (!item) return;
    if (!drag) {
      const world = eventWorld(event);
      canvas.style.cursor = cellAt(item, world.x, world.y) ? "pointer" : "default";
      return;
    }
    if (drag.type === "pan") {
      camera.ox = drag.ox + (event.clientX - drag.sx);
      camera.oy = drag.oy + (event.clientY - drag.sy);
      draw();
      return;
    }
    const cell = cellAt(item, eventWorld(event).x, eventWorld(event).y);
    if (!cell) return;
    const key = `${cell.row},${cell.column}`;
    if (key === drag.last) return;
    drag.last = key;
    grid[cell.row][cell.column] = drag.target;
    draw();
  }

  function onPointerUp() {
    drag = null;
  }

  return { setPuzzle, note };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
