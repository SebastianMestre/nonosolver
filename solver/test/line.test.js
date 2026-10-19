import assert from "node:assert/strict";
import test from "node:test";
import { CROSSED, FILLED, UNKNOWN } from "../src/solver/cells.js";
import { lineSolved, puzzleSolved } from "../src/solver/line.js";

test("a line is solved when every cell is marked and the runs match", () => {
  assert.equal(lineSolved([1, 2], [FILLED, CROSSED, FILLED, FILLED]), true);
  assert.equal(lineSolved([], [CROSSED, CROSSED]), true);
  assert.equal(lineSolved([], [UNKNOWN, UNKNOWN]), false);
  assert.equal(lineSolved([1, 1], [FILLED, FILLED]), false);
  assert.equal(lineSolved([2], [FILLED, UNKNOWN]), false);
});

test("puzzleSolved checks rows and columns", () => {
  const puzzle = { rows: [[1], []], cols: [[1], []] };
  const grid = [
    [FILLED, CROSSED],
    [CROSSED, CROSSED],
  ];
  assert.equal(puzzleSolved(puzzle, grid), true);
  grid[0][1] = UNKNOWN;
  assert.equal(puzzleSolved(puzzle, grid), false);
});
