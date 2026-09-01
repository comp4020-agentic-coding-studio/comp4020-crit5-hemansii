import { describe, expect, it } from "vitest";
import { FORMS, isHeavy, maxJumpHeight, type RobotForm } from "../src/scripts/game/forms";
import { rectsOverlap } from "../src/scripts/game/physics";
import { createRobot, setRobotForm } from "../src/scripts/game/robot";
import {
  createPuzzle,
  canAbsorb,
  gateCollider,
  isOnPlate,
  plateTop,
  updatePuzzle,
  GATE,
  PLATE_X,
  PLATE_WIDTH,
  PLATE_TOP,
  PUDDLE,
  type PuzzleState,
} from "../src/scripts/game/puzzle";
import { EXIT_SHELF, TRAIN_TOP } from "../src/scripts/game/circuit";
import { LEVELS } from "../src/scripts/game/levels";

/** Every form there is, so a new one cannot quietly skip the level's checks. */
const ALL_FORMS = Object.keys(FORMS) as RobotForm[];

const FLOOR_TOP = 128;

/** A body of the given form, resting with its feet on `feetY`. */
function body(form: RobotForm, x: number, feetY: number, grounded = true) {
  const spec = FORMS[form];
  return { form, grounded, x, y: feetY - spec.height, width: spec.width, height: spec.height };
}

/** Runs the puzzle forward, as the fixed-timestep loop would. */
function run(state: PuzzleState, b: ReturnType<typeof body>, seconds: number) {
  const dt = 1 / 120;
  let absorbed = false;
  let latched = false;
  for (let t = 0; t < seconds; t += dt) {
    const e = updatePuzzle(state, b, dt);
    absorbed ||= e.absorbed;
    latched ||= e.latched;
  }
  return { absorbed, latched };
}

describe("absorbing the puddle", () => {
  it("triggers when the dry robot walks into the water", () => {
    const state = createPuzzle();
    const b = body("dry", PUDDLE.x + 4, PUDDLE.y + PUDDLE.height);

    expect(canAbsorb(b, state)).toBe(true);
  });

  it("does not trigger from across the room", () => {
    const state = createPuzzle();
    const b = body("dry", 200, FLOOR_TOP);

    expect(canAbsorb(b, state)).toBe(false);
  });

  it("cannot be absorbed twice: the puddle drains and stays drained", () => {
    const state = createPuzzle();
    const b = body("dry", PUDDLE.x + 4, PUDDLE.y + PUDDLE.height);

    const first = run(state, b, 1.5);
    expect(first.absorbed).toBe(true);
    expect(state.puddleAmount).toBe(0);

    const second = run(state, b, 1.5);
    expect(second.absorbed).toBe(false);
  });

  it("is not offered to a robot that is already water", () => {
    const state = createPuzzle();
    const b = body("water", PUDDLE.x + 4, PUDDLE.y + PUDDLE.height);

    expect(canAbsorb(b, state)).toBe(false);
  });
});

