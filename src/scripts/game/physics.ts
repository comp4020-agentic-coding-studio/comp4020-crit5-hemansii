import { GRAVITY } from "./constants";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingBody extends Rect {
  vx: number;
  vy: number;
}

function overlapsX(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x;
}

function overlapsY(a: Rect, b: Rect): boolean {
  return a.y < b.y + b.height && a.y + a.height > b.y;
}

export function applyGravity(vy: number, dt: number): number {
  return vy + GRAVITY * dt;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Keeps a body inside the playable area. A body that would cross an edge is
 * placed flush against it and loses the velocity pushing it outwards, so it
 * can never walk or fall off the screen. `hitFloor` reports the bottom edge
 * acting as ground, so a body resting there can still jump.
 */
export function clampToBounds(
  body: MovingBody,
  bounds: Bounds,
): { x: number; y: number; vx: number; vy: number; hitFloor: boolean } {
  let { x, y, vx, vy } = body;
  let hitFloor = false;

  if (x < bounds.minX) {
    x = bounds.minX;
    if (vx < 0) vx = 0;
  } else if (x + body.width > bounds.maxX) {
    x = bounds.maxX - body.width;
    if (vx > 0) vx = 0;
  }

  if (y < bounds.minY) {
    y = bounds.minY;
    if (vy < 0) vy = 0;
  } else if (y + body.height > bounds.maxY) {
    y = bounds.maxY - body.height;
    if (vy > 0) vy = 0;
    hitFloor = true;
  }

  return { x, y, vx, vy, hitFloor };
}

/**
 * Resolves vertical movement against a set of platforms. A body falling
 * (vy > 0) that would end the frame overlapping a platform it was above at
 * the start of the frame is placed to rest exactly on that platform's top
 * surface, with vy zeroed and grounded set true.
 */
export function resolveVerticalCollision(
  body: MovingBody,
  platforms: Rect[],
  dt = 1,
): { y: number; vy: number; grounded: boolean } {
  const startY = body.y;
  const nextY = body.y + body.vy * dt;
  let resolvedY = nextY;
  let resolvedVy = body.vy;
  let grounded = false;

  if (body.vy > 0) {
    for (const platform of platforms) {
      if (!overlapsX(body, platform)) continue;
      const bodyBottomStart = startY + body.height;
      const bodyBottomNext = nextY + body.height;
      const wasAbove = bodyBottomStart <= platform.y;
      const landsInside = bodyBottomNext >= platform.y;
      if (wasAbove && landsInside) {
        const restingY = platform.y - body.height;
        if (restingY < resolvedY || !grounded) {
          resolvedY = restingY;
          resolvedVy = 0;
          grounded = true;
        }
      }
    }
  } else if (body.vy < 0) {
    for (const platform of platforms) {
      if (!overlapsX(body, platform)) continue;
      const platformBottom = platform.y + platform.height;
      const wasBelow = startY >= platformBottom;
      const hitsInside = nextY <= platformBottom;
      if (wasBelow && hitsInside) {
        resolvedY = platformBottom;
        resolvedVy = 0;
      }
    }
  }

  return { y: resolvedY, vy: resolvedVy, grounded };
}

/** Resolves horizontal movement so a body stops at a platform's side rather than passing through it. */
export function resolveHorizontalCollision(
  body: MovingBody,
  platforms: Rect[],
  dt = 1,
): { x: number; vx: number } {
  const startX = body.x;
  const nextX = body.x + body.vx * dt;
  let resolvedX = nextX;
  let resolvedVx = body.vx;

  for (const platform of platforms) {
    if (!overlapsY({ ...body, y: body.y }, platform)) continue;
    const bodyRightStart = startX + body.width;
    const bodyRightNext = nextX + body.width;

    if (body.vx > 0) {
      const wasLeft = bodyRightStart <= platform.x;
      const entersInside = bodyRightNext >= platform.x;
      if (wasLeft && entersInside) {
        resolvedX = platform.x - body.width;
        resolvedVx = 0;
      }
    } else if (body.vx < 0) {
      const platformRight = platform.x + platform.width;
      const wasRight = startX >= platformRight;
      const entersInside = nextX <= platformRight;
      if (wasRight && entersInside) {
        resolvedX = platformRight;
        resolvedVx = 0;
      }
    }
  }

  return { x: resolvedX, vx: resolvedVx };
}
