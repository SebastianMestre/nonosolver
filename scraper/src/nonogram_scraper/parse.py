"""Parse nonograms.org catalog and puzzle pages.

Live puzzle pages pack the grid in ``var d=[...]``. ``decode_bw`` turns
that into clues. Tests also feed the table the site script builds:
column clues are ``td#nmv{column}_{k}``, row clues are ``td#nmh{k}_{row}``.
``k`` counts along the clue. Empty header cells have no id. A line whose
only number is 0 is stored as ``[]``.
"""

from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

from nonogram_scraper.decode import decode_bw
from nonogram_scraper.urls import page_number_from_href, puzzle_id_from_href

_DATA = re.compile(r"var\s+d\s*=\s*(\[[\s\S]*?\])\s*;")

_COL_ID = re.compile(r"^nmv(\d+)_(\d+)$")
_ROW_ID = re.compile(r"^nmh(\d+)_(\d+)$")


def parse_catalog(html: str) -> tuple[list[str], int | None]:
    """Puzzle ids from ``table.nonogram_list``, plus the highest page number."""
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table.nonogram_list")
    ids: list[str] = []
    seen: set[str] = set()
    if table is not None:
        for anchor in table.select("a[href]"):
            puzzle_id = puzzle_id_from_href(anchor.get("href") or "")
            if puzzle_id is None or puzzle_id in seen:
                continue
            seen.add(puzzle_id)
            ids.append(puzzle_id)
    last_page: int | None = None
    for anchor in soup.select("a[href]"):
        number = page_number_from_href(anchor.get("href") or "")
        if number is None:
            continue
        if last_page is None or number > last_page:
            last_page = number
    return ids, last_page


def parse_puzzle(html: str, url: str) -> dict:
    match = _DATA.search(html)
    if match is not None:
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            raise ValueError(f"puzzle data at {url} is not JSON") from exc
        rows, cols = decode_bw(data)
        _fit(rows, len(cols), "row", url)
        _fit(cols, len(rows), "column", url)
        return {"url": url, "puzzle": {"rows": rows, "cols": cols}}

    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table#nonogram_table")
    if table is None:
        raise ValueError(f"no puzzle data at {url}")
    grid = table.select_one("td.nmtc table")
    if grid is None:
        raise ValueError(f"no grid at {url}")
    grid_rows = grid.find_all("tr")
    height = len(grid_rows)
    if height == 0:
        raise ValueError(f"empty grid at {url}")
    width = len(grid_rows[0].find_all("td", recursive=False))
    if width == 0:
        raise ValueError(f"empty grid at {url}")

    columns: list[list[tuple[int, int]]] = [[] for _ in range(width)]
    rows: list[list[tuple[int, int]]] = [[] for _ in range(height)]
    for node in table.select("[id]"):
        element_id = node.get("id") or ""
        column_match = _COL_ID.match(element_id)
        if column_match:
            column = int(column_match.group(1))
            index = int(column_match.group(2))
            if column >= width:
                raise ValueError(f"{element_id} is outside a grid {width} columns wide at {url}")
            columns[column].append((index, _number(node, element_id)))
            continue
        row_match = _ROW_ID.match(element_id)
        if row_match:
            index = int(row_match.group(1))
            row = int(row_match.group(2))
            if row >= height:
                raise ValueError(f"{element_id} is outside a grid {height} rows tall at {url}")
            rows[row].append((index, _number(node, element_id)))

    row_clues = [_ordered(pairs, f"row at {url}") for pairs in rows]
    col_clues = [_ordered(pairs, f"column at {url}") for pairs in columns]
    _fit(row_clues, width, "row", url)
    _fit(col_clues, height, "column", url)
    return {"url": url, "puzzle": {"rows": row_clues, "cols": col_clues}}


def _number(node, element_id: str) -> int:
    text = node.get_text(strip=True)
    if not text.isdigit():
        raise ValueError(f"clue {element_id} is not an integer: {text!r}")
    return int(text)


def _ordered(pairs: list[tuple[int, int]], where: str) -> list[int]:
    pairs.sort()
    seen: set[int] = set()
    numbers: list[int] = []
    for index, number in pairs:
        if index in seen:
            raise ValueError(f"duplicate clue index {index} on a {where}")
        seen.add(index)
        numbers.append(number)
    if numbers == [0]:
        return []
    if any(number <= 0 for number in numbers):
        raise ValueError(f"non-positive clue {numbers} on a {where}")
    return numbers


def _fit(lines: list[list[int]], length: int, kind: str, url: str) -> None:
    for index, clues in enumerate(lines):
        needed = sum(clues) + max(0, len(clues) - 1)
        if needed > length:
            raise ValueError(f"{kind} {index} clues {clues} do not fit in {length} at {url}")
