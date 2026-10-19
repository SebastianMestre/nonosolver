"""Join per-puzzle files into one JSON array for the page."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from nonogram_scraper.store import (
    MANIFEST_NAME,
    read_manifest_ids,
    repo_data_dir,
    write_json,
    write_manifest,
)


def bundle(directory: Path) -> list[dict]:
    by_id: dict[str, dict] = {}
    for path in directory.glob("*.json"):
        if path.name == MANIFEST_NAME:
            continue
        if not path.stem.isdigit():
            continue
        document = json.loads(path.read_text(encoding="utf-8"))
        _check(document, path.name)
        by_id[path.stem] = document

    ordered: list[str] = []
    manifest_ids = read_manifest_ids(directory)
    if manifest_ids is not None:
        for puzzle_id in manifest_ids:
            if puzzle_id in by_id:
                ordered.append(puzzle_id)
    for puzzle_id in sorted(by_id, key=int, reverse=True):
        if puzzle_id not in ordered:
            ordered.append(puzzle_id)
    return [by_id[puzzle_id] for puzzle_id in ordered]


def _check(document: dict, name: str) -> None:
    puzzle = document.get("puzzle")
    if not isinstance(document.get("url"), str) or not isinstance(puzzle, dict):
        raise ValueError(f"{name} is missing url or puzzle")
    if not isinstance(puzzle.get("rows"), list) or not isinstance(puzzle.get("cols"), list):
        raise ValueError(f"{name} is missing rows or cols")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Write data/puzzles.json from the per-puzzle files.",
    )
    parser.add_argument("--puzzles", type=Path, default=repo_data_dir())
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="array file (default: data/puzzles.json next to the puzzle directory)",
    )
    args = parser.parse_args(argv)
    out = args.out if args.out is not None else args.puzzles.parent / "puzzles.json"
    try:
        documents = bundle(args.puzzles)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(exc, file=sys.stderr)
        raise SystemExit(1) from exc
    write_json(out, documents, pretty=False)
    ids = []
    for document in documents:
        stem = document["url"].rstrip("/").rsplit("/", 1)[-1]
        ids.append(stem)
    write_manifest(args.puzzles, ids)
    print(f"wrote {len(documents)} puzzles to {out}")
