# nonosolver

Black-and-white nonograms. The scraper downloads puzzles from [nonograms.org](https://www.nonograms.org/nonograms). The page runs a solver on them and shows the grids.

## Get some puzzles on the page

Install [uv](https://docs.astral.sh/uv/). The first `uv run` below installs Python 3.15 for the scraper.

From `scraper/`:

```
uv run nonogram-scrape --limit 20
uv run nonogram-join
```

`nonogram-scrape` writes one JSON file per puzzle in `data/puzzles/`. It waits about a second between requests. `--limit 20` stops after 20 new puzzles, which is enough to look at the page. The overview does not read those files. `nonogram-join` writes `data/puzzles.json`, and that is the file the overview loads.

From the repo root, start the page. This uses whatever `python3` is on your machine:

```
solver/deploy/serve.sh
```

It prints a URL. Open http://127.0.0.1:8000/solver/

The full catalog is about 35,000 puzzles. At one request per second that is roughly ten hours. Leave off `--limit` for that run. A restarted scrape continues at the next catalog page and skips files already saved. Run `nonogram-join` again when you want the new files on the page.

Layout, crawl rules, and who writes the solver are in `AGENTS.md`.
