/**
 * The robot's forms and what each one costs it. Absorbing a material trades
 * mobility for mass: the water form is bigger and heavier, which is the whole
 * point — the pressure plate only answers to weight.
 *
 * Tuning note: max jump height is v^2 / (2g), so the water form clears
 * 195^2/1040 = 36.6px against the dry form's 210^2/960 = 45.9px. Every jump
 * the puzzle *requires* is kept under 36px; the taller platforms are dry-form
 * flourishes, not the critical path.
 */
export type RobotForm = "dry" | "water";

export interface FormSpec {
  width: number;
  height: number;
  moveSpeed: number;
  jumpVelocity: number;
  gravity: number;
  friction: number;
  /** What the world feels when this form stands on it. */
  mass: number;
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
  },
  water: {
    // Swollen with water: wider, taller, slower off the mark, and it comes
    // down harder than it goes up.
    width: 16,
    height: 18,
    moveSpeed: 52,
    jumpVelocity: -195,
    gravity: 520,
    friction: 0.74,
    mass: 3,
  },
};

/** Weight a pressure plate needs before it will latch. The dry form cannot reach it. */
export const HEAVY_ENOUGH = 2;

export function isHeavy(form: RobotForm): boolean {
  return FORMS[form].mass >= HEAVY_ENOUGH;
}
