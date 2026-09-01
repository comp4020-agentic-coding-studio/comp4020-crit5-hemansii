import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLATFORM_PALETTE,
  TOY_BALL_PALETTE,
  TOY_BLOCK_PALETTE,
  TOY_PLUSH_PALETTE,
  TOY_ROCKET_PALETTE,
  type Palette,
} from "./constants";
import type { Rect } from "./physics";
import {
  drawPixelGrid,
  drawSilhouette,
  PLATFORM_TILE,
  TOY_BALL_GRID,
  TOY_BLOCK_GRID,
  TOY_PLUSH_GRID,
  TOY_ROCKET_GRID,
  type SpriteGrid,
} from "./sprites";

const TILE_SIZE = 16;
const FLOOR_Y = CANVAS_HEIGHT - TILE_SIZE;

/** Light comes from the upper left, so shadows fall down and to the right. */
const LIGHT_X = 58;
const SHADOW = "rgba(14, 8, 28, 0.30)";
const CONTACT_SHADOW = "rgba(14, 8, 28, 0.42)";

export interface Toy {
  x: number;
  y: number;
  grid: SpriteGrid;
  palette: Palette;
}

export const platforms: Rect[] = [
  { x: 0, y: FLOOR_Y, width: CANVAS_WIDTH, height: TILE_SIZE },
  { x: 40, y: CANVAS_HEIGHT - 52, width: 32, height: TILE_SIZE },
  { x: 110, y: CANVAS_HEIGHT - 76, width: 32, height: TILE_SIZE },
  { x: 176, y: CANVAS_HEIGHT - 52, width: 32, height: TILE_SIZE },
  { x: 200, y: CANVAS_HEIGHT - 100, width: 32, height: TILE_SIZE },
];

export const toys: Toy[] = [
  { x: 84, y: 110, grid: TOY_BLOCK_GRID, palette: TOY_BLOCK_PALETTE },
  { x: 146, y: 114, grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE },
  { x: 49, y: 78, grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE },
  { x: 118, y: 54, grid: TOY_PLUSH_GRID, palette: TOY_PLUSH_PALETTE },
  { x: 209, y: 28, grid: TOY_ROCKET_GRID, palette: TOY_ROCKET_PALETTE },
];

// ---------------------------------------------------------------- primitives

/** Pixel-crisp filled circle: one fillRect per scanline, no anti-aliased edge. */
function fillCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const span = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - span, cy + y, span * 2 + 1, 1);
  }
}

function fillEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t <= 0) continue;
    const span = Math.floor(rx * Math.sqrt(t));
    if (span <= 0) continue;
    ctx.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2, 1);
  }
}

// --------------------------------------------------------------- background

const BUNTING_COLORS = [
  ["#ef4b6b", "#ff8ba0"],
  ["#ffd166", "#ffe9a8"],
  ["#4dd4c4", "#9ff0e6"],
  ["#a78bfa", "#cbb8ff"],
  ["#7fd67f", "#b6ecb6"],
];

function drawBunting(ctx: CanvasRenderingContext2D): void {
  const sag = 11;
  const baseY = 4;
  const stringY = (x: number) =>
    Math.round(baseY + Math.sin((x / CANVAS_WIDTH) * Math.PI) * sag);

  ctx.fillStyle = "#241a38";
  for (let x = 0; x < CANVAS_WIDTH; x++) {
    ctx.fillRect(x, stringY(x), 1, 1);
  }

  let i = 0;
  for (let x = 12; x < CANVAS_WIDTH - 8; x += 21) {
    const [face, lit] = BUNTING_COLORS[i % BUNTING_COLORS.length];
    const top = stringY(x) + 1;
    for (let row = 0; row < 9; row++) {
      const half = Math.round(((9 - row) / 9) * 4.5);
      if (half <= 0) continue;
      ctx.fillStyle = face;
      ctx.fillRect(x - half, top + row, half * 2, 1);
      // a lit left edge so each flag has a little form
      ctx.fillStyle = lit;
      ctx.fillRect(x - half, top + row, 1, 1);
    }
    i++;
  }
}

