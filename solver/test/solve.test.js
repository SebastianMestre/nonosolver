import assert from "node:assert/strict";
import test from "node:test";
import { solve } from "../src/solver/solve.js";

const puzzle = { rows: [[1]], cols: [[1]] };

test("the stub rules leave the grid unknown", () => {
  const result = solve(puzzle);
  assert.deepEqual(result.grid, [[0]]);
  assert.equal(result.capped, false);
});

test("a disabled rule does not run", () => {
  let calls = 0;
  solve(puzzle, {
    rules: { fill: false },
    ruleList: [{ id: "fill", apply() { calls += 1; return false; } }],
  });
  assert.equal(calls, 0);
});

test("a rule that keeps reporting a change stops at the cap", () => {
  let calls = 0;
  const result = solve(puzzle, {
    rules: { spin: true },
    ruleList: [{ id: "spin", apply() { calls += 1; return true; } }],
  });
  assert.equal(result.capped, true);
  assert.ok(calls < 1000);
  assert.ok(calls > 0);
});

test("a rule can fill a cell and then stop", () => {
  const result = solve(puzzle, {
    rules: { fill: true },
    ruleList: [{
      id: "fill",
      apply({ grid }) {
        if (grid[0][0] === 1) return false;
        grid[0][0] = 1;
        return true;
      },
    }],
  });
  assert.deepEqual(result.grid, [[1]]);
  assert.equal(result.capped, false);
});
