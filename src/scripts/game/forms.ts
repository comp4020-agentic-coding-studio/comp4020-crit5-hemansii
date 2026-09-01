/**
 * The robot's forms and what each one costs it. Absorbing a material trades one
 * set of abilities for another: the water form is bigger and heavier, which is
 * the whole point of the pressure plate; the electric form is light and quick
 * and carries a charge, which is the only thing a dead toy will answer to.
 *
 * A form is *replaced*, never stacked — absorb electricity while sodden and the
 * water is gone. That is what keeps each puzzle about the material in hand.
 *
 * Tuning note: max jump height is v^2 / (2g) — `maxJumpHeight` below, so the
 * level can be checked against it rather than play-tested at it. Every climb in
 * the level is sized so EVERY form clears it with margin to spare, and every
 * climb that is meant to be impossible is out of reach of all three;
 * `spec/puzzle.test.ts` and `spec/circuit.test.ts` assert both.
 */
export type RobotForm = "dry" | "water" | "electric";

export interface FormSpec {
  width: number;
  height: number;
  moveSpeed: number;
  jumpVelocity: number;
  gravity: number;
  friction: number;
  /** What the world feels when this form stands on it. */
  mass: number;
  /** What the world feels when this form touches it. */
  charge: number;
}

export const FORMS: Record<RobotForm, FormSpec> = {
  dry: {
    width: 12,
    height: 14,
    moveSpeed: 70,
    jumpVelocity: -210,
    gravity: 480,
    friction: 0.82,
    mass: 1,
    charge: 0,
  },
  water: {
    // Swollen with water: wider, taller, slower off the mark, and it comes
    // down harder than it goes up.
    width: 16,
    height: 18,
    moveSpeed: 52,
    jumpVelocity: -206,
    gravity: 520,
    friction: 0.74,
    mass: 3,
    charge: 0,
  },
  electric: {
    // Running on stored charge: the same small frame as the dry form, but
    // quicker on its feet and springier, and it can hand its charge on.
    width: 12,
    height: 14,
    moveSpeed: 88,
    jumpVelocity: -228,
    gravity: 520,
    friction: 0.88,
    mass: 1,
    charge: 1,
  },
};

/** Weight a pressure plate needs before it will latch. Only the water form has it. */
export const HEAVY_ENOUGH = 2;

/** Charge a dead mechanism needs before it will wake. Only the electric form has it. */
export const LIVE_ENOUGH = 1;

export function isHeavy(form: RobotForm): boolean {
  return FORMS[form].mass >= HEAVY_ENOUGH;
}

export function isCharged(form: RobotForm): boolean {
  return FORMS[form].charge >= LIVE_ENOUGH;
}

/**
 * How far above its launch point a form can get, at the top of a full jump.
 * The level's spacing is derived from this rather than guessed at it, so a
 * tuning change that would strand the robot fails a test instead of shipping.
 */
export function maxJumpHeight(form: RobotForm): number {
  const { jumpVelocity, gravity } = FORMS[form];
  return (jumpVelocity * jumpVelocity) / (2 * gravity);
}
