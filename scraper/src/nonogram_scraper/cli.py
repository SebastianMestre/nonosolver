"""``nonogram-scrape`` command."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from nonogram_scraper.client import FetchError, PoliteClient, RobotsDenied
from nonogram_scraper.crawl import CrawlError, crawl
from nonogram_scraper.store import repo_data_dir


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Download black-and-white nonograms from nonograms.org.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=repo_data_dir(),
        help="directory for one JSON file per puzzle (default: data/puzzles)",
    )
    parser.add_argument("--delay", type=float, default=1.0, help="seconds between requests")
    parser.add_argument("--jitter", type=float, default=0.3, help="extra random seconds, up to this")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--retries", type=int, default=6)
    parser.add_argument(
        "--start-page",
        type=int,
        default=None,
        help="catalog page to start from; default continues after the last finished page",
    )
    parser.add_argument(
        "--end-page",
        type=int,
        default=0,
        help="last catalog page to read; 0 follows the pager on the site",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="stop after this many newly saved puzzles; 0 means no limit",
    )
    parser.add_argument(
        "--id",
        action="append",
        default=[],
        help="fetch this puzzle id and skip the catalog; repeat for several",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="download again even when the JSON file is already there",
    )
    args = parser.parse_args(argv)
    if args.delay < 0 or args.jitter < 0:
        parser.error("--delay and --jitter must be >= 0")
    if args.start_page is not None and args.start_page < 1:
        parser.error("--start-page must be >= 1")

    try:
        with PoliteClient(
            delay=args.delay,
            jitter=args.jitter,
            timeout=args.timeout,
            retries=args.retries,
        ) as client:
            saved = crawl(
                client,
                args.out,
                ids=args.id or None,
                start_page=args.start_page,
                end_page=args.end_page or None,
                limit=args.limit or None,
                refresh=args.refresh,
            )
    except (FetchError, RobotsDenied, CrawlError, OSError) as exc:
        print(exc, file=sys.stderr)
        raise SystemExit(1) from exc
    print(f"{len(saved)} puzzles in {args.out}")