describe("the pressure plate", () => {
  const onPlate = (form: RobotForm, state: PuzzleState) =>
    body(form, PLATE_X + 10, plateTop(state));

  it("knows when a body is standing on it", () => {
    const state = createPuzzle();

    expect(isOnPlate(onPlate("dry", state), state)).toBe(true);
    expect(isOnPlate(body("dry", 10, FLOOR_TOP), state)).toBe(false);
  });

  it("will not latch under the dry robot, however long it stands there", () => {
    const state = createPuzzle();
    const result = run(state, onPlate("dry", state), 6);

    expect(result.latched).toBe(false);
    expect(state.latched).toBe(false);
    expect(state.lightTouch).toBe(true);
    expect(state.gateOpenness).toBe(0);
  });

  it("still gives a little under the dry robot, so it reads as a moving part", () => {
    const state = createPuzzle();
    run(state, onPlate("dry", state), 2);

    expect(state.plateDepression).toBeGreaterThan(0.2);
    expect(state.plateDepression).toBeLessThan(0.5);
  });

  it("latches under the water form and opens the gate", () => {
    const state = createPuzzle();
    const result = run(state, onPlate("water", state), 4);

    expect(result.latched).toBe(true);
    expect(state.plateDepression).toBeGreaterThan(0.95);
    expect(state.gateOpenness).toBe(1);
  });

  it("stays latched after the robot steps off", () => {
    const state = createPuzzle();
    run(state, onPlate("water", state), 4);
    run(state, body("water", 10, FLOOR_TOP), 2);

    expect(state.latched).toBe(true);
    expect(state.gateOpenness).toBe(1);
  });

  it("waits for the signal to reach the gate before it opens", () => {
    const state = createPuzzle();
    run(state, onPlate("water", state), 0.2);

    expect(state.latched).toBe(true);
    expect(state.signal).toBeLessThan(1);
    expect(state.gateOpenness).toBe(0);
  });

  it("sinks flush with the floor once it latches", () => {
    const state = createPuzzle();
    expect(plateTop(state)).toBe(PLATE_TOP);

    run(state, onPlate("water", state), 4);
    expect(Math.round(plateTop(state))).toBe(FLOOR_TOP);
  });

  it("ignores a robot flying over it", () => {
    const state = createPuzzle();
    const airborne = body("water", PLATE_X + 10, plateTop(state), false);

    expect(isOnPlate(airborne, state)).toBe(false);
    run(state, airborne, 3);
    expect(state.latched).toBe(false);
  });
});

describe("the gate", () => {
  it("blocks the doorway until it opens, then stops colliding", () => {
    const state = createPuzzle();
    expect(gateCollider(state)).toEqual(GATE);

    run(state, body("water", PLATE_X + 10, plateTop(state)), 5);
    expect(gateCollider(state)).toBeNull();
  });

  it("is sealed from ceiling to floor, so no form can jump it", () => {
    const beam = LEVELS[0].platforms.find((p) => p.x === GATE.x && p.y === 0);
    expect(beam, "a door beam should sit above the gate").toBeDefined();

    // beam runs from the ceiling down to the top of the portcullis...
    expect(beam!.y).toBe(0);
    expect(beam!.y + beam!.height).toBe(GATE.y);
    // ...and the portcullis runs from there to the floor. No gap, no way over.
    expect(GATE.y + GATE.height).toBe(FLOOR_TOP);
    expect(beam!.x).toBe(GATE.x);
    expect(beam!.width).toBe(GATE.width);
  });
});

describe("form tuning", () => {
  it("makes the water form heavier and slower, but not helpless", () => {
    expect(isHeavy("dry")).toBe(false);
    expect(isHeavy("water")).toBe(true);
    expect(FORMS.water.moveSpeed).toBeLessThan(FORMS.dry.moveSpeed);
    expect(FORMS.water.gravity).toBeGreaterThan(FORMS.dry.gravity);
    expect(maxJumpHeight("water")).toBeLessThan(maxJumpHeight("dry"));
  });

  it("makes the water form visibly bigger", () => {
    expect(FORMS.water.width).toBeGreaterThan(FORMS.dry.width);
    expect(FORMS.water.height).toBeGreaterThan(FORMS.dry.height);
  });

  it("keeps the water form's jump only slightly lower, not crippled", () => {
    const ratio = maxJumpHeight("water") / maxJumpHeight("dry");
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(0.95);
  });
});

/**
 * Reachability. Every climb the level offers is listed here by the platforms
 * it runs between, and asserted to be comfortably inside BOTH forms' jump
 * height — comfortably meaning a real margin, not a pixel-perfect launch.
 * This is the guard against "some of the platforms are too high to reach".
 */
