import { startGame, type GameState } from "./game/engine";
import { LEVELS } from "./game/levels";

const canvas = document.getElementById("game");
if (canvas instanceof HTMLCanvasElement) {
  const game = startGame(canvas);
  wireSidebar(game);
}

function wireSidebar(game: ReturnType<typeof startGame>): void {
  const $ = <T extends Element>(id: string) => document.getElementById(id) as T | null;

  const play = $<HTMLButtonElement>("play");
  const replay = $<HTMLButtonElement>("replay");
  const overlay = $<HTMLElement>("overlay");
  const tally = $<HTMLElement>("tally");

  play?.addEventListener("click", () => {
    game.play();
    canvas?.focus();
  });
  replay?.addEventListener("click", () => game.replay());

  // A level is selectable once it has been reached: the one being played, and
  // anything already cleared, so a level can be gone back to.
  document.querySelectorAll<HTMLElement>(".level").forEach((item) => {
    item.querySelector("button")?.addEventListener("click", () => {
      if (item.classList.contains("is-locked")) return;
      game.goToLevel(Number(item.dataset.level));
    });
  });

  game.onChange((state: GameState) => {
    if (play) {
      play.textContent = state.levelIndex > 0 || state.cleared.some(Boolean) ? "Continue" : "Play";
      play.hidden = state.running;
    }
    if (replay) replay.hidden = !state.complete;
    if (overlay) {
      // On screen whenever there is a button to press. Only dim the game behind
      // it when paused: dimming the finish would hide the confetti.
      overlay.hidden = state.running && !state.complete;
      overlay.classList.toggle("is-dim", !state.running);
    }
    if (tally) tally.textContent = `${state.cleared.filter(Boolean).length} / ${LEVELS.length}`;

    document.querySelectorAll<HTMLElement>(".level").forEach((item) => {
      const i = Number(item.dataset.level);
      const cleared = state.cleared[i];
      const current = i === state.levelIndex && !state.complete;
      // Reachable if cleared, current, or the one straight after a cleared level.
      const unlocked = cleared || current || (i > 0 && state.cleared[i - 1]);
      item.classList.toggle("is-done", cleared);
      item.classList.toggle("is-current", current);
      item.classList.toggle("is-locked", !unlocked);
      const mark = item.querySelector(".level-mark");
      if (mark) mark.textContent = cleared ? "✓" : current ? "▶" : String(i + 1);
    });
  });
}
