import { describe, expect, it } from "vitest";
import { FIXED_DT } from "../src/scripts/game/constants";
import type { Controls } from "../src/scripts/game/input";
import { createWorld, stepWorld, type World } from "../src/scripts/game/sim";
import { LEVELS } from "../src/scripts/game/levels";
import { EXIT_SHELF, TRAIN_HOME_X, TRAIN_TOP, trainAtRest } from "../src/scripts/game/circuit";
import { setRobotForm } from "../src/scripts/game/robot";

/**
 * The levels, played rather than measured.
 *
 * `spec/puzzle.test.ts` and `spec/circuit.test.ts` check the geometry: every
 * climb is inside a jump, every wall is where it should be. None of that proves
 * a level is *finishable* — the last two respacings both passed arithmetic and
 * left a climb that could not actually be made, because a shelf's own underside
 * was in the way. So these drive the real simulation with a scripted controller
 * and walk each level to its exit. If a change breaks a route, the failure names
 * the step that stopped working.
 */

/** A controller a script can hold buttons on, in place of a keyboard. */
class ScriptedControls implements Controls {
  direction: -1 | 0 | 1 = 0;
  private jumpQueued = false;

  get moveDirection(): -1 | 0 | 1 {
    return this.direction;
  }

  consumeJump(): boolean {
    if (!this.jumpQueued) return false;
    this.jumpQueued = false;
    return true;
  }

  jump(): void {
    this.jumpQueued = true;
  }
}

const feetOf = (w: World) => w.robot.y + w.robot.height;

/** A driver for one level: hold buttons, wait for things to happen. */
function play(levelIndex: number) {
  const world = createWorld(levelIndex);
  const pad = new ScriptedControls();

  /** Runs the game until `done`, or gives up. Returns whether it got there. */
  const until = (done: (w: World) => boolean, seconds = 16): boolean => {
    const steps = Math.round(seconds / FIXED_DT);
    for (let i = 0; i < steps; i++) {
      stepWorld(world, pad, FIXED_DT);
      if (done(world)) return true;
    }
    return false;
  };

  return { world, pad, until };
}

/** Absorbing the puddle, from a standing start on the floor to its left. */
function takeTheWater(p: ReturnType<typeof play>) {
  const { pad, until, world } = p;
  pad.direction = 1;
  expect(until((w) => w.robot.x >= 96), "should reach the plate").toBe(true);
  pad.direction = 0;
  expect(until((w) => w.puzzle!.lightTouch, 2), "the plate should notice it").toBe(true);
  expect(world.puzzle!.latched, "but not latch under the dry form").toBe(false);

  pad.direction = -1;
  expect(until((w) => w.robot.x <= 34), "should walk back left of the shelf").toBe(true);
  pad.direction = 1;
  pad.jump();
  expect(until((w) => w.robot.form === "water"), "should absorb the puddle").toBe(true);
}

/** Getting onto the exit shelf, once the locomotive has parked under it. */
function climbToTheShelf(p: ReturnType<typeof play>) {
  const { pad, until } = p;
  pad.direction = 1;
  pad.jump();
  expect(until((w) => feetOf(w) === TRAIN_TOP, 4), "should land on the roof").toBe(true);

  // Along the roof, clear of the shelf's own underside, before jumping.
  expect(
    until((w) => w.robot.x >= EXIT_SHELF.x + EXIT_SHELF.width, 3),
    "should get clear of the shelf overhead",
  ).toBe(true);
  pad.direction = 0;
  pad.jump();
  // Straight up first, then steer across: the shelf is entered from above.
  expect(until((w) => feetOf(w) < EXIT_SHELF.y, 2), "should clear the shelf's top").toBe(true);
  // Steer left only until it is over the shelf: it is 20px wide, and holding
  // left through the fall carries you straight past it.
  pad.direction = -1;
  expect(
    until((w) => w.robot.x + w.robot.width / 2 < EXIT_SHELF.x + EXIT_SHELF.width, 2),
    "should steer over the shelf",
  ).toBe(true);
  pad.direction = 0;
  expect(until((w) => feetOf(w) === EXIT_SHELF.y, 3), "should land on the shelf").toBe(true);
}

describe("level 1: water", () => {
  it("presses the plate with the water form, and walks out of the gate it opens", () => {
    const p = play(0);
    const { world, pad, until } = p;

    takeTheWater(p);

    pad.direction = 1;
    expect(until((w) => w.robot.x >= 104), "should carry the water to the plate").toBe(true);
    pad.direction = 0;
    expect(until((w) => w.puzzle!.latched, 3), "the plate should latch").toBe(true);
    expect(until((w) => w.puzzle!.gateOpenness === 1, 5), "the gate should open").toBe(true);

    pad.direction = 1;
    expect(until((w) => w.finished), "should reach the exit").toBe(true);
    expect(world.robot.x).toBeGreaterThan(LEVELS[0].exit.x - world.robot.width);
  });
});

describe("level 2: electricity", () => {
  it("charges up, wakes the locomotive, and rides its roof to the exit", () => {
    const p = play(1);
    const { pad, until } = p;

    pad.direction = 1;
    expect(until((w) => w.robot.form === "electric"), "should charge up").toBe(true);
    expect(until((w) => w.circuit!.powered), "should wake the locomotive").toBe(true);

    pad.direction = 0; // it shoves the robot out of the tunnel ahead of it
    expect(until((w) => trainAtRest(w.circuit!), 4), "it should drive out and stop").toBe(true);

    climbToTheShelf(p);

    pad.direction = 1;
    expect(until((w) => w.finished, 4), "should reach the exit on the shelf").toBe(true);
  });
});

