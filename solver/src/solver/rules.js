// Solving rules. Sebastian writes these.
//
// apply({ puzzle, grid })
//   puzzle: { rows: number[][], cols: number[][] }
//   grid: number[][]
// puzzle.rows[row] and puzzle.cols[col] are the clues for that line.
// grid[row][col] is 0 (unknown), 1 (filled), or 2 (crossed).
//
// A rule may set cells to 1 or 2. Return true only when a cell changed.
// apply may be a generator: yield to pause, then return that boolean.
// The runner resumes it, and repeats every enabled rule until they all
// return false, or until it hits the pass cap.

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

/* */
function isBroken(line) { // recursive
  const started = performance.now();

  const cells = line.cells();
  const clues = line.clues();

  const n = cells.length;
  const m = clues.length;

  let cleanCut = n;
  while (cleanCut > 0 && cells[cleanCut - 1] !== FILLED) {
    cleanCut -= 1;
  }

  const dist = new Array(n+1).fill(0);
  for (let i = n-1; i >= 0; --i) {
    if (cells[i] == CROSSED) {
      dist[i] = 0;
    } else {
      dist[i] = dist[i+1] + 1;
    }
  }

  const memo = new Array((n+1)*(m+1)).fill(-1);

  function ok(i, j) {
    if (j == m && i >= cleanCut) return true;  // no more runs, no more filled cells
    if (j == m && i <  cleanCut) return false; // no more runs, filled cells remain
    if (j <  m && i >= n)        return false; // runs remain, no more space

    const idx = i * (m+1) + j;
    if (memo[idx] != -1) return memo[idx];

    let result = false;

    const clue = clues[j];
    const cell = cells[i];

    let fitHere = true;
    if (dist[i] < clue) fitHere = false;
    if (i + clue < n && cells[i + clue] === FILLED) {
      fitHere = false;
    }

    if (fitHere) {
      result ||= ok(i + clue + 1, j + 1);
    }

    if (cell !== FILLED) {
      result ||= ok(i + 1, j);
    }

    memo[idx] = result;
    return result;
  }

  const broken = !ok(0, 0);
  const elapsed = performance.now() - started;
  if (elapsed > 30) {
    console.warn(`isBroken ${line.axis} ${line.index} took ${elapsed.toFixed(1)}ms`, clues);
  }
  return broken;
}
/* */

/*
function isBroken(line) { // iterative
// for some reason about 50% slower than recursive

  const cells = line.cells();
  const clues = line.clues();

  const n = cells.length;
  const m = clues.length;

  let fst = 0;
  while (fst < n && cells[fst] !== FILLED) {
    fst++;
  }

  const dist = new Array(n+1).fill(0);
  for (let i = 1; i <= n; ++i) {
    if (cells[i-1] === CROSSED) {
      dist[i] = 0;
    } else {
      dist[i] = dist[i-1] + 1;
    }
  }


  // positions are between elements. position 0 is at the left of all elements, position n is to the right of them all.

  let ok1 = new Array(n+1).fill(null); // NOTE: unused in first iteration
  let ok2 = new Array(n+1).fill(null);

  for (let j = 0; j < m; ++j) {
    const len = clues[j];

    // assign ok2[r] = true iff it's possible to solve the problem for only clues[0,j) in the subarray cells[0,r)
    for (let r = 0; r <= n; ++r) {

      if (r < len) { // does not fit in the array -> impossible
        ok2[r] = false;
      } else {
        const l = r - len;

        if (j == 0) {

          ok2[r] = false;

          if (fst < l) { // first run starts at l, yet there is an earlier filled -> impossible
          } else if (dist[r] < len) { // crossed item between l and r -> impossible
          } else if (r < n && cells[r] == FILLED) { // ends after r, contradicting hypothesis -> impossible
          } else {
            ok2[r] = true;
          }

          if (cells[r-1] !== FILLED && ok2[r-1]) {
            ok2[r] = true;
          }

        } else {

          ok2[r] = false;

          if (l == 0) { // there is no room for previous items -> impossible
          } else if (dist[r] < len) { // crossed item between l and r -> impossible
          } else if (r < n && cells[r] == FILLED) { // ends after r, contradicting hypothesis -> impossible
          } else if (cells[l-1] == FILLED) { // starts before l, contradicting hypothesis -> impossible
          } else if (!ok1[l-1]) { // cannot insert the j previous runs -> impossible
          } else {
            ok2[r] = true;
          }

          if (cells[r-1] !== FILLED && ok2[r-1]) {
            ok2[r] = true;
          }

        }
      }
    }

    const tmp = ok2;
    ok2 = ok1;
    ok1 = tmp;
  }

  return !ok1[n];
}
/* */

const Axis = {
  ROW: "row",
  COL: "col",
};

export const RULES = [
  {
    id: "contradictions",
    label: "Contradiction finder",
    *apply({ puzzle, grid }) {
      const n = puzzle.rows.length;
      const m = puzzle.cols.length;

      let changed = false;

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
          if (grid[i][j] != UNKNOWN) continue;
          yield;

          const hori = new LinearView(puzzle, grid, Axis.ROW, i);
          const vert = new LinearView(puzzle, grid, Axis.COL, j);

          grid[i][j] = FILLED;
          if (isBroken(hori) || isBroken(vert)) {
            grid[i][j] = CROSSED;
            changed = true;
            continue;
          }

          grid[i][j] = CROSSED;
          if (isBroken(hori) || isBroken(vert)) {
            grid[i][j] = FILLED;
            changed = true;
            continue;
          }

          grid[i][j] = UNKNOWN;
        }
      }

      return changed;
    },
  },
];
