import { describe, expect, it } from "vitest";
import { clampToBounds, resolveVerticalCollision } from "../src/scripts/game/physics";

describe("landing on a platform", () => {
  it("stops a falling body exactly on the platform's surface", () => {
    const platform = { x: 0, y: 100, width: 50, height: 10 };
    const body = { x: 10, y: 80, width: 12, height: 14, vx: 0, vy: 40 };

    const result = resolveVerticalCollision(body, [platform]);

    expect(result.y).toBe(platform.y - body.height);
    expect(result.vy).toBe(0);
    expect(result.grounded).toBe(true);
  });

  it("does not ground a body that is still above the platform", () => {
    const platform = { x: 0, y: 100, width: 50, height: 10 };
    const body = { x: 10, y: 40, width: 12, height: 14, vx: 0, vy: 40 };

    const result = resolveVerticalCollision(body, [platform]);

    expect(result.grounded).toBe(false);
    expect(result.y).toBe(80);
  });

  it("leaves a rising body ungrounded", () => {
    const platform = { x: 0, y: 100, width: 50, height: 10 };
    const body = { x: 10, y: 80, width: 12, height: 14, vx: 0, vy: -60 };

    const result = resolveVerticalCollision(body, [platform]);

    expect(result.grounded).toBe(false);
  });
});

describe("staying inside the playable area", () => {
  const bounds = { minX: 0, minY: 0, maxX: 256, maxY: 144 };
  const body = (over: Partial<{ x: number; y: number; vx: number; vy: number }>) => ({
    x: 100,
    y: 60,
    width: 12,
    height: 14,
    vx: 0,
    vy: 0,
    ...over,
  });

  it("stops a body walking off the left edge", () => {
    const result = clampToBounds(body({ x: -8, vx: -70 }), bounds);

    expect(result.x).toBe(0);
    expect(result.vx).toBe(0);
  });

  it("stops a body walking off the right edge, whole sprite on screen", () => {
    const result = clampToBounds(body({ x: 250, vx: 70 }), bounds);

    expect(result.x).toBe(bounds.maxX - 12);
    expect(result.x + 12).toBe(bounds.maxX);
    expect(result.vx).toBe(0);
  });

  it("stops a body rising off the top edge", () => {
    const result = clampToBounds(body({ y: -10, vy: -210 }), bounds);

    expect(result.y).toBe(0);
    expect(result.vy).toBe(0);
  });

  it("catches a body that fell past the bottom, and grounds it", () => {
    const result = clampToBounds(body({ y: 400, vy: 900 }), bounds);

    expect(result.y).toBe(bounds.maxY - 14);
    expect(result.vy).toBe(0);
    expect(result.hitFloor).toBe(true);
  });

  it("leaves a body already inside untouched", () => {
    const inside = body({ x: 100, y: 60, vx: 70, vy: -30 });

    const result = clampToBounds(inside, bounds);

    expect(result).toMatchObject({ x: 100, y: 60, vx: 70, vy: -30, hitFloor: false });
  });

  it("does not steal velocity that points back into the area", () => {
    // Pressed against the left wall but already moving right again.
    const result = clampToBounds(body({ x: -3, vx: 70 }), bounds);

    expect(result.x).toBe(0);
    expect(result.vx).toBe(70);
  });
});
