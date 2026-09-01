import { describe, expect, it } from "vitest";
import {
  FORMS,
  isCharged,
  isHeavy,
  maxJumpHeight,
  type RobotForm,
} from "../src/scripts/game/forms";
import { rectsOverlap } from "../src/scripts/game/physics";
import { createRobot, setRobotForm } from "../src/scripts/game/robot";
import { GATE } from "../src/scripts/game/puzzle";
import {
  createCircuit,
  canCharge,
  canPower,
  trainAtRest,
  trainRect,
  updateCircuit,
  EXIT_SHELF,
  RAIL_END,
  TRAIN_HEIGHT,
  TRAIN_HOME_X,
  TRAIN_STOP_X,
  TRAIN_TOP,
  TRAIN_WIDTH,
  TUNNEL_MOUTH,
  TUNNEL_WALL,
  type CircuitState,
} from "../src/scripts/game/circuit";
import { LEVELS } from "../src/scripts/game/levels";

/** Every level that has the electric mechanism, so both placements are checked. */
const ELECTRIC_LEVELS = LEVELS.filter((l) => l.circuit !== null);
const LEVEL = ELECTRIC_LEVELS[0];
const BATTERY = LEVEL.circuit!.battery;
const createCircuitFor = (level = LEVEL) => createCircuit(level.circuit!);

const FLOOR_TOP = 128;
const ALL_FORMS = Object.keys(FORMS) as RobotForm[];

/** A body of the given form, resting with its feet on `feetY`. */
function body(form: RobotForm, x: number, feetY: number, grounded = true) {
  const spec = FORMS[form];
  return { form, grounded, x, y: feetY - spec.height, width: spec.width, height: spec.height };
}

/** Runs the circuit forward, as the fixed-timestep loop would. */
function run(state: CircuitState, b: ReturnType<typeof body>, seconds: number) {
  const dt = 1 / 120;
  let charged = false;
  let powered = false;
  let travelled = 0;
  for (let t = 0; t < seconds; t += dt) {
    const e = updateCircuit(state, b, dt);
    charged ||= e.charged;
    powered ||= e.powered;
    travelled += e.trainDx;
  }
  return { charged, powered, travelled };
}

/** Standing against the sleeping locomotive's nose, as walking right leaves you. */
const atTheNose = (form: RobotForm) =>
  body(form, TRAIN_HOME_X - FORMS[form].width, FLOOR_TOP);

describe("absorbing the battery", () => {
  it("triggers when an uncharged robot walks into it", () => {
    const state = createCircuitFor();

    expect(canCharge(body("dry", BATTERY.x - 4, FLOOR_TOP), state)).toBe(true);
  });

  it("takes the water form's charge too: a form is replaced, not stacked", () => {
    const state = createCircuitFor();

    expect(canCharge(body("water", BATTERY.x - 4, FLOOR_TOP), state)).toBe(true);
  });

  it("does not trigger from across the room", () => {
    const state = createCircuitFor();

    expect(canCharge(body("dry", BATTERY.x + BATTERY.width + 40, FLOOR_TOP), state)).toBe(false);
  });

  it("is not offered to a robot that is already carrying charge", () => {
    const state = createCircuitFor();

    expect(canCharge(body("electric", BATTERY.x - 4, FLOOR_TOP), state)).toBe(false);
  });

  it("cannot be absorbed twice: the cell drains and stays spent", () => {
    const state = createCircuitFor();
    const b = body("water", BATTERY.x - 4, FLOOR_TOP);

    const first = run(state, b, 1.5);
    expect(first.charged).toBe(true);
    expect(state.batteryCharge).toBe(0);

    const second = run(state, b, 1.5);
    expect(second.charged).toBe(false);
  });

  it("sits beyond the portcullis on any level that has one", () => {
    for (const level of ELECTRIC_LEVELS.filter((l) => l.water)) {
      expect(level.circuit!.battery.x).toBeGreaterThanOrEqual(GATE.x + GATE.width);
    }
  });

  it("rests on the floor rather than floating above it, on every level", () => {
    for (const level of ELECTRIC_LEVELS) {
      expect(level.circuit!.battery.y + level.circuit!.battery.height).toBe(FLOOR_TOP);
    }
  });
});

