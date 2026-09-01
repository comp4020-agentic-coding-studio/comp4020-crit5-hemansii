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

/**
 * `rowOffset` shifts whole rows sideways as they are drawn. Shearing the rows
 * keeps every pixel square — which scaling a grid by a fraction would not — so
 * it is how the water form gets its slosh without going soft at the edges.
 */
export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  grid: SpriteGrid,
  palette: Palette,
  x: number,
  y: number,
  scale = 1,
  rowOffset?: (row: number) => number,
): void {
  for (let row = 0; row < grid.length; row++) {
    const cells = grid[row];
    const shift = rowOffset ? rowOffset(row) * scale : 0;
    for (let col = 0; col < cells.length; col++) {
      const index = cells[col];
      if (index === 0) continue;
      ctx.fillStyle = palette[index];
      ctx.fillRect(x + col * scale + shift, y + row * scale, scale, scale);
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

// 18x20 water form: the same robot swollen with water. Rounder, heavier in the
// belly, with the hull gone translucent blue and a waterline sitting low in it.
export const WATER_ROBOT_GRID = sprite([
  "........88........",
  "........11........",
  "....1111111111....",
  "....1333222221....",
  "...132222222221...",
  "...126666666621...",
  "...126776666621...",
  "...124444444421...",
  "...122222222221...",
  "..11111111111111..",
  ".1332222222222241.",
  "113322222222222411",
  "141222222222222141",
  "141222228822222141",
  "141222222222222141",
  "141244444444442141",
  "114444444444444411",
  ".1144444444444411.",
  "..11444444444411..",
  "...1441....1441...",
]);

// 20x18 landing frame: the same body squashed wide and flat on impact.
export const WATER_ROBOT_SQUASH = sprite([
  ".........88.........",
  ".........11.........",
  "....111111111111....",
  "...13332222222221...",
  "...12666666666621...",
  "...12677766666621...",
  "...12444444444421...",
  "...11111111111111...",
  "..1111111111111111..",
  ".113322222222222411.",
  "11332222222222222411",
  "14122222288222222141",
  "14122222222222222141",
  "14124444444444442141",
  "11444444444444444411",
  ".114444444444444411.",
  "..1144444444444411..",
  "..1441........1441..",
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

// 14x16 charged form: the same chassis as the dry robot, but the visor is
// running hot, the antenna has a spark sitting on it, and a bolt is burning
// through the chest plate. Same 12x14 hitbox as the dry form.
export const ELECTRIC_ROBOT_GRID = sprite([
  ".....989......",
  "......8.......",
  "..1111111111..",
  "..1333222221..",
  "..1266666621..",
  "..1267776621..",
  "..1266666621..",
  "..1222222221..",
  "..1111111111..",
  ".132222882241.",
  "14132288222141",
  "14122888822141",
  "14122228822141",
  ".144444444441.",
  "..1221..1221..",
  "..1441..1441..",
]);

// 10x20 toy D-cell, standing on its base: raised terminal, steel caps top and
// bottom, and a bolt printed on the wrapper so it reads as a power source and
// not a tin of paint.
export const BATTERY_GRID = sprite([
  "...1111...",
  "...1651...",
  "1111111111",
  "1665555551",
  "1555555571",
  "1111111111",
  "1332222441",
  "1332222441",
  "1332288441",
  "1332882441",
  "1338888441",
  "1332288441",
  "1332222441",
  "1332222441",
  "1332222441",
  "1332222441",
  "1332222441",
  "1111111111",
  "1555555571",
  "1111111111",
]);

// 24x26 toy locomotive, facing left: chimney and headlamp at the front, saddle
// tank amidships, cab with a window at the back, three wheels riding the rail.
//
// Chimney, tank and cab roof are deliberately all the SAME height, so row 0 is
// one unbroken line across the whole engine. That is not a styling choice: the
// roof is a platform, and the robot stands at its collider's top edge. A taller
// chimney over a lower boiler would leave the robot visibly floating above
// whichever part of the roof it happened to be standing on. `spec/sprites.test.ts`
// asserts the roofline holds. The headlamp lens (LAMP_LENS) is painted over when
// it lights.
export const TRAIN_GRID = sprite([
  "..111111111111111111111.",
  "..166611555115555555551.",
  "..166611555114222222241.",
  "..166611222114188888141.",
  "..166611222114188888141.",
  "..166611222114222222241.",
  "..166611222114222222241.",
  ".1111111111114222222241.",
  ".1322222224114222222241.",
  ".1322222224114222222241.",
  ".1555222224114222222241.",
  ".1599222224114222222241.",
  ".1599222224114222222241.",
  ".1555222224114222222241.",
  ".1325522224114222222241.",
  ".1322222224114222222241.",
  ".1322222224114222222241.",
  ".1111111111111111111111.",
  "177777777777777777777771",
  "166666666666666666666661",
  "..1111...1111...1111....",
  ".166661.166661.166661...",
  ".165561.165561.165561...",
  ".165561.165561.165561...",
  ".166661.166661.166661...",
  "..1111...1111...1111....",
]);

/** Where the headlamp's lens sits inside TRAIN_GRID, so it can be lit in place. */
export const LAMP_LENS = { dx: 3, dy: 11, width: 2, height: 2 };
