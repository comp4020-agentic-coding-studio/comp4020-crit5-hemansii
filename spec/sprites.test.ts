import { describe, expect, it } from "vitest";
import {
  ROBOT_PALETTE,
  PLATFORM_PALETTE,
  TOY_BALL_PALETTE,
  TOY_BLOCK_PALETTE,
  TOY_PLUSH_PALETTE,
  TOY_ROCKET_PALETTE,
  type Palette,
} from "../src/scripts/game/constants";
import {
  ROBOT_GRID,
  PLATFORM_TILE,
  TOY_BALL_GRID,
  TOY_BLOCK_GRID,
  TOY_PLUSH_GRID,
  TOY_ROCKET_GRID,
  type SpriteGrid,
} from "../src/scripts/game/sprites";

/**
 * The art is hand-authored character rows, so the failure mode is a miscounted
 * row or a palette index that was never defined — both of which render as a
 * silently malformed sprite rather than an error. These assert the shape.
 */
const SPRITES: Array<{ name: string; grid: SpriteGrid; palette: Palette }> = [
  { name: "robot", grid: ROBOT_GRID, palette: ROBOT_PALETTE },
  { name: "platform tile", grid: PLATFORM_TILE, palette: PLATFORM_PALETTE },
  { name: "ball", grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE },
  { name: "blocks", grid: TOY_BLOCK_GRID, palette: TOY_BLOCK_PALETTE },
  { name: "plush", grid: TOY_PLUSH_GRID, palette: TOY_PLUSH_PALETTE },
  { name: "rocket", grid: TOY_ROCKET_GRID, palette: TOY_ROCKET_PALETTE },
];

describe.each(SPRITES)("$name sprite", ({ grid, palette }) => {
  it("is rectangular", () => {
    const widths = [...new Set(grid.map((row) => row.length))];
    expect(widths).toHaveLength(1);
  });

  it("has at least one row", () => {
    expect(grid.length).toBeGreaterThan(0);
  });

  it("only uses indices its palette defines", () => {
    const used = new Set<number>();
    for (const row of grid) {
      for (const cell of row) {
        if (cell !== 0) used.add(cell);
      }
    }
    const undefinedIndices = [...used].filter((i) => palette[i] === undefined);
    expect(undefinedIndices).toEqual([]);
  });
});

describe("the platform tile", () => {
  it("is square, so it repeats cleanly across a platform's width", () => {
    expect(PLATFORM_TILE[0]).toHaveLength(PLATFORM_TILE.length);
  });

  it("is fully opaque, so no wall shows through a solid block", () => {
    const transparent = PLATFORM_TILE.flat().filter((cell) => cell === 0);
    expect(transparent).toEqual([]);
  });
});
