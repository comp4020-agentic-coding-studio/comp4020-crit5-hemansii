import { CANVAS_HEIGHT } from "./constants";
import { isCharged, type RobotForm } from "./forms";
import { inflate, rectsOverlap, type Rect } from "./physics";

/**
 * The electric puzzle: a battery to absorb, a dead toy locomotive asleep in its
 * tunnel, and the rail between them. Like the water puzzle, all of it is plain
 * geometry and state so the rules can be tested without a canvas.
 *
 * The shape of it, and why each number is where it is:
 *
 *   - the battery sits on the floor just past the portcullis, so the only way
 *     to meet it is to have already solved the water puzzle. Nothing enforces
 *     the order but the level itself.
 *   - the locomotive sleeps under the toybox wall (TUNNEL_WALL) with exactly
 *     its own height of clearance, so there is no standing on its roof until it
 *     has driven out. That is what stops the route being open from the start.
 *   - once it has driven out to TRAIN_STOP_X, its roof is the one step high
 *     enough to reach EXIT_SHELF — which no form can reach from the floor.
 *
 * `spec/circuit.test.ts` asserts each of those three, because each of them is
 * the puzzle rather than decoration.
 */

const FLOOR_TOP = CANVAS_HEIGHT - 16;

/**
 * What a level places: where the cell is, and where its rail starts. Everything
 * else about the mechanism — the tunnel, the marks the locomotive drives
 * between, the shelf its roof unlocks — is fixed, because it is the same toy
 * every time it appears.
 */
export interface CircuitConfig {
  /** Toy D-cell, standing on the floor. Walking into it is the whole interface. */
  battery: Rect;
  /** Where the rail begins. It always runs back to the tunnel. */
  railX: number;
}

export const TRAIN_WIDTH = 24;
export const TRAIN_HEIGHT = 26;
/** The roof of the locomotive, and so the height of the step it becomes. */
export const TRAIN_TOP = FLOOR_TOP - TRAIN_HEIGHT;

/** Parked in the tunnel, nose showing at the mouth. */
export const TRAIN_HOME_X = 232;
/** Out in the open, roof clear of the wall, under the shelf it unlocks. */
export const TRAIN_STOP_X = 206;

/**
 * The toybox wall the tunnel is cut into. Solid to the ceiling on purpose: a
 * thin tunnel roof would be a platform in its own right, and standing on it
 * would reach the shelf without ever waking the train.
 */
export const TUNNEL_WALL: Rect = { x: 230, y: 0, width: 26, height: TRAIN_TOP };

/** The recess beneath it that the locomotive sleeps in. */
export const TUNNEL_MOUTH: Rect = {
  x: TUNNEL_WALL.x,
  y: TRAIN_TOP,
  width: TUNNEL_WALL.width,
  height: FLOOR_TOP - TRAIN_TOP,
};

/** The high shelf the locomotive opens up. Out of reach of every form from the floor. */
export const EXIT_SHELF: Rect = { x: 186, y: 70, width: 20, height: 8 };

/** The rail always ends at the back of the tunnel; where it starts is the level's call. */
export const RAIL_END = TUNNEL_WALL.x + TUNNEL_WALL.width;

const DRAIN_SPEED = 2.6; // how fast the cell empties into the robot
const ARC_TRAVEL = 0.32; // seconds for the discharge to run the rail before the wheels turn
const TRAIN_SPEED = 24; // px/s
/** How close counts as touching. Collision leaves the robot flush, never overlapping. */
const CONTACT_REACH = 2;

export interface CircuitState {
  readonly config: CircuitConfig;
  /** 1 = full cell, 0 = spent. */
  batteryCharge: number;
  draining: boolean;
  /** The locomotive has taken the charge and will not need it twice. */
  powered: boolean;
  /** 0..1 discharge spreading along the rail once the locomotive wakes. */
  arc: number;
  trainX: number;
}

export interface CircuitEvents {
  /** The robot just took the cell's charge, replacing whatever form it held. */
  charged: boolean;
  /** The robot just handed that charge to the locomotive. */
  powered: boolean;
  /** How far the locomotive rolled this step; negative, since it only drives out. */
  trainDx: number;
}

export interface CircuitBody extends Rect {
  form: RobotForm;
  grounded: boolean;
}

export function createCircuit(config: CircuitConfig): CircuitState {
  return {
    config,
    batteryCharge: 1,
    draining: false,
    powered: false,
    arc: 0,
    trainX: TRAIN_HOME_X,
  };
}

/** The locomotive as a collider. It is solid, and it is also the step. */
export function trainRect(state: CircuitState): Rect {
  return { x: state.trainX, y: TRAIN_TOP, width: TRAIN_WIDTH, height: TRAIN_HEIGHT };
}

export function trainAtRest(state: CircuitState): boolean {
  return state.trainX <= TRAIN_STOP_X;
}

/**
 * A body can take the cell's charge if it is not already carrying charge. Note
 * what this does NOT check: which form it is. Water or dry, the charge lands
 * the same way, and the form it replaces is gone.
 */
export function canCharge(body: CircuitBody, state: CircuitState): boolean {
  return (
    !isCharged(body.form) &&
    state.batteryCharge > 0.02 &&
    rectsOverlap(body, state.config.battery)
  );
}

/** A charged body touching the locomotive wakes it. Anything else bounces off it. */
export function canPower(body: CircuitBody, state: CircuitState): boolean {
  return (
    !state.powered &&
    isCharged(body.form) &&
    rectsOverlap(body, inflate(trainRect(state), CONTACT_REACH))
  );
}

export function updateCircuit(
  state: CircuitState,
  body: CircuitBody,
  dt: number,
): CircuitEvents {
  const events: CircuitEvents = { charged: false, powered: false, trainDx: 0 };

  if (canCharge(body, state)) {
    events.charged = true;
    state.draining = true;
  }
  if (state.draining) {
    state.batteryCharge = Math.max(0, state.batteryCharge - dt * DRAIN_SPEED);
  }

  if (canPower(body, state)) {
    state.powered = true;
    events.powered = true;
  }

  if (state.powered) {
    // The charge runs the rail before anything turns, so the cause is legible
    // in the same visual language the pressure plate's conduit already speaks.
    state.arc = Math.min(1, state.arc + dt / ARC_TRAVEL);
    if (state.arc >= 1) {
      const next = Math.max(TRAIN_STOP_X, state.trainX - TRAIN_SPEED * dt);
      events.trainDx = next - state.trainX;
      state.trainX = next;
    }
  }

  return events;
}
