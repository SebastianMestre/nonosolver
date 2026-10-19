we will have 2 projects here
one is a solver for the game nonogram (black and white version)
one is a scraper for website nonorams.org/nonogram so we can get lots of nonogram problem instances to test our solver
create dirs scraper, solver, data, agent

data will be for storing input and output data for the programs
agent will be for storing anything u produce as intermediate result (development plan, agent-facing documentation, etc.)

scraper will be a uv python 3.15 project, code will be under scraper/src/ -- tests are probably not needed but should go under scraper/test/
output format for each puzzle should be a json object with keys { url, puzzle: {rows, cols}}, where each of (rows, cols) is a int[][], listing out the hints for each row and column respectively (for example { rows: [[1,2],[]], cols: [[1],[],[1],[1]]} would be the result for a particular 2 row by 4 column puzzle -- we should just end up with a large directory with one file per puzzle -- we will either want to have a manifest listing out all the puzzles, or a script for joining them up into single file that puts all of it in a json array, so that the web page can pull it easily. the scraper should follow good practices: check for robots.txt, use reasonable rate limiting with backoff, etc. perhaps some very well established python lib already does this idk.

solver will be a vanilla JS project. no bundler or anything. we will just serve using python bulitin http server (write a short shell script to launch under solver/deploy/).
we will use ES modules. It's a webpage where u can see the list of all puzzles. code under solver/src/pages/ and solver/src/solver/, tests under solver/test/. the solver will be configurable to enable/disable certain rules, so it will fail sometimes, leaving a partially solved puzzle. The page itself should basically have the full list of puzzles rendered out with the clues and the state that the solver finished the puzzle on. it should let the user zoom in and out, and interact with the puzzles. on a particular nonogram clicking on a cell should paint it, clicking on painted should unpaint, right click should cross/uncross it out (maybe u need to see the rules to make sense of this, they are on the nonograms.org/instructions). While a row or col is not yet solved, its hints should be grayed out. U may want to pull and save a screenshot of the nonograms.org puzzle widget so we can more or less copy how it looks. Note the site has ~35k puzzles so maybe rendering them all at once is unfeasible so we'd want some kind LOD thingy where when we zoom out enough each puzzle is replaced by a solid rectangle with some kinda color coding (green = solved. otherwise grayscale based on % of colored/crossed out cells. white=all unpainted). when we zoom back in the puzzle should be rendered and the state it was left in should come back. The puzzles should be loaded from the file the scraper generated.

set up git repo, an AGENTS.md and the file structure and tooling setup. maybe some basic skeleton for the different pieces.

the scraper code i want u to handle almost entirely.
the solver i wanna basically write myself.
the page UI code, i want u to handle too.

pls make sure u store this prompt in agent/
