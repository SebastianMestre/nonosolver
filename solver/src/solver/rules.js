// Solving rules. Sebastian writes these.
//
// apply({ puzzle, grid })
//   puzzle: { rows: number[][], cols: number[][] }
//   grid: number[][]
// puzzle.rows[row] and puzzle.cols[col] are the clues for that line.
// grid[row][col] is 0 (unknown), 1 (filled), or 2 (crossed).
//
// A rule may set cells to 1 or 2. Return true only when a cell changed.
// The runner repeats every enabled rule until they all return false, or
// until it hits the pass cap.

import { UNKNOWN, FILLED, CROSSED } from "./cells.js";
import { filledRuns } from "./line.js";

class LinearView {
  constructor(puzzle, grid, axis, index) {
    this.puzzle = puzzle;
    this.grid = grid;
    this.axis = axis;
    this.index = index;
  }

  clues() {
    return this.axis === Axis.ROW ? this.puzzle.rows[this.index] : this.puzzle.cols[this.index];
  }

  cells() {
    return this.axis === Axis.ROW ? this.grid[this.index].slice() : this.grid.map((row) => row[this.index]);
  }

  setCell(cell, value) {
    if (this.axis === Axis.ROW) {
      this.grid[this.index][cell] = value;
    } else {
      this.grid[cell][this.index] = value;
    }
  }
}

function emptyRuns(cells) {
  const runs = [];
  let count = 0;
  for (const cell of cells) {
    if (cell !== CROSSED) {
      count += 1;
    } else if (count) {
      runs.push(count);
      count = 0;
    }
  }
  if (count) runs.push(count);
  return runs;
}

function isBroken(line) {
  
  const largestGap = Math.max(...emptyRuns(line.cells()));
  const largestRun = Math.max(...line.clues());

  if (largestGap < largestRun)
    return true;

  return false;
}

const Axis = {
  ROW: "row",
  COL: "col",
};

export const RULES = [
  {
    id: "overlap",
    label: "Simple overlap",
    apply({ puzzle, grid }) {
      const n = puzzle.rows.length;
      const m = puzzle.cols.length;
      let changed = false;

      for (let i = 0; i < n; i++) {
        const view = new LinearView(puzzle, grid, Axis.ROW, i);
        const clues = view.clues();
        const cells = view.cells();
        for (let j = 0; j < m; j++) {
          if (grid[i][j] != UNKNOWN) continue;

          view.setCell(j, FILLED);
          if (isBroken(view)) {
            grid[i][j] = CROSSED;
            changed = true;
            continue;
          }

          view.setCell(j, CROSSED);
          if (isBroken(view)) {
            grid[i][j] = FILLED;
            changed = true;
            continue;
          }

          view.setCell(j, UNKNOWN);
        }
      }

      return changed;
    },
  },
];
