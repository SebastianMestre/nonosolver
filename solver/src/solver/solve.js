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

export function stepSolve(puzzle, grid, rules, passes) {
  let changed = false;
  for (const rule of rules) {
    if (rule.apply({ puzzle, grid })) changed = true;
  }
  const nextPasses = passes + 1;
  return {
    passes: nextPasses,
    done: !changed || nextPasses >= MAX_PASSES,
    capped: changed && nextPasses >= MAX_PASSES,
  };
}

export function runToConvergence(puzzle, grid, rules) {
  let passes = 0;
  let capped = false;
  let done = false;
  while (!done) {
    const result = stepSolve(puzzle, grid, rules, passes);
    passes = result.passes;
    capped = result.capped;
    done = result.done;
  }
  return { passes, capped };
}

export function solve(puzzle, options = {}) {
  const grid = emptyGrid(puzzle);
  return { grid, ...runToConvergence(puzzle, grid, activeRules(options)) };
}
