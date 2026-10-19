import assert from "node:assert/strict";
import test from "node:test";
import { runToConvergence, solve, stepSolve } from "../src/solver/solve.js";

const puzzle = { rows: [[1]], cols: [[1]] };

test("no rules leave the grid unknown", () => {
  const result = solve(puzzle, { ruleList: [] });
  assert.deepEqual(result.grid, [[0]]);
  assert.equal(result.capped, false);
});

test("runToConvergence edits the grid it is given", () => {
  const grid = [[0]];
  const result = runToConvergence(puzzle, grid, [{
    id: "fill",
    apply({ grid: cells }) {
      if (cells[0][0] === 1) return false;
      cells[0][0] = 1;
      return true;
    },
  }]);
  assert.deepEqual(grid, [[1]]);
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

test("stepSolve applies a single pass", () => {
  const grid = [[0]];
  let calls = 0;
  const rules = [{
    id: "fill",
    apply({ grid: cells }) {
      calls += 1;
      if (cells[0][0] === 1) return false;
      cells[0][0] = 1;
      return true;
    },
  }];
  const first = stepSolve(puzzle, grid, rules, 0);
  assert.equal(calls, 1);
  assert.deepEqual(grid, [[1]]);
  assert.equal(first.done, false);
  const second = stepSolve(puzzle, grid, rules, first.passes);
  assert.equal(second.done, true);
  assert.equal(calls, 2);
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