describe("level 3: water, then electricity", () => {
  it("opens the gate as water, then swaps to charge for the locomotive", () => {
    const p = play(2);
    const { world, pad, until } = p;

    takeTheWater(p);

    pad.direction = 1;
    expect(until((w) => w.robot.x >= 104), "should carry the water to the plate").toBe(true);
    pad.direction = 0;
    expect(until((w) => w.puzzle!.gateOpenness === 1, 8), "the gate should open").toBe(true);

    // Through the gate and into the battery. The water goes; the charge arrives.
    pad.direction = 1;
    expect(until((w) => w.robot.form === "electric"), "should charge up").toBe(true);
    expect(world.robot.form, "the water should be replaced, not carried too").toBe("electric");

    expect(until((w) => w.circuit!.powered), "should wake the locomotive").toBe(true);
    pad.direction = 0;
    expect(until((w) => trainAtRest(w.circuit!), 4), "it should drive out and stop").toBe(true);

    climbToTheShelf(p);

    pad.direction = 1;
    expect(until((w) => w.finished, 4), "should reach the final exit").toBe(true);
  });

  it("cannot open the gate after swapping to charge: the plate wants weight", () => {
    const p = play(2);
    const { world } = p;

    setRobotForm(world.robot, "electric");
    const { until, pad } = p;
    pad.direction = 1;
    until((w) => w.robot.x >= 110, 6);
    pad.direction = 0;
    until(() => false, 4);

    expect(world.puzzle!.latched, "the charged form is too light for it").toBe(false);
    expect(world.puzzle!.gateOpenness).toBe(0);
  });
});

describe("the shelf route cannot be short-cut", () => {
  /**
   * The test below paces the floor, which missed a real bug: level 2 had a shelf
   * nearly level with the exit shelf, and a running jump off it crossed the gap.
   * So try launching from every surface in the level, not just the floor.
   */
  it.each(LEVELS.flatMap((l, i) => (l.circuit ? [[l.name, i] as const] : [])))(
    "%s: no platform in the level is a launch pad to the exit",
    (_name, index) => {
      const level = LEVELS[index];

      for (const platform of level.platforms) {
        // Walls run to the ceiling; their "top" is not a place to stand.
        if (platform === EXIT_SHELF || platform.y === 0) continue;
        for (const towards of [-1, 1] as const) {
          const { world, pad } = play(index);
          if (world.puzzle) {
            world.puzzle.latched = true;
            world.puzzle.signal = 1;
            world.puzzle.gateOpenness = 1;
          }
          world.circuit!.batteryCharge = 0;
          setRobotForm(world.robot, "electric");

          // Stand on this platform, at the edge it would run from.
          const w = world.robot.width;
          world.robot.x = towards > 0 ? platform.x + platform.width - w : platform.x;
          world.robot.y = platform.y - world.robot.height;
          world.robot.vx = 0;
          world.robot.vy = 0;

          // Run at the exit and jump on every frame it can, for four seconds.
          pad.direction = towards;
          for (let i = 0; i < 120 * 4; i++) {
            pad.jump();
            stepWorld(world, pad, FIXED_DT);
            world.circuit!.powered = false;
            world.circuit!.arc = 0;
            world.circuit!.trainX = TRAIN_HOME_X;
          }

          expect(
            world.finished,
            `launching ${towards > 0 ? "right" : "left"} off the platform at ` +
              `(${platform.x}, ${platform.y}) reached the exit with the train asleep`,
          ).toBe(false);
        }
      }
    },
  );

  it.each(LEVELS.flatMap((l, i) => (l.circuit ? [[l.name, i] as const] : [])))(
    "%s: the exit is out of reach while the locomotive is still asleep",
    (_name, index) => {
      const { world, pad } = play(index);

      // Open any gate, hand the robot its best jump, and pin the locomotive in
      // its tunnel — then let it try everything it has for twenty seconds.
      if (world.puzzle) {
        world.puzzle.latched = true;
        world.puzzle.signal = 1;
        world.puzzle.gateOpenness = 1;
      }
      world.circuit!.batteryCharge = 0;
      setRobotForm(world.robot, "electric");

      let visitedTheRoom = false;
      pad.direction = 1;
      for (let i = 0; i < 120 * 20; i++) {
        pad.jump();
        stepWorld(world, pad, FIXED_DT);

        // Hold the locomotive asleep, so the question stays "before it moves".
        world.circuit!.powered = false;
        world.circuit!.arc = 0;
        world.circuit!.trainX = TRAIN_HOME_X;

        if (world.robot.x > EXIT_SHELF.x) visitedTheRoom = true;
        // Pace the room, so an approach from either side gets tried.
        if (world.robot.x > 240) pad.direction = -1;
        if (world.robot.x < 20) pad.direction = 1;
      }

      expect(visitedTheRoom, "the run should have explored past the gate").toBe(true);
      expect(world.finished, "the exit should only be reachable off the roof").toBe(false);
    },
  );
});