describe("the charged form", () => {
  it("carries charge, where neither other form does", () => {
    expect(isCharged("electric")).toBe(true);
    expect(isCharged("dry")).toBe(false);
    expect(isCharged("water")).toBe(false);
  });

  it("replaces the water form outright, rather than adding to it", () => {
    const robot = createRobot(60, FLOOR_TOP - FORMS.dry.height);
    setRobotForm(robot, "water");
    expect(isHeavy(robot.form)).toBe(true);

    setRobotForm(robot, "electric");

    expect(robot.form).toBe("electric");
    // The weight the water gave it is gone with the water.
    expect(isHeavy(robot.form)).toBe(false);
    expect(robot.width).toBe(FORMS.electric.width);
    expect(robot.height).toBe(FORMS.electric.height);
  });

  it("shrinks about its feet, so losing the water does not drop it through the floor", () => {
    const robot = createRobot(60, FLOOR_TOP - FORMS.dry.height);
    setRobotForm(robot, "water");
    const feet = robot.y + robot.height;
    const centre = robot.x + robot.width / 2;

    setRobotForm(robot, "electric");

    expect(robot.y + robot.height).toBe(feet);
    expect(robot.x + robot.width / 2).toBe(centre);
  });

  it("is too light for the pressure plate, so it cannot stand in for the water form", () => {
    expect(isHeavy("electric")).toBe(false);
  });

  it("is quicker and springier than the dry form, which is what it trades weight for", () => {
    expect(FORMS.electric.moveSpeed).toBeGreaterThan(FORMS.dry.moveSpeed);
    expect(maxJumpHeight("electric")).toBeGreaterThan(maxJumpHeight("dry"));
  });
});

describe("powering the locomotive", () => {
  it("ignores a robot with no charge, however long it leans on the engine", () => {
    for (const form of ["dry", "water"] as RobotForm[]) {
      const state = createCircuitFor();
      const result = run(state, atTheNose(form), 4);

      expect(result.powered, `the ${form} form should not wake it`).toBe(false);
      expect(state.powered).toBe(false);
      expect(state.trainX).toBe(TRAIN_HOME_X);
    }
  });

  it("wakes under a charged robot touching it", () => {
    const state = createCircuitFor();

    expect(canPower(atTheNose("electric"), state)).toBe(true);
  });

  it("is not woken from across the room", () => {
    const state = createCircuitFor();

    expect(canPower(body("electric", BATTERY.x, FLOOR_TOP), state)).toBe(false);
  });

  it("runs the charge down the rail before a wheel turns", () => {
    const state = createCircuitFor();
    run(state, atTheNose("electric"), 0.15);

    expect(state.powered).toBe(true);
    expect(state.arc).toBeLessThan(1);
    expect(state.trainX).toBe(TRAIN_HOME_X);
  });

  it("then drives out of its tunnel and stops at its mark", () => {
    const state = createCircuitFor();
    const result = run(state, atTheNose("electric"), 4);

    expect(result.powered).toBe(true);
    expect(result.travelled).toBeLessThan(0); // it only ever drives out
    expect(state.trainX).toBe(TRAIN_STOP_X);
    expect(trainAtRest(state)).toBe(true);
  });

  it("stays put once it has arrived, and never rolls back", () => {
    const state = createCircuitFor();
    run(state, atTheNose("electric"), 4);
    run(state, body("electric", 40, FLOOR_TOP), 4);

    expect(state.trainX).toBe(TRAIN_STOP_X);
    expect(state.powered).toBe(true);
  });

  it("does not need the robot to stay: the charge was handed over, not held", () => {
    const state = createCircuitFor();
    run(state, atTheNose("electric"), 0.4);
    const result = run(state, body("dry", 40, FLOOR_TOP), 4);

    expect(result.powered).toBe(false); // it was already awake
    expect(state.trainX).toBe(TRAIN_STOP_X);
  });

  it("rides a rail that reaches from its mark to the back of its tunnel", () => {
    for (const level of ELECTRIC_LEVELS) {
      expect(level.circuit!.railX).toBeLessThanOrEqual(TRAIN_STOP_X);
    }
    expect(RAIL_END).toBeGreaterThanOrEqual(TRAIN_HOME_X + TRAIN_WIDTH);
  });
});

