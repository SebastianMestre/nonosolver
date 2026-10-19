# scraper

uv project on Python 3.15. Downloads black-and-white puzzles from nonograms.org into `../data/puzzles/`.

```
uv run nonogram-scrape --limit 20
uv run nonogram-join
uv run pytest
```

The default pause is one second between requests, plus a little jitter. Files already saved are skipped. `--id 83774` fetches that puzzle and skips the catalog. `nonogram-join` writes `../data/puzzles.json`.
