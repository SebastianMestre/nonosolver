# nonosolver

Black-and-white nonograms. The scraper downloads puzzles from [nonograms.org](https://www.nonograms.org/nonograms). The page runs a solver on them and shows the grids.

```
cd scraper
uv run nonogram-scrape --limit 20
uv run nonogram-join
```

```
solver/deploy/serve.sh
```

Then open http://127.0.0.1:8000/solver/

Layout, crawl rules, and who writes the solver are in `AGENTS.md`.
