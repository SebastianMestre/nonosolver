import { CROSSED, FILLED } from "../solver/cells.js";
import { columnCells, lineSolved, markedFraction, puzzleSolved } from "../solver/line.js";
import { CELL, LABEL } from "./layout.js";

const HINT = "#d0d0d0";
const HINT_EMPTY = "#dadada";
const LINE = "#8f8f8f";
const THICK = "#6a6a6a";
const PAPER = "#ffffff";
const INK = "#111111";
const IDLE = "#a3a3a3";
const CROSS = "#444444";
const SOLVED = "#2f9d55";

export function lodColor(puzzle, grid) {
  if (puzzleSolved(puzzle, grid)) return SOLVED;
  const fraction = markedFraction(grid);
  if (fraction === 0) return PAPER;
  const value = Math.round(255 - 175 * fraction);
  return `rgb(${value},${value},${value})`;
}

export function drawBoard(ctx, { items, entries, grids, width, height, camera, lodCache }) {
  ctx.setTransform(camera.dpr, 0, 0, camera.dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#eceae4";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(camera.ox, camera.oy);
  ctx.scale(camera.scale, camera.scale);

  const view = visibleWorld(width, height, camera);
  const detailed = camera.scale * CELL >= 8;
  for (const item of items) {
    if (!intersects(item, view)) continue;
    if (!detailed) {
      drawBlock(ctx, item, entries[item.index].puzzle, grids[item.index], lodCache, camera.scale);
    } else {
      drawPuzzle(ctx, item, entries[item.index].puzzle, grids[item.index]);
    }
  }
}

function visibleWorld(width, height, camera) {
  return {
    x: -camera.ox / camera.scale,
    y: -camera.oy / camera.scale,
    width: width / camera.scale,
    height: height / camera.scale,
  };
}

function intersects(item, view) {
  return item.x < view.x + view.width && item.x + item.width > view.x && item.y < view.y + view.height && item.y + item.height > view.y;
}

function drawBlock(ctx, item, puzzle, grid, lodCache, scale) {
  let color = lodCache.get(item.index);
  if (!color) {
    color = lodColor(puzzle, grid);
    lodCache.set(item.index, color);
  }
  ctx.fillStyle = color;
  ctx.fillRect(item.x, item.y, item.width, item.height);
  ctx.strokeStyle = "#9a9a9a";
  ctx.lineWidth = 1 / scale;
  ctx.strokeRect(item.x, item.y, item.width, item.height);
}

export function drawPuzzle(ctx, item, puzzle, grid) {
  const top = item.y + LABEL;
  const { rowHeader, colHeader, gridW, gridH } = item;
  const tableW = item.width;
  const tableH = (colHeader + gridH) * CELL;

  ctx.fillStyle = HINT_EMPTY;
  ctx.fillRect(item.x, top, tableW, colHeader * CELL);
  ctx.fillRect(item.x, top, rowHeader * CELL, tableH);

  for (let column = 0; column < gridW; column += 1) {
    const clues = puzzle.cols[column];
    const start = colHeader - clues.length;
    for (let i = 0; i < clues.length; i += 1) {
      ctx.fillStyle = HINT;
      ctx.fillRect(item.x + (rowHeader + column) * CELL, top + (start + i) * CELL, CELL, CELL);
    }
  }
  for (let row = 0; row < gridH; row += 1) {
    const clues = puzzle.rows[row];
    const start = rowHeader - clues.length;
    for (let i = 0; i < clues.length; i += 1) {
      ctx.fillStyle = HINT;
      ctx.fillRect(item.x + (start + i) * CELL, top + (colHeader + row) * CELL, CELL, CELL);
    }
  }

  for (let row = 0; row < gridH; row += 1) {
    for (let column = 0; column < gridW; column += 1) {
      const x = item.x + (rowHeader + column) * CELL;
      const y = top + (colHeader + row) * CELL;
      const value = grid[row][column];
      ctx.fillStyle = value === FILLED ? INK : PAPER;
      ctx.fillRect(x, y, CELL, CELL);
      if (value === CROSSED) drawCross(ctx, x, y);
    }
  }

  strokeGrid(ctx, item.x, top, rowHeader, colHeader, gridW, gridH);
  drawClues(ctx, item, puzzle, grid, top);

  ctx.fillStyle = "#333333";
  ctx.font = "12px Verdana, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`#${item.id}`, item.x, item.y);
}

function strokeGrid(ctx, x, top, rowHeader, colHeader, gridW, gridH) {
  const x0 = x;
  const y0 = top;
  const gridX = x + rowHeader * CELL;
  const gridY = top + colHeader * CELL;
  const x1 = gridX + gridW * CELL;
  const y1 = gridY + gridH * CELL;

  ctx.beginPath();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  for (let column = 0; column <= rowHeader + gridW; column += 1) {
    const px = x0 + column * CELL;
    ctx.moveTo(px, y0);
    ctx.lineTo(px, y1);
  }
  for (let row = 0; row <= colHeader + gridH; row += 1) {
    const py = y0 + row * CELL;
    ctx.moveTo(x0, py);
    ctx.lineTo(x1, py);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = THICK;
  ctx.lineWidth = 2;
  for (let column = 4; column < gridW; column += 5) {
    const px = gridX + (column + 1) * CELL;
    ctx.moveTo(px, y0);
    ctx.lineTo(px, y1);
  }
  for (let row = 4; row < gridH; row += 5) {
    const py = gridY + (row + 1) * CELL;
    ctx.moveTo(x0, py);
    ctx.lineTo(x1, py);
  }
  ctx.stroke();

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, top + 1, (rowHeader + gridW) * CELL - 2, (colHeader + gridH) * CELL - 2);
}

function drawClues(ctx, item, puzzle, grid, top) {
  const rowSolved = puzzle.rows.map((clues, row) => lineSolved(clues, grid[row]));
  const colSolved = puzzle.cols.map((clues, column) => lineSolved(clues, columnCells(grid, column)));
  ctx.font = "11px Verdana, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let column = 0; column < item.gridW; column += 1) {
    const clues = puzzle.cols[column];
    const start = item.colHeader - clues.length;
    ctx.fillStyle = colSolved[column] ? INK : IDLE;
    for (let i = 0; i < clues.length; i += 1) {
      const x = item.x + (item.rowHeader + column) * CELL + CELL / 2;
      const y = top + (start + i) * CELL + CELL / 2;
      ctx.fillText(String(clues[i]), x, y);
    }
  }
  for (let row = 0; row < item.gridH; row += 1) {
    const clues = puzzle.rows[row];
    const start = item.rowHeader - clues.length;
    ctx.fillStyle = rowSolved[row] ? INK : IDLE;
    for (let i = 0; i < clues.length; i += 1) {
      const x = item.x + (start + i) * CELL + CELL / 2;
      const y = top + (item.colHeader + row) * CELL + CELL / 2;
      ctx.fillText(String(clues[i]), x, y);
    }
  }
}

function drawCross(ctx, x, y) {
  const pad = CELL * 0.28;
  ctx.strokeStyle = CROSS;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + pad, y + pad);
  ctx.lineTo(x + CELL - pad, y + CELL - pad);
  ctx.moveTo(x + CELL - pad, y + pad);
  ctx.lineTo(x + pad, y + CELL - pad);
  ctx.stroke();
}
