import { mountPlayer } from "./player.js";

const player = mountPlayer();
const statusEl = document.querySelector("#status");
const puzzleIdEl = document.querySelector("#puzzle-id");

loadPuzzle();

async function loadPuzzle() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || !/^\d+$/.test(id)) {
    player.note("missing puzzle id");
    return;
  }
  puzzleIdEl.textContent = `#${id}`;
  document.title = `#${id}`;
  const url = new URL(`../data/puzzles/${id}.json`, window.location.href);
  statusEl.textContent = "loading…";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await response.json();
    player.setPuzzle(payload.puzzle, id);
  } catch (error) {
    player.note(`could not load ${url.pathname}: ${error.message}`);
  }
}
