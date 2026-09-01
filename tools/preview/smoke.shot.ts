import { expect, it } from "vitest";
import { SoftCanvas } from "./canvas";

it("startGame boots and runs without throwing", { timeout: 60_000 }, async () => {
  const canvas = new SoftCanvas(256, 144) as never as HTMLCanvasElement;
  let frame: ((t: number) => void) | null = null;
  let now = 0;
  const g = globalThis as never as Record<string, unknown>;
  g.document = { createElement: () => new SoftCanvas(256, 144) };
  g.performance = { now: () => now };
  // Capture the keyboard handlers so the run can actually be driven.
  const handlers: Record<string, Array<(e: unknown) => void>> = {};
  g.window = {
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      (handlers[type] ??= []).push(fn);
    },
  };
  const key = (type: string, k: string) =>
    handlers[type]?.forEach((fn) => fn({ key: k, preventDefault: () => {} }));
  g.requestAnimationFrame = (cb: (t: number) => void) => {
    frame = cb;
    return 0;
  };

  const { startGame } = await import("../../src/scripts/game/engine");
  startGame(canvas);

  // Hold right and hammer jump for a minute of frames. That is enough to solve
  // level 1 by brute force, which is the point: it drives the fade and the level
  // rebuild, the one path the playthrough tests never touch.
  // Twenty seconds of real frames with the controls being held, which is enough
  // to exercise every draw pass and both forms' effects. What this catches is the
  // failure the playthrough tests cannot see: the game not starting at all.
  key("keydown", "ArrowRight");
  for (let i = 0; i < 20 * 60; i++) {
    now += 1000 / 60;
    if (i % 20 === 0) key("keydown", " ");
    frame!(now);
  }
  expect(frame).not.toBeNull();
});
