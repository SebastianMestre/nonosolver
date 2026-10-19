"""Walk the catalog and save puzzle files."""

from __future__ import annotations

import sys
from pathlib import Path

from nonogram_scraper.client import PoliteClient
from nonogram_scraper.parse import parse_catalog, parse_puzzle
from nonogram_scraper.store import (
    puzzle_path,
    read_manifest_ids,
    read_next_page,
    write_manifest,
    write_next_page,
    write_puzzle,
)
from nonogram_scraper.urls import catalog_url, puzzle_url

# A parser bug would otherwise walk the whole catalog, one miss at a time.
MAX_CONSECUTIVE_FAILURES = 5


class CrawlError(RuntimeError):
    pass


def crawl(
    client: PoliteClient,
    out: Path,
    *,
    ids: list[str] | None = None,
    start_page: int | None = None,
    end_page: int | None = None,
    limit: int | None = None,
    refresh: bool = False,
) -> list[str]:
    """Return puzzle ids saved or already present, in visit order.

    ``limit`` counts newly saved files. Already-present files are kept
    in the manifest and do not count toward the limit.

    With no ``start_page`` and no ``ids``, the catalog continues at the
    next page recorded in the output directory. A page is recorded only
    after every puzzle on it has been saved or skipped.
    """
    out.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []
    seen: set[str] = set()
    fetched = 0
    failures = 0

    def take(puzzle_id: str) -> bool:
        nonlocal fetched, failures
        if puzzle_id in seen:
            return False
        path = puzzle_path(out, puzzle_id)
        if path.is_file() and not refresh:
            seen.add(puzzle_id)
            saved.append(puzzle_id)
            failures = 0
            print(f"keep {puzzle_id}", file=sys.stderr)
            return False
        if limit is not None and fetched >= limit:
            return True
        url = puzzle_url(puzzle_id)
        try:
            document = parse_puzzle(client.get(url), url)
        except ValueError as exc:
            failures += 1
            print(f"skip {puzzle_id}: {exc}", file=sys.stderr)
            if failures >= MAX_CONSECUTIVE_FAILURES:
                raise CrawlError(
                    f"stopped after {failures} puzzle pages in a row did not parse"
                ) from exc
            return False
        write_puzzle(out, puzzle_id, document)
        seen.add(puzzle_id)
        saved.append(puzzle_id)
        fetched += 1
        failures = 0
        print(f"saved {puzzle_id} ({fetched})", file=sys.stderr)
        return False

    def walk() -> list[str]:
        if ids:
            for puzzle_id in ids:
                if take(puzzle_id):
                    break
            return saved

        page = _first_page(out, start_page=start_page, refresh=refresh)
        if page > 1:
            print(f"resume at catalog page {page}", file=sys.stderr)
        html = client.get(catalog_url(page))
        page_ids, last_page = parse_catalog(html)
        last = end_page if end_page is not None else (last_page if last_page is not None else page)
        print(f"catalog page {page}, {len(page_ids)} puzzles, last page {last}", file=sys.stderr)
        stop = _take_page(page_ids)
        if not stop:
            write_next_page(out, page + 1)
        page += 1
        while not stop and page <= last:
            html = client.get(catalog_url(page))
            page_ids, _ = parse_catalog(html)
            if not page_ids:
                print(f"catalog page {page} is empty, stopping", file=sys.stderr)
                break
            print(f"catalog page {page}, {len(page_ids)} puzzles", file=sys.stderr)
            stop = _take_page(page_ids)
            if stop:
                break
            write_next_page(out, page + 1)
            page += 1
        return saved

    def _take_page(page_ids: list[str]) -> bool:
        for puzzle_id in page_ids:
            if take(puzzle_id):
                return True
        return False

    try:
        return walk()
    finally:
        write_manifest(out, _merged_ids(out, saved))


def _first_page(out: Path, *, start_page: int | None, refresh: bool) -> int:
    if start_page is not None:
        return start_page
    if refresh:
        return 1
    return read_next_page(out)


def _merged_ids(out: Path, saved: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for puzzle_id in [*(read_manifest_ids(out) or []), *saved]:
        if puzzle_id in seen:
            continue
        seen.add(puzzle_id)
        merged.append(puzzle_id)
    return merged