describe("the tunnel it sleeps in", () => {
  it("hides the sleeping locomotive under a wall, with no headroom on its roof", () => {
    // The wall's underside and the locomotive's roof are the same line: there is
    // no gap to stand in, so the roof is not a step until the train drives out.
    expect(TUNNEL_WALL.y + TUNNEL_WALL.height).toBe(TRAIN_TOP);
    expect(TUNNEL_MOUTH.height).toBe(TRAIN_HEIGHT);
    expect(TRAIN_HOME_X).toBeGreaterThanOrEqual(TUNNEL_WALL.x);
    expect(TRAIN_HOME_X + TRAIN_WIDTH).toBeLessThanOrEqual(TUNNEL_WALL.x + TUNNEL_WALL.width);
  });

  it("is a wall to the ceiling, so its own roof is never a platform", () => {
    // A thin tunnel roof would be a shelf in its own right, and standing on it
    // would reach the exit without ever waking the train.
    expect(TUNNEL_WALL.y).toBe(0);
  });

  it("leaves the robot room to walk in and touch the engine", () => {
    for (const form of ALL_FORMS) {
      expect(FORMS[form].height, `the ${form} form should fit under the wall`).toBeLessThan(
        TUNNEL_MOUTH.height,
      );
    }
  });

  it("is part of the level's collision, not just its scenery", () => {
    for (const level of ELECTRIC_LEVELS) {
      expect(level.platforms).toContain(TUNNEL_WALL);
      expect(level.platforms).toContain(EXIT_SHELF);
    }
  });
});

describe("the route the locomotive opens", () => {
  const MARGIN = 6;

  it("is out of reach of every form from the floor", () => {
    const rise = FLOOR_TOP - EXIT_SHELF.y;
    for (const form of ALL_FORMS) {
      expect(maxJumpHeight(form), `the ${form} form should not reach it`).toBeLessThan(
        rise - MARGIN,
      );
    }
  });

  it("is within every form's reach from the locomotive's roof", () => {
    const rise = TRAIN_TOP - EXIT_SHELF.y;
    expect(rise).toBeGreaterThan(0);
    for (const form of ALL_FORMS) {
      expect(maxJumpHeight(form), `the ${form} form should clear it`).toBeGreaterThan(
        rise + MARGIN,
      );
    }
  });

  /**
   * The trap this catches is the one the puddle shelf taught: a climb can be
   * within the jump and still impossible, because the shelf's own underside is
   * in the way. Getting onto the exit shelf means standing somewhere on the
   * parked roof that is clear of BOTH the shelf's footprint and the wall — jump
   * straight up there, then drift across. If that strip closes, the route dies.
   */
  it("leaves every form a launch strip on the parked roof, clear of shelf and wall", () => {
    const parked = trainRect({ ...createCircuitFor(), trainX: TRAIN_STOP_X });

    for (const form of ALL_FORMS) {
      const width = FORMS[form].width;
      // Left-most footing whose whole body clears the shelf above it...
      const from = Math.max(parked.x, EXIT_SHELF.x + EXIT_SHELF.width);
      // ...and right-most that still keeps clear of the wall.
      const to = Math.min(parked.x + parked.width, TUNNEL_WALL.x) - width;

      expect(to - from, `the ${form} form needs somewhere to launch from`).toBeGreaterThan(2);
      // Standing there really is standing on the roof, and really is clear.
      const stance = { x: from, y: TRAIN_TOP - FORMS[form].height, width, height: FORMS[form].height };
      expect(rectsOverlap(stance, parked)).toBe(false);
      expect(rectsOverlap(stance, TUNNEL_WALL)).toBe(false);
      expect(stance.x + stance.width).toBeGreaterThan(parked.x);
      expect(stance.x).toBeLessThan(parked.x + parked.width);
    }
  });

  it("parks the locomotive under the shelf it unlocks, not somewhere else", () => {
    const parked = trainRect({ ...createCircuitFor(), trainX: TRAIN_STOP_X });
    // Adjacent, so one jump gets from the roof onto the shelf.
    expect(parked.x).toBeLessThanOrEqual(EXIT_SHELF.x + EXIT_SHELF.width);
    expect(parked.x + parked.width).toBeGreaterThan(EXIT_SHELF.x + EXIT_SHELF.width);
  });

  it("parks clear of the battery on every level, so it never drives over one", () => {
    for (const level of ELECTRIC_LEVELS) {
      const parked = trainRect({ ...createCircuit(level.circuit!), trainX: TRAIN_STOP_X });
      expect(rectsOverlap(parked, level.circuit!.battery)).toBe(false);
    }
  });

  it("keeps the shelf's underside clear of the parked roof, so the robot can stand there", () => {
    const headroom = TRAIN_TOP - (EXIT_SHELF.y + EXIT_SHELF.height);
    for (const form of ALL_FORMS) {
      expect(FORMS[form].height, `the ${form} form should fit under it`).toBeLessThan(headroom);
    }
  });
});
