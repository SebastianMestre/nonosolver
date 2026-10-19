"""Address helpers for the black-and-white catalog."""

from __future__ import annotations

import re
from urllib.parse import urlsplit

ORIGIN = "https://www.nonograms.org"
ROBOTS_URL = f"{ORIGIN}/robots.txt"
CATALOG_URL = f"{ORIGIN}/nonograms"

# robots.txt Disallow entries the crawler must not request, even if a
# page links to them. Thumbnails live under /files/ and are included.
DENIED_PREFIXES = (
    "/nonogramprint/",
    "/nonograms/size/",
    "/nonograms2/",
    "/files/",
    "/public/",
    "/search",
    "/register",
    "/auth",
    "/forgot",
    "/profile",
    "/user",
    "/options",
    "/unrated",
    "/private",
    "/ajax_comments",
)

_PUZZLE_ID = re.compile(r"/nonograms/i/(\d+)")
_PAGE = re.compile(r"/nonograms/p/(\d+)")


def catalog_url(page: int) -> str:
    if page <= 1:
        return CATALOG_URL
    return f"{ORIGIN}/nonograms/p/{page}"


def puzzle_url(puzzle_id: str) -> str:
    return f"{ORIGIN}/nonograms/i/{puzzle_id}"


def puzzle_id_from_href(href: str) -> str | None:
    match = _PUZZLE_ID.search(href)
    if match is None:
        return None
    return match.group(1)


def page_number_from_href(href: str) -> int | None:
    match = _PAGE.search(href)
    if match is None:
        return None
    return int(match.group(1))


def path_allowed(url: str) -> bool:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        return False
    if parts.netloc not in ("www.nonograms.org", "nonograms.org"):
        return False
    path = parts.path or "/"
    for prefix in DENIED_PREFIXES:
        bare = prefix.rstrip("/")
        if path == bare or path.startswith(prefix):
            return False
    return True
