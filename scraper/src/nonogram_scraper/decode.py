"""Turn a nonograms.org ``var d`` array into black-and-white clues.

The puzzle page does not contain the grid. ``nonogram.min.js`` rebuilds it
from ``d``. Width, height, and the run list are the same expressions the
script uses (``D``, ``C``, and the loop that fills ``E``). One color means
black and white. Each run is ``[column, length, color, row]`` shifted by
the key tuple that follows the run count.
"""

from __future__ import annotations


def decode_bw(data: list) -> tuple[list[list[int]], list[list[int]]]:
    if len(data) < 8:
        raise ValueError("puzzle data is too short")
    width = _span(data[1])
    height = _span(data[2])
    colors = _span(data[3])
    if colors != 1:
        raise ValueError(f"expected one color, found {colors}")
    if not (1 <= width <= 400 and 1 <= height <= 400):
        raise ValueError(f"grid size {width}x{height} is out of range")

    header = colors + 5
    if header + 1 >= len(data):
        raise ValueError("puzzle data is missing the run list")
    run_count = _packed(data[header])
    key = data[header + 1]
    records = data[header + 2 : header + 2 + run_count]
    if len(records) != run_count:
        raise ValueError("puzzle data ended inside the run list")
    if len(key) < 4:
        raise ValueError("puzzle run key is too short")

    grid = [[0] * width for _ in range(height)]
    for record in records:
        if len(record) < 4:
            raise ValueError(f"short run record {record}")
        start = record[0] - key[0] - 1
        end = record[0] - key[0] + record[1] - key[1] - 1
        color = record[2] - key[2]
        row = record[3] - key[3] - 1
        if color <= 0 or end <= start:
            continue
        if row < 0 or row >= height or start < 0 or end > width:
            raise ValueError(f"run {record} falls outside {width}x{height}")
        for column in range(start, end):
            grid[row][column] = 1

    rows = [_runs(grid[row]) for row in range(height)]
    cols = [_runs([grid[row][column] for row in range(height)]) for column in range(width)]
    return rows, cols


def _span(quad: list[int]) -> int:
    return quad[0] % quad[3] + quad[1] % quad[3] - quad[2] % quad[3]


def _packed(quad: list[int]) -> int:
    return quad[0] % quad[3] * (quad[0] % quad[3]) + quad[1] % quad[3] * 2 + quad[2] % quad[3]


def _runs(line: list[int]) -> list[int]:
    clues: list[int] = []
    index = 0
    while index < len(line):
        if line[index] == 0:
            index += 1
            continue
        end = index + 1
        while end < len(line) and line[end] != 0:
            end += 1
        clues.append(end - index)
        index = end
    return clues
