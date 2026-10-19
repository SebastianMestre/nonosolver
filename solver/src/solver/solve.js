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

export function runToConvergence(puzzle, grid, rules) {
  let passes = 0;
  let changed = true;
  while (changed && passes < MAX_PASSES) {
    changed = false;
    passes += 1;
    for (const rule of rules) {
      if (rule.apply({ puzzle, grid })) changed = true;
    }
  }
  return { passes, capped: changed };
}

export function solve(puzzle, options = {}) {
  const grid = emptyGrid(puzzle);
  return { grid, ...runToConvergence(puzzle, grid, activeRules(options)) };
}