describe("every climb the levels ask for is within reach", () => {
  const MARGIN = 6;

  /**
   * Each level's climbs, written out by the surfaces they run between. This is
   * the guard against "some of the platforms are too high to reach", and it is
   * listed rather than derived because which climbs a level *asks* for is a
   * design fact, not something geometry can tell you.
   */
  const CLIMBS: Record<string, Array<[string, number, number]>> = {
    Water: [
      ["floor onto the puddle shelf", FLOOR_TOP, 98],
      ["shelf onto the upper platform", 98, 68],
      ["upper onto the top platform", 68, 40],
    ],
    Electricity: [
      ["floor onto the low shelf", FLOOR_TOP, 96],
      ["low shelf onto the high shelf", 96, 74],
      ["floor onto the locomotive's roof", FLOOR_TOP, TRAIN_TOP],
      ["the locomotive's roof onto the exit shelf", TRAIN_TOP, EXIT_SHELF.y],
    ],
    "Water and electricity": [
      ["floor onto the puddle shelf", FLOOR_TOP, 98],
      ["shelf onto the upper platform", 98, 68],
      ["floor onto the locomotive's roof", FLOOR_TOP, TRAIN_TOP],
      ["the locomotive's roof onto the exit shelf", TRAIN_TOP, EXIT_SHELF.y],
    ],
  };

  it("names every level, so a new one cannot skip the check", () => {
    expect(Object.keys(CLIMBS).sort()).toEqual(LEVELS.map((l) => l.name).sort());
  });

  it.each(LEVELS.map((l) => [l.name] as const))("%s: every climb clears every form", (name) => {
    for (const [what, from, to] of CLIMBS[name]) {
      const rise = from - to;
      expect(rise, `${what} should go up`).toBeGreaterThan(0);
      for (const form of ALL_FORMS) {
        expect(maxJumpHeight(form), `${what}: the ${form} form`).toBeGreaterThan(rise + MARGIN);
      }
    }
  });

  it.each(LEVELS.map((l) => [l.name, l] as const))(
    "%s: every platform it lists is a surface a climb lands on",
    (name, level) => {
      const tops = new Set(CLIMBS[name].map(([, , to]) => to));
      for (const p of level.platforms) {
        // The floor, the sealed door beam and the tunnel wall are not landings.
        if (p.y >= FLOOR_TOP || p.y === 0) continue;
        expect(tops, `nothing in ${name} climbs onto the platform at y=${p.y}`).toContain(p.y);
      }
    },
  );

  it("leaves the heavy form room to walk under the puddle shelf", () => {
    const shelf = LEVELS[0].platforms.find((p) => p.y === 98)!;
    const headroom = FLOOR_TOP - FORMS.water.height;

    // A 16px-thick shelf low enough to jump onto would be too low to duck
    // under; the thin shelf is what makes both true at once.
    expect(shelf.y + shelf.height).toBeLessThan(headroom);
  });
});


describe("changing form", () => {
  it("grows about the feet, so the robot never sinks into the floor", () => {
    const robot = createRobot(60, FLOOR_TOP - FORMS.dry.height);
    const feetBefore = robot.y + robot.height;

    setRobotForm(robot, "water");

    expect(robot.y + robot.height).toBe(feetBefore);
    expect(robot.height).toBe(FORMS.water.height);
  });

  it("grows about the centre line, so it does not lurch sideways", () => {
    const robot = createRobot(60, FLOOR_TOP - FORMS.dry.height);
    const centreBefore = robot.x + robot.width / 2;

    setRobotForm(robot, "water");

    expect(robot.x + robot.width / 2).toBe(centreBefore);
  });
});

describe("geometry helpers", () => {
  it("detects overlap only when the rectangles really intersect", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };

    expect(rectsOverlap(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 0, y: 10, width: 10, height: 10 })).toBe(false);
  });

  it("rests the puddle on a real surface rather than floating it", () => {
    const shelf = LEVELS[0].platforms.find(
      (p) =>
        PUDDLE.y + PUDDLE.height === p.y &&
        PUDDLE.x >= p.x &&
        PUDDLE.x + PUDDLE.width <= p.x + p.width,
    );
    expect(shelf, "the puddle should sit on top of a platform").toBeDefined();
  });

  it("puts the puddle off the floor, so the plate is met first walking right", () => {
    expect(PUDDLE.y + PUDDLE.height).toBeLessThan(FLOOR_TOP);
    expect(PUDDLE.x).toBeLessThan(PLATE_X);
  });

  it("runs the plate along the floor, upstream of the gate it drives", () => {
    expect(PLATE_TOP).toBeLessThan(FLOOR_TOP);
    expect(PLATE_X + PLATE_WIDTH).toBeLessThan(GATE.x);
  });
});
