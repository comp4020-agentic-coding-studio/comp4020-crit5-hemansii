import { describe, expect, it } from "vitest";
import {
  BATTERY_PALETTE,
  BATTERY_SPENT_PALETTE,
  ELECTRIC_ROBOT_PALETTE,
  ROBOT_PALETTE,
  PLATFORM_PALETTE,
  TRAIN_PALETTE,
  TOY_BALL_PALETTE,
  TOY_BLOCK_PALETTE,
  TOY_PLUSH_PALETTE,
  TOY_ROCKET_PALETTE,
  WATER_ROBOT_PALETTE,
  type Palette,
} from "../src/scripts/game/constants";
import {
  BATTERY_GRID,
  ELECTRIC_ROBOT_GRID,
  LAMP_LENS,
  ROBOT_GRID,
  PLATFORM_TILE,
  TRAIN_GRID,
  TOY_BALL_GRID,
  TOY_BLOCK_GRID,
  TOY_PLUSH_GRID,
  TOY_ROCKET_GRID,
  WATER_ROBOT_GRID,
  WATER_ROBOT_SQUASH,
  type SpriteGrid,
} from "../src/scripts/game/sprites";
import { TRAIN_HEIGHT, TRAIN_WIDTH } from "../src/scripts/game/circuit";
import { FORMS } from "../src/scripts/game/forms";

/**
 * The art is hand-authored character rows, so the failure mode is a miscounted
 * row or a palette index that was never defined — both of which render as a
 * silently malformed sprite rather than an error. These assert the shape.
 */
const SPRITES: Array<{ name: string; grid: SpriteGrid; palette: Palette }> = [
  { name: "robot", grid: ROBOT_GRID, palette: ROBOT_PALETTE },
  { name: "water robot", grid: WATER_ROBOT_GRID, palette: WATER_ROBOT_PALETTE },
  { name: "water robot squash", grid: WATER_ROBOT_SQUASH, palette: WATER_ROBOT_PALETTE },
  { name: "platform tile", grid: PLATFORM_TILE, palette: PLATFORM_PALETTE },
  { name: "ball", grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE },
  { name: "blocks", grid: TOY_BLOCK_GRID, palette: TOY_BLOCK_PALETTE },
  { name: "plush", grid: TOY_PLUSH_GRID, palette: TOY_PLUSH_PALETTE },
  { name: "rocket", grid: TOY_ROCKET_GRID, palette: TOY_ROCKET_PALETTE },
  { name: "electric robot", grid: ELECTRIC_ROBOT_GRID, palette: ELECTRIC_ROBOT_PALETTE },
  { name: "battery", grid: BATTERY_GRID, palette: BATTERY_PALETTE },
  // The same grid gets drawn through the spent palette once the robot has
  // drained it, so that palette has to define every index the art uses too.
  { name: "spent battery", grid: BATTERY_GRID, palette: BATTERY_SPENT_PALETTE },
  { name: "locomotive", grid: TRAIN_GRID, palette: TRAIN_PALETTE },
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

describe("the water form's frames", () => {
  it("squashes wider and shorter than it stands", () => {
    expect(WATER_ROBOT_SQUASH[0].length).toBeGreaterThan(WATER_ROBOT_GRID[0].length);
    expect(WATER_ROBOT_SQUASH.length).toBeLessThan(WATER_ROBOT_GRID.length);
  });

  it("is bigger than the dry robot in both directions", () => {
    expect(WATER_ROBOT_GRID[0].length).toBeGreaterThan(ROBOT_GRID[0].length);
    expect(WATER_ROBOT_GRID.length).toBeGreaterThan(ROBOT_GRID.length);
  });
});

describe("the charged form's frame", () => {
  it("is the same size as the dry robot, so only the light changes", () => {
    expect(ELECTRIC_ROBOT_GRID[0].length).toBe(ROBOT_GRID[0].length);
    expect(ELECTRIC_ROBOT_GRID.length).toBe(ROBOT_GRID.length);
  });

  it("is drawn brighter, not merely differently", () => {
    // Average luminance of every colour each palette actually uses.
    const brightness = (grid: SpriteGrid, palette: Palette) => {
      const hexes = [...new Set(grid.flat().filter((c) => c !== 0))].map((i) => palette[i]);
      const lum = hexes.map((hex) => {
        const [r, g, b] = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      });
      return lum.reduce((a, b) => a + b, 0) / lum.length;
    };

    expect(brightness(ELECTRIC_ROBOT_GRID, ELECTRIC_ROBOT_PALETTE)).toBeGreaterThan(
      brightness(ROBOT_GRID, ROBOT_PALETTE),
    );
  });
});

describe("the locomotive's frame", () => {
  it("is drawn at exactly its collider's size, so the roof you see is the roof you land on", () => {
    expect(TRAIN_GRID[0].length).toBe(TRAIN_WIDTH);
    expect(TRAIN_GRID.length).toBe(TRAIN_HEIGHT);
  });

  /**
   * The roof is a platform, and a body rests at its collider's top edge — so any
   * dip in the sprite's top line shows up in play as the robot floating above the
   * engine. This caught exactly that: a tall chimney over a low boiler left the
   * robot hovering two pixels off the cab roof.
   */
  it("has an unbroken roofline, so a body standing on it stands on something", () => {
    const roof = TRAIN_GRID[0];
    const opaque = roof.flatMap((cell, i) => (cell !== 0 ? [i] : []));

    expect(opaque.length, "the roof should be drawn at all").toBeGreaterThan(0);
    const [first, last] = [opaque[0], opaque[opaque.length - 1]];
    expect(last - first + 1, "the roofline should have no gap in it").toBe(opaque.length);

    // And it has to be wide enough to hold a body anywhere along the launch strip.
    const widest = Math.max(...Object.values(FORMS).map((f) => f.width));
    expect(opaque.length).toBeGreaterThanOrEqual(TRAIN_WIDTH - 4);
    expect(opaque.length).toBeGreaterThan(widest);
  });

  it("puts the headlamp lens inside the frame, so lighting it lands on the lamp", () => {
    expect(LAMP_LENS.dx + LAMP_LENS.width).toBeLessThanOrEqual(TRAIN_GRID[0].length);
    expect(LAMP_LENS.dy + LAMP_LENS.height).toBeLessThanOrEqual(TRAIN_GRID.length);
    // Every pixel under the lens is the unlit-lens index, index 9.
    for (let row = LAMP_LENS.dy; row < LAMP_LENS.dy + LAMP_LENS.height; row++) {
      for (let col = LAMP_LENS.dx; col < LAMP_LENS.dx + LAMP_LENS.width; col++) {
        expect(TRAIN_GRID[row][col]).toBe(9);
      }
    }
  });
});

describe("the battery's two states", () => {
  it("greys out when spent, rather than becoming a different object", () => {
    const used = [...new Set(BATTERY_GRID.flat().filter((c) => c !== 0))];
    const saturation = (palette: Palette) =>
      used
        .map((i) => {
          const [r, g, b] = [1, 3, 5].map((o) => parseInt(palette[i].slice(o, o + 2), 16));
          return Math.max(r, g, b) - Math.min(r, g, b);
        })
        .reduce((a, b) => a + b, 0);

    expect(saturation(BATTERY_SPENT_PALETTE)).toBeLessThan(saturation(BATTERY_PALETTE) / 2);
  });
});
