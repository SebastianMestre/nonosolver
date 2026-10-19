export const CELL = 18;
export const GAP = 28;
export const LABEL = 16;
export const ROW_WIDTH = 3200;

export function puzzleId(url) {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? match[1] : url;
}

export function measure(puzzle) {
  const colHeader = Math.max(1, ...puzzle.cols.map((clues) => clues.length));
  const rowHeader = Math.max(1, ...puzzle.rows.map((clues) => clues.length));
  const gridW = puzzle.cols.length;
  const gridH = puzzle.rows.length;
  return {
    colHeader,
    rowHeader,
    gridW,
    gridH,
    width: (rowHeader + gridW) * CELL,
    height: LABEL + (colHeader + gridH) * CELL,
  };
}

export function layoutPuzzles(entries, rowWidth = ROW_WIDTH) {
  const items = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const size = measure(entry.puzzle);
    if (x > 0 && x + size.width > rowWidth) {
      x = 0;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    items.push({
      index,
      id: puzzleId(entry.url),
      url: entry.url,
      x,
      y,
      ...size,
    });
    x += size.width + GAP;
    if (size.height > rowHeight) rowHeight = size.height;
  }
  let contentWidth = 0;
  let contentHeight = 0;
  for (const item of items) {
    contentWidth = Math.max(contentWidth, item.x + item.width);
    contentHeight = Math.max(contentHeight, item.y + item.height);
  }
  return { items, contentWidth, contentHeight };
}

export function cellAt(item, worldX, worldY) {
  const localX = worldX - item.x;
  const localY = worldY - item.y - LABEL;
  const column = Math.floor(localX / CELL) - item.rowHeader;
  const row = Math.floor(localY / CELL) - item.colHeader;
  if (row < 0 || column < 0 || row >= item.gridH || column >= item.gridW) return null;
  return { row, column };
}

export function hitTest(items, worldX, worldY) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (worldX >= item.x && worldX < item.x + item.width && worldY >= item.y && worldY < item.y + item.height) {
      return item;
    }
  }
  return null;
}
