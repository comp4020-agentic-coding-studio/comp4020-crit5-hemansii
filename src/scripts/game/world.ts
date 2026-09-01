import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLATFORM_PALETTE,
  PUZZLE_PALETTE,
  TOY_BALL_PALETTE,
  TOY_BLOCK_PALETTE,
  TOY_PLUSH_PALETTE,
  TOY_ROCKET_PALETTE,
  type Palette,
} from "./constants";
import type { Rect } from "./physics";
import {
  GATE,
  PLATE_TRAVEL,
  PLATE_WIDTH,
  PLATE_X,
  PUDDLE,
  plateTop,
  type PuzzleState,
} from "./puzzle";
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

/**
 * Level layout. The critical path is all at floor level plus the low steps
 * behind the gate, so the heavier water form can walk the whole puzzle; the
 * taller platforms are dry-form territory.
 */
export const platforms: Rect[] = [
  { x: 0, y: FLOOR_Y, width: CANVAS_WIDTH, height: TILE_SIZE }, // floor
  { x: 44, y: 88, width: 32, height: TILE_SIZE },
  { x: 96, y: 60, width: 32, height: TILE_SIZE },
  { x: 142, y: 88, width: 32, height: TILE_SIZE },
  { x: 178, y: 0, width: 16, height: 48 }, // door beam; seals the top of the gateway
  { x: 206, y: 112, width: 16, height: TILE_SIZE }, // step, behind the gate
  { x: 224, y: 92, width: 32, height: TILE_SIZE }, // reward ledge
];

export const toys: Toy[] = [
  { x: 53, y: 74, grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE },
  { x: 78, y: 114, grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE },
  { x: 104, y: 46, grid: TOY_PLUSH_GRID, palette: TOY_PLUSH_PALETTE },
  { x: 148, y: 70, grid: TOY_BLOCK_GRID, palette: TOY_BLOCK_PALETTE },
  { x: 232, y: 76, grid: TOY_ROCKET_GRID, palette: TOY_ROCKET_PALETTE },
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
  if (rx <= 0 || ry <= 0) return;
  ctx.fillStyle = color;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
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
  fillCircle(ctx, cx + 5, cy - 6, 4, "#ffe9a8");
  fillCircle(ctx, cx + 7, cy - 7, 4, "#132048");
  ctx.restore();

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
      ctx.fillStyle = "rgba(255, 236, 200, 0.09)";
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillStyle = "rgba(255, 236, 200, 0.055)";
      ctx.fillRect(x + 13, y + 9, 1, 1);
    }
  }
}