/** A porthole onto a starfield — the space the little robot presumably came from. */
function drawPorthole(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  fillCircle(ctx, cx, cy, 15, "#2a2040");
  fillCircle(ctx, cx, cy, 14, "#8593a3");
  fillCircle(ctx, cx, cy, 12, "#5d6a7c");
  fillCircle(ctx, cx, cy, 11, "#0e1730");

  // night sky gradient inside the glass
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + 0.5, cy + 0.5, 11, 0, Math.PI * 2);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, cy - 11, 0, cy + 11);
  sky.addColorStop(0, "#1b2b5c");
  sky.addColorStop(1, "#0b1226");
  ctx.fillStyle = sky;
  ctx.fillRect(cx - 12, cy - 12, 24, 24);

  const stars: Array<[number, number, string]> = [
    [-7, -6, "#ffffff"],
    [-2, -8, "#cfe4ff"],
    [4, -4, "#ffffff"],
    [-5, 2, "#9fb8e8"],
    [6, 4, "#cfe4ff"],
    [1, 7, "#ffffff"],
    [-8, 6, "#8fa6d8"],
  ];
  for (const [dx, dy, color] of stars) {
    ctx.fillStyle = color;
    ctx.fillRect(cx + dx, cy + dy, 1, 1);
  }
  // a small crescent moon
  fillCircle(ctx, cx + 5, cy - 6, 4, "#ffe9a8");
  fillCircle(ctx, cx + 7, cy - 7, 4, "#132048");
  ctx.restore();

  // rim light on the frame, top-left
  ctx.fillStyle = "#d6dee6";
  for (let a = Math.PI * 0.75; a < Math.PI * 1.45; a += 0.06) {
    ctx.fillRect(Math.round(cx + Math.cos(a) * 13), Math.round(cy + Math.sin(a) * 13), 1, 1);
  }
}

function drawWallpaper(ctx: CanvasRenderingContext2D): void {
  for (let row = 0; row * 18 < CANVAS_HEIGHT; row++) {
    const y = 8 + row * 18;
    const offset = row % 2 === 0 ? 0 : 13;
    for (let x = 6 + offset; x < CANVAS_WIDTH; x += 26) {
      // four-point star
      ctx.fillStyle = "rgba(255, 236, 200, 0.09)";
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillRect(x - 1, y, 3, 1);
      // a dot between stars
      ctx.fillStyle = "rgba(255, 236, 200, 0.055)";
      ctx.fillRect(x + 13, y + 9, 1, 1);
    }
  }
}

/**
 * Breaks the tiled floor into individual boards. Seen edge-on a rug would just
 * be a stripe, so the floor earns its detail from carpentry instead: board
 * joins, a lit chamfer beside each, and a slight warm/cool drift across the run.
 */
function drawFloorBoards(ctx: CanvasRenderingContext2D): void {
  for (let x = 0; x < CANVAS_WIDTH; x += 32) {
    ctx.fillStyle = PLATFORM_PALETTE[5];
    ctx.fillRect(x, FLOOR_Y + 1, 1, TILE_SIZE - 1);
    ctx.fillStyle = "rgba(255, 226, 178, 0.16)";
    ctx.fillRect(x + 1, FLOOR_Y + 1, 1, TILE_SIZE - 2);
  }

  // Warm the boards nearer the lamp and cool the ones furthest from it.
  const drift = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  drift.addColorStop(0, "rgba(255, 198, 128, 0.10)");
  drift.addColorStop(0.35, "rgba(255, 198, 128, 0.03)");
  drift.addColorStop(1, "rgba(60, 40, 100, 0.16)");
  ctx.fillStyle = drift;
  ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, TILE_SIZE);
}

let backgroundCache: HTMLCanvasElement | null = null;

