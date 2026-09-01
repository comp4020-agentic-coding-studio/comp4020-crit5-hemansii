import { WORLD_BOUNDS } from "./constants";
import { FORMS, type RobotForm } from "./forms";
import {
  applyGravity,
  clampToBounds,
  resolveHorizontalCollision,
  resolveVerticalCollision,
  type Rect,
} from "./physics";
import type { Controls } from "./input";

export interface Robot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  facing: -1 | 1;
  form: RobotForm;
  /** Seconds since the robot last touched down; drives the landing squash. */
  sinceLanded: number;
  /** How hard that landing was, 0..1. */
  landingImpact: number;
  /** Counts up always, so whichever form is active can space out its effects. */
  effectTimer: number;
}

export function createRobot(x: number, y: number, form: RobotForm = "dry"): Robot {
  const spec = FORMS[form];
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    width: spec.width,
    height: spec.height,
    grounded: false,
    facing: 1,
    form,
    sinceLanded: 999,
    landingImpact: 0,
    effectTimer: 0,
  };
}

/**
 * Swaps form in place — replacing whatever was held, never adding to it. The
 * robot grows and shrinks about its feet and its centre line, so absorbing
 * water never shoves it into the floor, and the smaller charged form does not
 * pop into the air when the water goes.
 */
export function setRobotForm(robot: Robot, form: RobotForm): void {
  const spec = FORMS[form];
  const bottom = robot.y + robot.height;
  const centerX = robot.x + robot.width / 2;

  robot.form = form;
  robot.width = spec.width;
  robot.height = spec.height;
  robot.x = centerX - spec.width / 2;
  robot.y = bottom - spec.height;
}

export function updateRobot(
  robot: Robot,
  input: Controls,
  dt: number,
  platforms: Rect[],
): void {
  const spec = FORMS[robot.form];

  const direction = input.moveDirection;
  if (direction !== 0) {
    robot.vx = direction * spec.moveSpeed;
    robot.facing = direction;
  } else {
    robot.vx *= spec.friction;
    if (Math.abs(robot.vx) < 1) robot.vx = 0;
  }

  const jumpRequested = input.consumeJump();
  if (robot.grounded && jumpRequested) {
    robot.vy = spec.jumpVelocity;
  }

  robot.vy = applyGravity(robot.vy, dt, spec.gravity);

  const horizontal = resolveHorizontalCollision(robot, platforms, dt);
  robot.x = horizontal.x;
  robot.vx = horizontal.vx;

  const wasGrounded = robot.grounded;
  const fallSpeed = robot.vy;

  const vertical = resolveVerticalCollision(robot, platforms, dt);
  robot.y = vertical.y;
  robot.vy = vertical.vy;
  robot.grounded = vertical.grounded;

  // Last word on position: the robot can never leave the playable area, no
  // matter what the collision pass resolved to.
  const bounded = clampToBounds(robot, WORLD_BOUNDS);
  robot.x = bounded.x;
  robot.y = bounded.y;
  robot.vx = bounded.vx;
  robot.vy = bounded.vy;
  if (bounded.hitFloor) robot.grounded = true;

  if (!wasGrounded && robot.grounded) {
    robot.sinceLanded = 0;
    robot.landingImpact = Math.min(1, Math.max(0, fallSpeed) / 190);
  } else {
    robot.sinceLanded += dt;
  }

  robot.effectTimer += dt;
}
