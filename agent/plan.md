# Notes for later work

The setup prompt is in `agent/prompt.md`.

## Layout

```
scraper/src/nonogram_scraper/   crawler
scraper/test/
solver/index.html
solver/src/pages/               canvas page
solver/src/solver/              rule runner and line checks
solver/test/
solver/deploy/serve.sh
data/puzzles/<id>.json
data/puzzles/manifest.json
data/puzzles.json               array the page fetches
agent/reference/nonogram-widget.png
```

The git repo was already initialized at the root. Python dependencies are in `scraper/uv.lock`. The page has no npm dependencies. `solver/package.json` only sets `"type": "module"` so Node can run the tests.

## Scraper

httpx does the requests. BeautifulSoup (`html.parser`) reads the HTML. `urllib.robotparser` reads robots.txt. The delay, jitter, and backoff live in `policy.py` so they can be tested without the network.

Catalog page 1 is `https://www.nonograms.org/nonograms`. Page n is `/nonograms/p/n`. Puzzle pages are `/nonograms/i/<id>`. Colour puzzles are under `/nonograms2/` and are out of scope.

A puzzle page leaves the grid out of the HTML. The script tag `var d=[...]` is what `https://www.nonograms.org/js/nonogram.min.062.js` draws from. `decode.py` follows that script: width and height are the `D` and `C` expressions, and the runs are the loop that fills `E`. One color is black and white. More than one color is rejected. Clue order is left to right and top to bottom. An empty line is `[]`.

`parse.py` still accepts the table that script builds (`td#nmv{column}_{k}`, `td#nmh{k}_{row}`), which is what the HTML fixtures use. Empty header cells have no id. A lone 0 is `[]`.

`--limit` counts newly saved files. Existing files stay in the manifest and do not count. A puzzle page that fails to parse is logged and left unwritten, so a later run tries it again.

`nonogram-join` orders ids by the manifest, then appends any extra files by id descending. The array file is compact JSON. The per-puzzle files are indented.

## Solver

`solve(puzzle, options)` in `solver/src/solver/solve.js` builds a grid of 0s and runs every enabled rule until none of them report a change, or 400 passes. A rule that returns true without editing a cell will burn the cap.

Cell values, shared by the page:

- 0 unknown
- 1 filled
- 2 crossed

`line.js` decides when a line is finished. The page uses that for gray clues and for the green block. The rule file can import it.

Add a rule by appending an object to `RULES`:

```js
{
  id: "overlap",
  label: "Simple overlap",
  apply({ puzzle, grid }) {
    return false;
  },
}
```

The toolbar builds one checkbox per entry. `options.rules` is `{ id: boolean }`.

## Page

One canvas. Puzzles are packed into rows about 3200 world-pixels wide. A cell is 18 world pixels, matching the site's normal size. The clue header is at least one cell. Column clues sit on the bottom of the header. Row clues sit on the right.

Camera: screen = world * scale + origin. Wheel zooms toward the cursor. Below a cell size of 8 screen pixels, `view.js` draws a rectangle instead of the grid. The rectangle color is cached until that puzzle's cells change.

`lodColor`:

- solved: `#2f9d55`
- nothing marked: `#ffffff`
- otherwise gray from white toward `#505050` by the fraction of filled or crossed cells

Clicking a rectangle frames that puzzle and, if it still would not fit with 8-pixel cells, zooms to 8-pixel cells and lets the user pan.

Serve from the repo root. The page requests `../data/puzzles.json` relative to `/solver/` or `/solver/index.html`.

## Widget colors

Copied from `https://static.nonograms.org/css/style.049.static.en.css` (the `nonogram_table` rules):

- outer border 2px `#000`
- cell 18 by 17, border `#8f8f8f`
- number cell background `#d0d0d0`, border `#808080`
- empty header cell `#dadada`
- number text 11px Verdana
- every 5th row and column gets a 2px border (`nmt_tr5`, `nmt_td5`)

`agent/reference/nonogram-widget.png` is puzzle #83774. The capture background was black and the cells are transparent on the site, so the grid in that file looks filled in. On the site the cells are white until painted.

Filled cells on our page are `#111`. A cross is an X in `#444`.
