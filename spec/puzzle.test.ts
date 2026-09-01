import { describe, expect, it } from "vitest";
import { FORMS, isHeavy, type RobotForm } from "../src/scripts/game/forms";
import { createRobot, setRobotForm } from "../src/scripts/game/robot";
import {
  createPuzzle,
  canAbsorb,
  gateCollider,
  isOnPlate,
  plateTop,
  rectsOverlap,
  updatePuzzle,
  GATE,
  PLATE_X,
  PLATE_WIDTH,
  PLATE_TOP,
  PUDDLE,
  type PuzzleState,
} from "../src/scripts/game/puzzle";
import { platforms } from "../src/scripts/game/world";

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
    const b = body("dry", PUDDLE.x + 4, FLOOR_TOP);

    expect(canAbsorb(b, state)).toBe(true);
  });

  it("does not trigger from across the room", () => {
    const state = createPuzzle();
    const b = body("dry", 200, FLOOR_TOP);

    expect(canAbsorb(b, state)).toBe(false);
  });

  it("cannot be absorbed twice: the puddle drains and stays drained", () => {
    const state = createPuzzle();
    const b = body("dry", PUDDLE.x + 4, FLOOR_TOP);

    const first = run(state, b, 1.5);
    expect(first.absorbed).toBe(true);
    expect(state.puddleAmount).toBe(0);

    const second = run(state, b, 1.5);
    expect(second.absorbed).toBe(false);
  });

  it("is not offered to a robot that is already water", () => {
    const state = createPuzzle();
    const b = body("water", PUDDLE.x + 4, FLOOR_TOP);

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

  it("is sealed from ceiling to floor, so neither form can jump it", () => {
    const beam = platforms.find((p) => p.x === GATE.x && p.y === 0);
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
  const maxJumpHeight = (form: RobotForm) => {
    const { jumpVelocity, gravity } = FORMS[form];
    return (jumpVelocity * jumpVelocity) / (2 * gravity);
  };

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

  /**
   * The puzzle is only solvable if the heavy form can still climb the steps
   * behind the gate. This pins that down against future tuning.
   */
  it("leaves the water form able to climb everything the puzzle requires", () => {
    const step = platforms.find((p) => p.x === 206)!;
    const ledge = platforms.find((p) => p.x === 224)!;

    const ontoStep = FLOOR_TOP - step.y;
    const ontoLedge = step.y - ledge.y;

    expect(ontoStep).toBeGreaterThan(0);
    expect(ontoLedge).toBeGreaterThan(0);
    expect(maxJumpHeight("water")).toBeGreaterThan(ontoStep + 4);
    expect(maxJumpHeight("water")).toBeGreaterThan(ontoLedge + 4);
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

  it("puts the puddle and the plate on the floor, not floating above it", () => {
    expect(PUDDLE.y + PUDDLE.height).toBe(FLOOR_TOP);
    expect(PLATE_TOP).toBeLessThan(FLOOR_TOP);
    expect(PLATE_X + PLATE_WIDTH).toBeLessThan(GATE.x);
  });
});
