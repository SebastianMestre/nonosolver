import { FILLED, UNKNOWN } from "./cells.js";

export function filledRuns(cells) {
  const runs = [];
  let count = 0;
  for (const cell of cells) {
    if (cell === FILLED) {
      count += 1;
    } else if (count) {
      runs.push(count);
      count = 0;
    }
  }
  if (count) runs.push(count);
  return runs;
}

export function lineSolved(clues, cells) {
  for (const cell of cells) {
    if (cell === UNKNOWN) return false;
  }
  const runs = filledRuns(cells);
  if (runs.length !== clues.length) return false;
  for (let i = 0; i < runs.length; i += 1) {
    if (runs[i] !== clues[i]) return false;
  }
  return true;
}

export function columnCells(grid, column) {
  const cells = [];
  for (let row = 0; row < grid.length; row += 1) cells.push(grid[row][column]);
  return cells;
}

export function puzzleSolved(puzzle, grid) {
  for (let row = 0; row < puzzle.rows.length; row += 1) {
    if (!lineSolved(puzzle.rows[row], grid[row])) return false;
  }
  for (let column = 0; column < puzzle.cols.length; column += 1) {
    if (!lineSolved(puzzle.cols[column], columnCells(grid, column))) return false;
  }
  return true;
}

export function markedFraction(grid) {
  let marked = 0;
  let total = 0;
  for (const row of grid) {
    for (const cell of row) {
      total += 1;
      if (cell !== UNKNOWN) marked += 1;
    }
  }
  return total === 0 ? 0 : marked / total;
}