function buildBackground(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Back wall: cool indigo up top warming towards the floor.
  const wall = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  wall.addColorStop(0, "#3b2f5e");
  wall.addColorStop(0.55, "#2f2449");
  wall.addColorStop(1, "#241a38");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawWallpaper(ctx);

  // Warm lamp pool spilling in from the upper left, the scene's key light.
  const lamp = ctx.createRadialGradient(LIGHT_X, -20, 10, LIGHT_X, -20, 190);
  lamp.addColorStop(0, "rgba(255, 208, 138, 0.22)");
  lamp.addColorStop(0.5, "rgba(255, 190, 130, 0.09)");
  lamp.addColorStop(1, "rgba(255, 190, 130, 0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawPorthole(ctx, 42, 44);
  drawBunting(ctx);

  // Toys further back in the room, flattened to silhouettes so they recede.
  drawSilhouette(ctx, TOY_PLUSH_GRID, "#352a52", 226, 100, 2);
  drawSilhouette(ctx, TOY_BLOCK_GRID, "#31274c", 4, 96, 2);

  // Ambient occlusion where the wall meets the floor.
  const junction = ctx.createLinearGradient(0, FLOOR_Y - 22, 0, FLOOR_Y);
  junction.addColorStop(0, "rgba(10, 5, 22, 0)");
  junction.addColorStop(1, "rgba(10, 5, 22, 0.42)");
  ctx.fillStyle = junction;
  ctx.fillRect(0, FLOOR_Y - 22, CANVAS_WIDTH, 22);

  // Dust motes catching the lamp light.
  const motes: Array<[number, number, number]> = [
    [38, 30, 0.18],
    [72, 18, 0.12],
    [96, 52, 0.14],
    [131, 26, 0.1],
    [150, 66, 0.12],
    [63, 74, 0.1],
    [168, 40, 0.1],
    [22, 58, 0.13],
  ];
  for (const [x, y, alpha] of motes) {
    ctx.fillStyle = `rgba(255, 240, 214, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  return canvas;
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  if (!backgroundCache) backgroundCache = buildBackground();
  ctx.drawImage(backgroundCache, 0, 0);
}

/** Repaints one pixel of cached background, used to round platform corners. */
function restoreBackgroundPixel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  if (!backgroundCache) return;
  ctx.drawImage(backgroundCache, x, y, 1, 1, x, y, 1, 1);
}

// ---------------------------------------------------------------- platforms

export function drawPlatforms(ctx: CanvasRenderingContext2D): void {
  for (const platform of platforms) {
    const isFloor = platform.y >= FLOOR_Y;

    // Cast shadow, offset away from the key light.
    if (!isFloor) {
      ctx.fillStyle = SHADOW;
      ctx.fillRect(platform.x + 2, platform.y + platform.height, platform.width, 2);
      ctx.fillStyle = "rgba(14, 8, 28, 0.16)";
      ctx.fillRect(platform.x + 4, platform.y + platform.height + 2, platform.width - 2, 2);
    }

    for (let x = platform.x; x < platform.x + platform.width; x += TILE_SIZE) {
      drawPixelGrid(ctx, PLATFORM_TILE, PLATFORM_PALETTE, x, platform.y, 1);
    }

    if (isFloor) continue;

    // A dark edge all round turns repeating texture into a solid object.
    ctx.fillStyle = PLATFORM_PALETTE[1];
    ctx.fillRect(platform.x, platform.y, 1, platform.height);
    ctx.fillRect(platform.x + platform.width - 1, platform.y, 1, platform.height);
    ctx.fillRect(platform.x, platform.y + platform.height - 1, platform.width, 1);

    // Warm rim along the lit top edge, cooling towards the shadowed side.
    ctx.fillStyle = PLATFORM_PALETTE[6];
    ctx.fillRect(platform.x + 1, platform.y, platform.width - 2, 1);

    // Knock the top corners off so the block reads as a rounded toy.
    restoreBackgroundPixel(ctx, platform.x, platform.y);
    restoreBackgroundPixel(ctx, platform.x + platform.width - 1, platform.y);
  }

  drawFloorBoards(ctx);
}

// --------------------------------------------------------------------- toys

export function drawToys(ctx: CanvasRenderingContext2D): void {
  for (const toy of toys) {
    const width = toy.grid[0].length;
    const height = toy.grid.length;
    // Contact shadow grounds each toy on the surface it rests on.
    fillEllipse(ctx, toy.x + width / 2 + 1, toy.y + height - 1, width / 2 - 1, 2, CONTACT_SHADOW);
    drawPixelGrid(ctx, toy.grid, toy.palette, toy.x, toy.y, 1);
  }
}

/**
 * Drops a soft shadow from the robot onto the nearest surface below it, fading
 * and shrinking with height. Purely visual, but it's what tells you where you
 * are about to land.
 */
export function drawRobotShadow(ctx: CanvasRenderingContext2D, body: Rect): void {
  const feet = body.y + body.height;
  let surface = Number.POSITIVE_INFINITY;

  for (const platform of platforms) {
    const overlapsX = body.x < platform.x + platform.width && body.x + body.width > platform.x;
    if (!overlapsX) continue;
    if (platform.y + 1 >= feet && platform.y < surface) surface = platform.y;
  }
  if (!Number.isFinite(surface)) return;

  const drop = surface - feet;
  if (drop > 70) return;

  const falloff = 1 - Math.min(drop, 70) / 70;
  const rx = (body.width / 2) * (0.55 + falloff * 0.45);
  const alpha = 0.05 + falloff * 0.3;
  fillEllipse(ctx, body.x + body.width / 2, surface - 1, rx, 2, `rgba(14, 8, 28, ${alpha})`);
}

// ------------------------------------------------------------------ ambience

let foregroundCache: HTMLCanvasElement | null = null;

function buildForeground(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Warm wash from the key light, over everything so the whole scene shares it.
  const warm = ctx.createRadialGradient(LIGHT_X, -10, 10, LIGHT_X, -10, 170);
  warm.addColorStop(0, "rgba(255, 206, 140, 0.12)");
  warm.addColorStop(1, "rgba(255, 206, 140, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Vignette, tinted violet rather than black so it stays in the palette.
  const vignette = ctx.createRadialGradient(
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    46,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_WIDTH * 0.66,
  );
  vignette.addColorStop(0, "rgba(20, 10, 38, 0)");
  vignette.addColorStop(1, "rgba(20, 10, 38, 0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  return canvas;
}

/** Lighting pass drawn last, so it sits over the robot and toys too. */
export function drawAmbience(ctx: CanvasRenderingContext2D): void {
  if (!foregroundCache) foregroundCache = buildForeground();
  ctx.drawImage(foregroundCache, 0, 0);
}
