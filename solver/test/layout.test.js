import assert from "node:assert/strict";
import test from "node:test";
import { cellAt, layoutPuzzles } from "../src/pages/layout.js";

function entry(id) {
  return {
    url: `https://www.nonograms.org/nonograms/i/${id}`,
    puzzle: { rows: [[1]], cols: [[1]] },
  };
}

test("puzzles wrap when the row is full", () => {
  const { items } = layoutPuzzles([entry(2), entry(1)], 40);
  assert.equal(items[0].id, "2");
  assert.equal(items[1].x, 0);
  assert.ok(items[1].y > items[0].y);
});

test("cellAt misses the clue header", () => {
  const { items } = layoutPuzzles([entry(7)]);
  const item = items[0];
  assert.equal(cellAt(item, item.x + 1, item.y + 1), null);
  const hit = cellAt(item, item.x + item.rowHeader * 18 + 1, item.y + 16 + item.colHeader * 18 + 1);
  assert.deepEqual(hit, { row: 0, column: 0 });
});
