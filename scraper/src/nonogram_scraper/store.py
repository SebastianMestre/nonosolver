"""One JSON file per puzzle, plus a manifest."""

from __future__ import annotations

import json
from pathlib import Path

MANIFEST_NAME = "manifest.json"
PROGRESS_NAME = "progress.json"
SOURCE = "https://www.nonograms.org/nonograms"


def repo_data_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "data" / "puzzles"


def puzzle_path(directory: Path, puzzle_id: str) -> Path:
    return directory / f"{puzzle_id}.json"


def write_json(path: Path, obj, *, pretty: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if pretty:
        text = json.dumps(obj, indent=2, ensure_ascii=False) + "\n"
    else:
        text = json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def write_puzzle(directory: Path, puzzle_id: str, document: dict) -> Path:
    path = puzzle_path(directory, puzzle_id)
    write_json(path, document, pretty=True)
    return path


def write_manifest(directory: Path, ids: list[str]) -> Path:
    path = directory / MANIFEST_NAME
    write_json(path, {"source": SOURCE, "count": len(ids), "ids": ids}, pretty=True)
    return path


def read_next_page(directory: Path) -> int:
    path = directory / PROGRESS_NAME
    if not path.is_file():
        return 1
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return 1
    page = document.get("next_page") if isinstance(document, dict) else None
    if isinstance(page, int) and page >= 1:
        return page
    return 1


def write_next_page(directory: Path, page: int) -> Path:
    path = directory / PROGRESS_NAME
    write_json(path, {"next_page": page}, pretty=True)
    return path


def read_manifest_ids(directory: Path) -> list[str] | None:
    path = directory / MANIFEST_NAME
    if not path.is_file():
        return None
    document = json.loads(path.read_text(encoding="utf-8"))
    ids = document.get("ids")
    if not isinstance(ids, list):
        return None
    return [str(item) for item in ids]
