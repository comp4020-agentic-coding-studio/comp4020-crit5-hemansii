import { startGame } from "./game/engine";

const canvas = document.getElementById("game");
if (canvas instanceof HTMLCanvasElement) {
  startGame(canvas);
}
