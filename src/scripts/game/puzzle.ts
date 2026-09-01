import { rectsOverlap, type Rect } from "./physics";
import { isHeavy, type RobotForm } from "./forms";

/**
 * The water puzzle: a puddle to absorb, a pressure plate that only answers to
 * weight, and a portcullis wired to it. All of it is plain geometry and state
 * so the rules can be tested without a canvas.
 */

/**
 * Shallow water, spilled on the low shelf right by where the robot wakes up.
 * It sits off the floor deliberately: walking right along the ground takes you
 * over the pressure plate first, so you watch it refuse your weight before you
 * ever find the water. One easy hop up is the whole lesson, and no text is
 * needed to join it up.
 */
export const PUDDLE: Rect = { x: 58, y: 91, width: 28, height: 7 };

/**
 * The plate is a trigger pad, not a collider. Collision resolution has no
 * step-up, so even a 3px lip would stop the robot dead at the button's edge
 * (and trap it on the way back). It sits almost flush and depresses under the
 * robot instead of lifting it.
 */
export const PLATE_X = 96;
export const PLATE_WIDTH = 48;
export const PLATE_TOP = 126;
export const PLATE_TRAVEL = 2;

/** Portcullis. The beam above it is a static platform, so together they seal the doorway. */
export const GATE: Rect = { x: 170, y: 48, width: 16, height: 80 };

/** Seconds for the signal to travel the conduit from plate to gate. */
const SIGNAL_TRAVEL = 0.38;
const GATE_SPEED = 0.55;
const DRAIN_SPEED = 2.2;

export interface PuzzleState {
  /** 1 = full puddle, 0 = fully absorbed. */
  puddleAmount: number;
  draining: boolean;
  /** 0 = plate up, 1 = fully pressed. */
  plateDepression: number;
  latched: boolean;
  /** A too-light body is resting on the plate right now. */
  lightTouch: boolean;
  /** 0..1 pulse travelling the conduit once the plate latches. */
  signal: number;
  /** 0 = portcullis down, 1 = fully raised. */
  gateOpenness: number;
}

export interface PuzzleEvents {
  absorbed: boolean;
  latched: boolean;
}

export interface PuzzleBody extends Rect {
  form: RobotForm;
  grounded: boolean;
}

export function createPuzzle(): PuzzleState {
  return {
    puddleAmount: 1,
    draining: false,
    plateDepression: 0,
    latched: false,
    lightTouch: false,
    signal: 0,
    gateOpenness: 0,
  };
}

/** Where the plate's top surface currently sits. */
export function plateTop(state: PuzzleState): number {
  return PLATE_TOP + state.plateDepression * PLATE_TRAVEL;
}

/** The portcullis as a collider. It hangs from its top and retracts upwards. */
export function gateCollider(state: PuzzleState): Rect | null {
  const height = GATE.height * (1 - state.gateOpenness);
  if (height < 1) return null;
  return { x: GATE.x, y: GATE.y, width: GATE.width, height };
}

/** True when a body is standing on the floor across the plate's footprint. */
export function isOnPlate(body: PuzzleBody, state: PuzzleState): boolean {
  if (!body.grounded) return false;
  const bottom = body.y + body.height;
  const top = plateTop(state);
  const overlapsX = body.x < PLATE_X + PLATE_WIDTH && body.x + body.width > PLATE_X;
  return overlapsX && bottom >= top - 1 && bottom <= top + 4;
}

export function canAbsorb(body: PuzzleBody, state: PuzzleState): boolean {
  return body.form === "dry" && state.puddleAmount > 0.02 && rectsOverlap(body, PUDDLE);
}

export function updatePuzzle(
  state: PuzzleState,
  body: PuzzleBody,
  dt: number,
): PuzzleEvents {
  const events: PuzzleEvents = { absorbed: false, latched: false };

  if (canAbsorb(body, state)) {
    events.absorbed = true;
    state.draining = true;
  }
  if (state.draining) {
    state.puddleAmount = Math.max(0, state.puddleAmount - dt * DRAIN_SPEED);
  }

  const standing = isOnPlate(body, state);
  const heavy = isHeavy(body.form);
  state.lightTouch = standing && !heavy;

  if (standing && heavy && !state.latched) {
    state.latched = true;
    events.latched = true;
  }

  // A light body still nudges it — enough to show the plate is a moving part,
  // not enough to latch. That contrast is the hint, in place of any text.
  const target = state.latched ? 1 : standing ? 0.35 : 0;
  state.plateDepression += (target - state.plateDepression) * Math.min(1, dt * 16);

  if (state.latched) {
    state.signal = Math.min(1, state.signal + dt / SIGNAL_TRAVEL);
    if (state.signal >= 1) {
      state.gateOpenness = Math.min(1, state.gateOpenness + dt * GATE_SPEED);
    }
  }

  return events;
}
