import { UNKNOWN } from "./cells.js";
import { RULES } from "./rules.js";

export { RULES } from "./rules.js";
export { UNKNOWN, FILLED, CROSSED } from "./cells.js";

const MAX_PASSES = 400;

export function emptyGrid(puzzle) {
  return puzzle.rows.map(() => puzzle.cols.map(() => UNKNOWN));
}

export function solve(puzzle, options = {}) {
  const enabled = options.rules ?? Object.fromEntries(RULES.map((rule) => [rule.id, true]));
  const active = (options.ruleList ?? RULES).filter((rule) => enabled[rule.id] !== false);
  const grid = emptyGrid(puzzle);
  let passes = 0;
  let changed = true;
  while (changed && passes < MAX_PASSES) {
    changed = false;
    passes += 1;
    for (const rule of active) {
      if (rule.apply({ puzzle, grid })) changed = true;
    }
  }
  return { grid, passes, capped: changed };
}
