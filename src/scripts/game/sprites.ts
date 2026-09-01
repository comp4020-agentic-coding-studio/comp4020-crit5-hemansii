import type { Palette } from "./constants";

/** A sprite is a grid of palette indices; 0 means transparent. */
export type SpriteGrid = number[][];

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  grid: SpriteGrid,
  palette: Palette,
  x: number,
  y: number,
  scale = 1,
): void {
  for (let row = 0; row < grid.length; row++) {
    const cells = grid[row];
    for (let col = 0; col < cells.length; col++) {
      const index = cells[col];
      if (index === 0) continue;
      ctx.fillStyle = palette[index];
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

// 12x14 space robot, facing right. Domed metal head with a horizontal visor
// band, a signal antenna, and a segmented hull with a chest indicator light.
export const ROBOT_GRID: SpriteGrid = [
  [0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
  [1, 2, 2, 5, 5, 5, 5, 5, 5, 2, 2, 1],
  [1, 2, 2, 5, 6, 6, 6, 6, 5, 2, 2, 1],
  [1, 2, 2, 2, 4, 4, 4, 4, 2, 2, 2, 1],
  [0, 1, 1, 4, 4, 4, 4, 4, 4, 1, 1, 0],
  [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1],
  [1, 2, 2, 2, 3, 7, 7, 3, 2, 2, 2, 1],
  [1, 2, 4, 2, 2, 2, 2, 2, 2, 4, 2, 1],
  [0, 1, 2, 2, 4, 2, 2, 4, 2, 2, 1, 0],
  [0, 1, 4, 4, 0, 0, 0, 0, 4, 4, 1, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
];

// 16x8 wood platform tile, repeatable, with a top highlight and grain shadow.
export const PLATFORM_TILE: SpriteGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 3, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 4, 2, 2, 2, 4, 2, 2, 2, 4, 2, 2, 2, 4, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 4, 2, 2, 2, 4, 2, 2, 2, 4, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 10x10 bouncy ball toy.
export const TOY_BALL_GRID: SpriteGrid = [
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 2, 3, 3, 2, 2, 2, 1, 0],
  [1, 2, 3, 5, 3, 2, 2, 2, 2, 1],
  [1, 2, 3, 3, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 4, 2, 2, 1],
  [1, 2, 2, 2, 2, 4, 4, 2, 2, 1],
  [1, 2, 2, 2, 4, 4, 2, 2, 2, 1],
  [1, 2, 2, 4, 4, 2, 2, 2, 2, 1],
  [0, 1, 4, 4, 2, 2, 2, 2, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
];

// 12x10 stacked toy block with a letter-block style top face.
export const TOY_BLOCK_GRID: SpriteGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
  [1, 3, 2, 2, 2, 5, 5, 2, 2, 2, 3, 1],
  [1, 3, 2, 2, 5, 5, 5, 5, 2, 2, 3, 1],
  [1, 3, 2, 2, 2, 5, 5, 2, 2, 2, 3, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 4, 2, 2, 2, 2, 2, 2, 4, 2, 1],
  [1, 2, 2, 2, 4, 2, 2, 4, 2, 2, 2, 1],
  [1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 12x12 plush toy (bear-like), for background dressing.
export const TOY_PLUSH_GRID: SpriteGrid = [
  [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  [1, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 1],
  [1, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 0],
  [1, 2, 2, 5, 2, 3, 3, 2, 5, 2, 2, 1],
  [1, 2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
  [0, 0, 1, 2, 2, 1, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0],
];
