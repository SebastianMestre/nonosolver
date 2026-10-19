import { mountPlayer } from "./player.js";

const MAX_SIZE = 80;

const player = mountPlayer();
const form = document.querySelector("#clue-form");
const errorEl = document.querySelector("#form-error");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  show();
});

show();

function show() {
  try {
    const width = readSize(document.querySelector("#width").value, "Width");
    const height = readSize(document.querySelector("#height").value, "Height");
    const rows = parseLines(document.querySelector("#rows").value, height, "Rows");
    const cols = parseLines(document.querySelector("#cols").value, width, "Columns");
    errorEl.textContent = "";
    player.setPuzzle({ rows, cols }, `${width}x${height}`);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

function readSize(text, label) {
  if (!/^\d+$/.test(text.trim())) throw new Error(`${label} must be a whole number from 1 to ${MAX_SIZE}`);
  const value = Number(text);
  if (value < 1 || value > MAX_SIZE) throw new Error(`${label} must be a whole number from 1 to ${MAX_SIZE}`);
  return value;
}

function parseLines(text, count, label) {
  let lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines = lines.slice(0, -1);
  if (lines.length !== count) {
    throw new Error(`${label} need ${count} lines, got ${lines.length}`);
  }
  return lines.map((line, index) => parseClue(line, `${label} line ${index + 1}`));
}

function parseClue(line, label) {
  const trimmed = line.trim();
  if (!trimmed) return [];
  return trimmed.split(/[\s,]+/).map((part) => {
    if (!/^[1-9]\d*$/.test(part)) throw new Error(`${label}: "${part}" is not a clue`);
    return Number(part);
  });
}
