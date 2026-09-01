import type { Palette } from "./constants";

/** A sprite is a grid of palette indices; 0 means transparent. */
export type SpriteGrid = number[][];

/**
 * Art is authored as rows of characters so the shape stays readable in source
 * and edits stay cheap: "." is transparent, and 1-9 are palette indices.
 * `spec/sprites.test.ts` asserts every grid is rectangular and only uses
 * indices its palette actually defines, which is what catches a miscounted row.
 */
export function sprite(rows: string[]): SpriteGrid {
  return rows.map((row) =>
    [...row].map((ch) => (ch === "." ? 0 : parseInt(ch, 36))),
  );
}

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

/**
 * Draws a sprite as a flat silhouette in one colour. Used to push background
 * toys back into the scene without authoring a second, darker copy of the art.
 */
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  grid: SpriteGrid,
  color: string,
  x: number,
  y: number,
  scale = 1,
): void {
  ctx.fillStyle = color;
  for (let row = 0; row < grid.length; row++) {
    const cells = grid[row];
    for (let col = 0; col < cells.length; col++) {
      if (cells[col] === 0) continue;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

// 14x16 space robot, facing right. Domed helmet with a wide glowing visor, a
// signal antenna, segmented hull with a chest indicator, stubby arms and feet.
// Drawn overhanging its 12x14 hitbox (see ROBOT_SPRITE_OFFSET_*).
export const ROBOT_GRID = sprite([
  "......88......",
  "......11......",
  "..1111111111..",
  "..1333222221..",
  "..1266666621..",
  "..1267766621..",
  "..1244444421..",
  "..1222222221..",
  "..1111111111..",
  ".132222222241.",
  "14132288222141",
  "14122299222141",
  "14122222222141",
  ".144444444441.",
  "..1221..1221..",
  "..1441..1441..",
]);

// 16x16 wooden block tile, repeated across a platform's width. Two tiers with
// a seam between them so a platform reads as stacked toy blocks, lit on top.
export const PLATFORM_TILE = sprite([
  "6666666666666666",
  "3333333333333333",
  "2222222222222222",
  "2242222222422222",
  "2222222222222222",
  "2222222422222242",
  "2222222222222222",
  "5555555555555555",
  "3333333333333333",
  "2222222222222222",
  "2222422222224222",
  "2222222222222222",
  "2242222222222222",
  "2222222222222222",
  "4444444444444444",
  "5555555555555555",
]);

// 14x14 beach ball with colour panels and a specular highlight up and to the left.
export const TOY_BALL_GRID = sprite([
  ".....1111.....",
  "...11533351...",
  "..1155333221..",
  ".115533332221.",
  ".145533332226.",
  "14453333222661",
  "14443333222661",
  "14444333222661",
  "14444333226661",
  ".144433326661.",
  ".144433226661.",
  "..1443326661..",
  "...14432661...",
  ".....1661.....",
]);

// 13x18 pair of stacked alphabet blocks. Each is near-square so it reads as a
// cube rather than a card, and the stack is offset so both are separate objects.
export const TOY_BLOCK_GRID = sprite([
  "..11111111111",
  "..16666666661",
  "..13333333331",
  "..12255555221",
  "..12252225221",
  "..12252225221",
  "..12252225221",
  "..12255555221",
  "..14444444441",
  "11111111111..",
  "18888888881..",
  "17777777771..",
  "17777577771..",
  "17775555771..",
  "17755555571..",
  "17775555771..",
  "17777577771..",
  "19999999991..",
]);

// 16x14 plush bear, sitting. Muzzle and belly catch the warm light.
export const TOY_PLUSH_GRID = sprite([
  "..111......111..",
  "..131......131..",
  "..111111111111..",
  ".13332222222241.",
  ".13325222522241.",
  ".13322666622241.",
  ".13322655622241.",
  ".13322266622241.",
  ".11111111111111.",
  "1133322222222411",
  "1133326666222411",
  "1133326666222411",
  ".13332222222241.",
  ".11444444444411.",
]);

// 12x16 toy rocket, tying the scene to the robot's space theme.
export const TOY_ROCKET_GRID = sprite([
  ".....11.....",
  "....1551....",
  "....1551....",
  "...155551...",
  "...155551...",
  "..13222241..",
  "..13266241..",
  "..13666641..",
  "..13266241..",
  "..13222241..",
  "..13222241..",
  "..13222241..",
  ".1532222451.",
  "155322224551",
  "155322224551",
  "114322224411",
]);
