export const UNKNOWN = 0;
export const FILLED = 1;
export const CROSSED = 2;

export function toggled(current, button) {
  if (button === 2) return current === CROSSED ? UNKNOWN : CROSSED;
  return current === FILLED ? UNKNOWN : FILLED;
}
