# nonosolver

Two programs share this repo.

`scraper/` downloads black-and-white puzzles from https://www.nonograms.org/nonograms. It is a uv project on Python 3.15. Code is in `scraper/src/nonogram_scraper/`. Tests are in `scraper/test/`.

`solver/` is static pages. The browser loads ES modules from `solver/index.html` and `solver/puzzle.html`. `solver/deploy/serve.sh` serves the repo with Python's `http.server`. The overview reads `data/puzzles.json`. A single puzzle reads `data/puzzles/<id>.json`.

`data/puzzles/` holds one JSON file per puzzle. `data/puzzles.json` is those files joined into one array.

`agent/` holds the setup prompt, notes for later work, and a screenshot of the nonograms.org widget.

## Who writes what

The scraper and the page are part of this repo.
Solving rules live in `solver/src/solver/rules.js`. Sebastian writes those. Leave the rule bodies alone unless he asks for a change.

## Commits

A commit is one cohesive change. Do not bundle scattered edits into it.

## Puzzle JSON

```json
{
  "url": "https://www.nonograms.org/nonograms/i/83774",
  "puzzle": {
    "rows": [[1, 1], [3]],
    "cols": [[1], [3]]
  }
}
```

`rows[i]` lists the clues for row i from left to right. `cols[j]` lists the clues for column j from top to bottom. An empty line is `[]`.

## Commands

From `scraper/`:

```
uv run nonogram-scrape --limit 20
uv run nonogram-join
uv run pytest
```

`nonogram-scrape` writes `data/puzzles/<id>.json` and `data/puzzles/manifest.json`. The default gap between requests is one second, plus up to 0.3 seconds of jitter. A file that is already there is skipped. A restarted run continues at the next catalog page it finished. `--id 83774` fetches that puzzle and skips the catalog. `--refresh` downloads it again.

`nonogram-join` writes `data/puzzles.json`.

From the repo root, `solver/deploy/serve.sh` prints a URL. The page is `http://127.0.0.1:8000/solver/`.

Solver tests:

```
cd solver && node --test test/
```

## Crawl limits

`https://www.nonograms.org/robots.txt` allows `/nonograms` and `/nonograms/i/<id>`. It disallows `/nonogramprint/`, `/nonograms/size/`, `/search`, `/user`, and `/files/` (the thumbnails). The client reads robots.txt before anything else and also refuses those prefixes on its own. Catalog ids come from `table.nonogram_list`. The random puzzle in the sidebar sits outside that table, so a catalog page does not queue it.

A puzzle page does not include the grid as HTML. The clues are packed in a `var d` array, and the scraper decodes that array the same way the site's script does. A puzzle with more than one color is skipped. Five puzzle pages in a row that do not parse stop the run.

A full pass is the catalog (about 1400 pages) plus about 35,000 puzzle pages. At one request per second that is roughly ten hours.

## Page

Wheel zooms. Dragging empty space pans. Fit frames every puzzle. Left click paints a cell, and a second left click clears it. Right click crosses a cell, and a second right click clears it. Dragging keeps that same action.

Clues are black when the line is finished: every cell is filled or crossed, and the filled runs match the clues. Until then the clues are gray.

Zoomed out far enough that a cell would be under 8 pixels, each puzzle is a rectangle. Green means the puzzle is solved. White means nothing is marked. Other states are gray, darker as more cells are filled or crossed. Zooming back in draws the same cells again. Clicking a rectangle frames that puzzle.

The checkboxes are the entries in `RULES`. Solve again runs the solver from a blank grid. Clicking a puzzle title opens `puzzle.html?id=<id>`, which draws that same widget for one puzzle and starts from a blank grid. `custom.html` takes a width, a height, and one clue line per row and column, then draws that same widget from a blank grid. Step applies the highlighted rule, then moves the highlight to the next enabled rule, looping back to the first. To convergence runs the enabled rules until a full pass changes nothing. Clear restores the blank grid. Unchecking a rule skips it and leaves the cells as they are.
