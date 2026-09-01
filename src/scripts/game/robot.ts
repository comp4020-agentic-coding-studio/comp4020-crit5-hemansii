import {
  JUMP_VELOCITY,
  MOVE_SPEED,
  GROUND_FRICTION,
  ROBOT_WIDTH,
  ROBOT_HEIGHT,
} from "./constants";
import {
  applyGravity,
  resolveHorizontalCollision,
  resolveVerticalCollision,
  type Rect,
} from "./physics";
import type { InputTracker } from "./input";

export interface Robot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  facing: -1 | 1;
}

export function createRobot(x: number, y: number): Robot {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    width: ROBOT_WIDTH,
    height: ROBOT_HEIGHT,
    grounded: false,
    facing: 1,
  };
}

export function updateRobot(
  robot: Robot,
  input: InputTracker,
  dt: number,
  platforms: Rect[],
): void {
  const direction = input.moveDirection;
  if (direction !== 0) {
    robot.vx = direction * MOVE_SPEED;
    robot.facing = direction;
  } else {
    robot.vx *= GROUND_FRICTION;
    if (Math.abs(robot.vx) < 1) robot.vx = 0;
  }

  const jumpRequested = input.consumeJump();
  if (robot.grounded && jumpRequested) {
    robot.vy = JUMP_VELOCITY;
  }

  robot.vy = applyGravity(robot.vy, dt);

  const horizontal = resolveHorizontalCollision(robot, platforms, dt);
  robot.x = horizontal.x;
  robot.vx = horizontal.vx;

  const vertical = resolveVerticalCollision(robot, platforms, dt);
  robot.y = vertical.y;
  robot.vy = vertical.vy;
  robot.grounded = vertical.grounded;
}
