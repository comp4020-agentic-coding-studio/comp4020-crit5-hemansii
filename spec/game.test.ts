import { describe, expect, it } from "vitest";
import { resolveVerticalCollision } from "../src/scripts/game/physics";

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