function drawFloorBoards(ctx: CanvasRenderingContext2D): void {
  for (let x = 0; x < CANVAS_WIDTH; x += 32) {
    ctx.fillStyle = PLATFORM_PALETTE[5];
    ctx.fillRect(x, FLOOR_Y + 1, 1, TILE_SIZE - 1);
    ctx.fillStyle = "rgba(255, 226, 178, 0.16)";
    ctx.fillRect(x + 1, FLOOR_Y + 1, 1, TILE_SIZE - 2);
  }

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

  const wall = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  wall.addColorStop(0, "#3b2f5e");
  wall.addColorStop(0.55, "#2f2449");
  wall.addColorStop(1, "#241a38");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawWallpaper(ctx);

  const lamp = ctx.createRadialGradient(LIGHT_X, -20, 10, LIGHT_X, -20, 190);
  lamp.addColorStop(0, "rgba(255, 208, 138, 0.22)");
  lamp.addColorStop(0.5, "rgba(255, 190, 130, 0.09)");
  lamp.addColorStop(1, "rgba(255, 190, 130, 0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawPorthole(ctx, 42, 40);
  drawBunting(ctx);

  drawSilhouette(ctx, TOY_PLUSH_GRID, "#352a52", 66, 100, 2);

  const junction = ctx.createLinearGradient(0, FLOOR_Y - 22, 0, FLOOR_Y);
  junction.addColorStop(0, "rgba(10, 5, 22, 0)");
  junction.addColorStop(1, "rgba(10, 5, 22, 0.42)");
  ctx.fillStyle = junction;
  ctx.fillRect(0, FLOOR_Y - 22, CANVAS_WIDTH, 22);

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

function restoreBackgroundPixel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  if (!backgroundCache) return;
  ctx.drawImage(backgroundCache, x, y, 1, 1, x, y, 1, 1);
}

/** The passage the portcullis guards, drawn before the platforms sit on top of it. */
export function drawDoorway(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PUZZLE_PALETTE.doorway;
  ctx.fillRect(GATE.x, GATE.y, GATE.width, GATE.height);
  // light spilling in from the left edge of the opening
  const glow = ctx.createLinearGradient(GATE.x, 0, GATE.x + GATE.width, 0);
  glow.addColorStop(0, "rgba(255, 214, 160, 0.16)");
  glow.addColorStop(1, "rgba(255, 214, 160, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(GATE.x, GATE.y, GATE.width, GATE.height);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(GATE.x + GATE.width - 1, GATE.y, 1, GATE.height);
}

// ---------------------------------------------------------------- platforms

export function drawPlatforms(ctx: CanvasRenderingContext2D): void {
  for (const platform of platforms) {
    const isFloor = platform.y >= FLOOR_Y;

    if (!isFloor) {
      ctx.fillStyle = SHADOW;
      ctx.fillRect(platform.x + 2, platform.y + platform.height, platform.width, 2);
      ctx.fillStyle = "rgba(14, 8, 28, 0.16)";
      ctx.fillRect(platform.x + 4, platform.y + platform.height + 2, platform.width - 2, 2);
    }

    // Clip so a platform whose size is not a whole number of tiles still stops
    // exactly at its own edges.
    ctx.save();
    ctx.beginPath();
    ctx.rect(platform.x, platform.y, platform.width, platform.height);
    ctx.clip();
    for (let y = platform.y; y < platform.y + platform.height; y += TILE_SIZE) {
      for (let x = platform.x; x < platform.x + platform.width; x += TILE_SIZE) {
        drawPixelGrid(ctx, PLATFORM_TILE, PLATFORM_PALETTE, x, y, 1);
      }
    }
    ctx.restore();

    if (isFloor) continue;

    ctx.fillStyle = PLATFORM_PALETTE[1];
    ctx.fillRect(platform.x, platform.y, 1, platform.height);
    ctx.fillRect(platform.x + platform.width - 1, platform.y, 1, platform.height);
    ctx.fillRect(platform.x, platform.y + platform.height - 1, platform.width, 1);

    ctx.fillStyle = PLATFORM_PALETTE[6];
    ctx.fillRect(platform.x + 1, platform.y, platform.width - 2, 1);

    restoreBackgroundPixel(ctx, platform.x, platform.y);
    restoreBackgroundPixel(ctx, platform.x + platform.width - 1, platform.y);
  }

  drawFloorBoards(ctx);
}

// ------------------------------------------------------------------- puzzle

/** Shallow water, shimmering enough to read as something you can walk into. */
export function drawPuddle(
  ctx: CanvasRenderingContext2D,
  state: PuzzleState,
  time: number,
): void {
  const amount = state.puddleAmount;
  if (amount <= 0.02) return;

  const cx = PUDDLE.x + PUDDLE.width / 2;
  const cy = FLOOR_Y - 1;
  const breathe = Math.sin(time * 2.2) * 0.5;
  const rx = (PUDDLE.width / 2) * amount + breathe;
  const ry = 3 * amount;

  fillEllipse(ctx, cx, cy, rx, ry, PUZZLE_PALETTE.waterDeep);
  fillEllipse(ctx, cx, cy, rx - 1, ry - 0.8, PUZZLE_PALETTE.waterMid);
  fillEllipse(ctx, cx - 1, cy - 1, (rx - 3) * 0.7, 1, PUZZLE_PALETTE.waterLight);

  // glints drifting across the surface
  for (let i = 0; i < 3; i++) {
    const p = (time * 0.32 + i / 3) % 1;
    const gx = cx - rx + p * rx * 2;
    const fade = Math.sin(p * Math.PI);
    if (fade < 0.3) continue;
    ctx.fillStyle = PUZZLE_PALETTE.waterGlint;
    ctx.fillRect(Math.round(gx), Math.round(cy - 1), 1, 1);
  }
}

/** The pressure plate: a wide, shallow button that visibly sinks under weight. */
export function drawPlate(
  ctx: CanvasRenderingContext2D,
  state: PuzzleState,
  time: number,
): void {
  const top = Math.round(plateTop(state));
  const lit = state.latched;
  const wellTop = FLOOR_Y - PLATE_TRAVEL;

  // The well the pad sits in, sunk into the floorboards.
  ctx.fillStyle = PUZZLE_PALETTE.plateFrame;
  ctx.fillRect(PLATE_X - 3, wellTop - 1, PLATE_WIDTH + 6, PLATE_TRAVEL + 5);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(PLATE_X - 1, wellTop, PLATE_WIDTH + 2, PLATE_TRAVEL + 2);

  // The pad itself, riding up and down inside the well.
  const faceHeight = FLOOR_Y + 2 - top;
  ctx.fillStyle = lit ? PUZZLE_PALETTE.plateFaceLit : PUZZLE_PALETTE.plateFace;
  ctx.fillRect(PLATE_X, top, PLATE_WIDTH, faceHeight);

  // Hazard chevrons read as "heavy duty" without spelling anything out.
  ctx.fillStyle = lit ? PUZZLE_PALETTE.plateStripeLit : PUZZLE_PALETTE.plateStripe;
  for (let i = -4; i < PLATE_WIDTH; i += 7) {
    for (let r = 0; r < faceHeight; r++) {
      const sx = PLATE_X + i + r;
      const w = Math.min(3, PLATE_X + PLATE_WIDTH - sx);
      if (sx >= PLATE_X && w > 0) ctx.fillRect(sx, top + r, w, 1);
    }
  }

  // Lit rim along the top edge, and end caps so it reads as a machined part.
  ctx.fillStyle = lit ? "#d8fbe8" : PUZZLE_PALETTE.plateRim;
  ctx.fillRect(PLATE_X + 1, top, PLATE_WIDTH - 2, 1);
  ctx.fillStyle = PUZZLE_PALETTE.metalDark;
  ctx.fillRect(PLATE_X, top, 1, faceHeight);
  ctx.fillRect(PLATE_X + PLATE_WIDTH - 1, top, 1, faceHeight);

  // A light body gets movement but no light: the plate is clearly a moving
  // part that simply is not moving enough.
  if (state.lightTouch) {
    const flicker = Math.sin(time * 18) > 0 ? 0.4 : 0.12;
    ctx.fillStyle = `rgba(255, 122, 69, ${flicker})`;
    ctx.fillRect(PLATE_X + 1, top, PLATE_WIDTH - 2, 1);
  }
}

/** Conduit along the floor from plate to gate; carries a visible pulse when it fires. */
export function drawConduit(
  ctx: CanvasRenderingContext2D,
  state: PuzzleState,
  time: number,
): void {
  const from = PLATE_X + PLATE_WIDTH;
  const to = GATE.x;
  const y = FLOOR_Y + 2;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(from, y - 1, to - from, 4);
  ctx.fillStyle = PUZZLE_PALETTE.conduitOff;
  ctx.fillRect(from, y, to - from, 2);

  if (!state.latched) return;

  const head = from + (to - from) * state.signal;
  ctx.fillStyle = PUZZLE_PALETTE.conduitOn;
  ctx.fillRect(from, y, Math.max(0, head - from), 2);

  if (state.signal < 1) {
    // bright leading edge of the pulse
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(head) - 2, y - 1, 3, 4);
  } else {
    // steady glow, gently breathing, plus a travelling spark
    const p = (time * 0.55) % 1;
    ctx.fillStyle = "rgba(190, 255, 230, 0.85)";
    ctx.fillRect(Math.round(from + (to - from) * p), y - 1, 2, 4);
  }
}

/** The portcullis: slats that retract upwards into the beam above. */
export function drawGate(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
  const height = GATE.height * (1 - state.gateOpenness);
  if (height < 1) return;

  const x = GATE.x;
  const top = GATE.y;
  const bottom = top + height;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, top, GATE.width, height);
  ctx.clip();

  // Vertical bars with the dark passage showing between them, so it reads as
  // a portcullis you are being kept behind rather than a ladder.
  for (const bx of [0, 4, 9, 14]) {
    ctx.fillStyle = PUZZLE_PALETTE.metal;
    ctx.fillRect(x + bx, top, 2, height);
    ctx.fillStyle = PUZZLE_PALETTE.metalLight;
    ctx.fillRect(x + bx, top, 1, height);
    ctx.fillStyle = PUZZLE_PALETTE.metalDark;
    ctx.fillRect(x + bx + 1, top, 1, height);
  }

  // cross-bands bracing the bars together
  for (let y = top + 6; y < bottom - 4; y += 14) {
    ctx.fillStyle = PUZZLE_PALETTE.metal;
    ctx.fillRect(x, y, GATE.width, 2);
    ctx.fillStyle = PUZZLE_PALETTE.metalLight;
    ctx.fillRect(x, y, GATE.width, 1);
  }

  // heavy bottom bar
  ctx.fillStyle = PUZZLE_PALETTE.metalDark;
  ctx.fillRect(x, bottom - 4, GATE.width, 4);
  ctx.fillStyle = PUZZLE_PALETTE.metal;
  ctx.fillRect(x, bottom - 4, GATE.width, 1);
  ctx.restore();
}

// --------------------------------------------------------------------- toys

export function drawToys(ctx: CanvasRenderingContext2D): void {
  for (const toy of toys) {
    const width = toy.grid[0].length;
    const height = toy.grid.length;
    fillEllipse(ctx, toy.x + width / 2 + 1, toy.y + height - 1, width / 2 - 1, 2, CONTACT_SHADOW);
    drawPixelGrid(ctx, toy.grid, toy.palette, toy.x, toy.y, 1);
  }
}

/**
 * Drops a soft shadow from the robot onto the nearest surface below it, fading
 * and shrinking with height. Purely visual, but it's what tells you where you
 * are about to land.
 */
export function drawRobotShadow(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  colliders: Rect[],
): void {
  const feet = body.y + body.height;
  let surface = Number.POSITIVE_INFINITY;

  for (const platform of colliders) {
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

  const warm = ctx.createRadialGradient(LIGHT_X, -10, 10, LIGHT_X, -10, 170);
  warm.addColorStop(0, "rgba(255, 206, 140, 0.12)");
  warm.addColorStop(1, "rgba(255, 206, 140, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
