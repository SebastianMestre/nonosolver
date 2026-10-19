"""Walk the catalog and save puzzle files."""

from __future__ import annotations

import sys
from pathlib import Path

from nonogram_scraper.client import PoliteClient
from nonogram_scraper.parse import parse_catalog, parse_puzzle
from nonogram_scraper.store import puzzle_path, write_manifest, write_puzzle
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
    start_page: int = 1,
    end_page: int | None = None,
    limit: int | None = None,
    refresh: bool = False,
) -> list[str]:
    """Return puzzle ids saved or already present, in visit order.

    ``limit`` counts newly saved files. Already-present files are kept
    in the manifest and do not count toward the limit.
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

        page = start_page
        html = client.get(catalog_url(page))
        page_ids, last_page = parse_catalog(html)
        last = end_page if end_page is not None else (last_page if last_page is not None else page)
        print(f"catalog page {page}, {len(page_ids)} puzzles, last page {last}", file=sys.stderr)
        stop = False
        for puzzle_id in page_ids:
            if take(puzzle_id):
                stop = True
                break
        page += 1
        while not stop and page <= last:
            html = client.get(catalog_url(page))
            page_ids, _ = parse_catalog(html)
            if not page_ids:
                print(f"catalog page {page} is empty, stopping", file=sys.stderr)
                break
            print(f"catalog page {page}, {len(page_ids)} puzzles", file=sys.stderr)
            for puzzle_id in page_ids:
                if take(puzzle_id):
                    stop = True
                    break
            page += 1
        return saved

    try:
        return walk()
    finally:
        write_manifest(out, saved)
