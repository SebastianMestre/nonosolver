import { UNKNOWN } from "./cells.js";
import { RULES } from "./rules.js";

export { RULES } from "./rules.js";
export { UNKNOWN, FILLED, CROSSED } from "./cells.js";

const MAX_PASSES = 400;

export function emptyGrid(puzzle) {
  return puzzle.rows.map(() => puzzle.cols.map(() => UNKNOWN));
}

export function activeRules(options = {}) {
  const enabled = options.rules ?? Object.fromEntries(RULES.map((rule) => [rule.id, true]));
  return (options.ruleList ?? RULES).filter((rule) => enabled[rule.id] !== false);
}

function resumable(value) {
  return Boolean(value) && typeof value.next === "function";
}

function* resume(value) {
  if (resumable(value)) return yield* value;
  return value;
}

export function finish(value) {
  if (!resumable(value)) return value;
  let step = value.next();
  while (!step.done) step = value.next();
  return step.value;
}

export function* stepSolve(puzzle, grid, rules, passes) {
  let changed = false;
  for (const rule of rules) {
    if (yield* resume(rule.apply({ puzzle, grid }))) changed = true;
  }
  const nextPasses = passes + 1;
  return {
    passes: nextPasses,
    done: !changed || nextPasses >= MAX_PASSES,
    capped: changed && nextPasses >= MAX_PASSES,
  };
}

export function* solveGrid(puzzle, grid, rules) {
  let passes = 0;
  let capped = false;
  let done = false;
  while (!done) {
    const result = yield* stepSolve(puzzle, grid, rules, passes);
    passes = result.passes;
    capped = result.capped;
    done = result.done;
  }
  return { passes, capped };
}

export function* solveAll(puzzles, grids, rules, cursor) {
  for (cursor.index = 0; cursor.index < puzzles.length; cursor.index += 1) {
    yield* solveGrid(puzzles[cursor.index], grids[cursor.index], rules);
  }
}

export function runToConvergence(puzzle, grid, rules) {
  return finish(solveGrid(puzzle, grid, rules));
}

export function solve(puzzle, options = {}) {
  const grid = emptyGrid(puzzle);
  return { grid, ...runToConvergence(puzzle, grid, activeRules(options)) };
}
