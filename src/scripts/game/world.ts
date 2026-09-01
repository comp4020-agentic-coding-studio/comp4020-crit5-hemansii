import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BATTERY_PALETTE,
  BATTERY_SPENT_PALETTE,
  CIRCUIT_PALETTE,
  PLATFORM_PALETTE,
  PUZZLE_PALETTE,
  TRAIN_PALETTE,
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
  RAIL_END,
  TRAIN_TOP,
  TRAIN_WIDTH,
  TUNNEL_MOUTH,
  TUNNEL_WALL,
  trainRect,
  type CircuitState,
} from "./circuit";
import type { Toy } from "./levels";
import {
  BATTERY_GRID,
  drawPixelGrid,
  drawSilhouette,
  LAMP_LENS,
  PLATFORM_TILE,
  TRAIN_GRID,
  TOY_PLUSH_GRID,
} from "./sprites";

const TILE_SIZE = 16;
const FLOOR_Y = CANVAS_HEIGHT - TILE_SIZE;

/** Light comes from the upper left, so shadows fall down and to the right. */
const LIGHT_X = 58;
const SHADOW = "rgba(14, 8, 28, 0.30)";
const CONTACT_SHADOW = "rgba(14, 8, 28, 0.42)";

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

export function drawPlatforms(ctx: CanvasRenderingContext2D, platforms: Rect[]): void {
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
  const cy = PUDDLE.y + PUDDLE.height - 1;
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

  // Chunky end brackets, so the whole thing reads as a mechanism rather than
  // a stripe painted on the floorboards.
  for (const bx of [PLATE_X - 4, PLATE_X + PLATE_WIDTH]) {
    ctx.fillStyle = PUZZLE_PALETTE.metalDark;
    ctx.fillRect(bx, wellTop - 2, 4, PLATE_TRAVEL + 6);
    ctx.fillStyle = PUZZLE_PALETTE.metal;
    ctx.fillRect(bx, wellTop - 2, 4, 1);
    ctx.fillStyle = PUZZLE_PALETTE.metalLight;
    ctx.fillRect(bx, wellTop - 2, 1, 1);
  }

  // A light body gets movement but no light: the plate is clearly a moving
  // part that simply is not moving enough.
  if (state.lightTouch) {
    const flicker = Math.sin(time * 18) > 0 ? 0.4 : 0.12;
    ctx.fillStyle = `rgba(255, 122, 69, ${flicker})`;
    ctx.fillRect(PLATE_X + 1, top, PLATE_WIDTH - 2, 1);
  }

  drawPlateLamp(ctx, state, time);
}

/**
 * The plate's state readout, mounted on the wall above it and clear of the
 * floor. Dark when idle, flashing amber under something too light, steady
 * green once it latches — the whole rule of the puzzle, told in one lamp.
 */
function drawPlateLamp(
  ctx: CanvasRenderingContext2D,
  state: PuzzleState,
  time: number,
): void {
  const cx = PLATE_X + PLATE_WIDTH / 2;
  const y = 100;

  ctx.fillStyle = PUZZLE_PALETTE.plateFrame;
  ctx.fillRect(cx - 5, y - 1, 10, 8);
  ctx.fillStyle = PUZZLE_PALETTE.metalDark;
  ctx.fillRect(cx - 4, y, 8, 6);
  ctx.fillStyle = PUZZLE_PALETTE.metal;
  ctx.fillRect(cx - 4, y, 8, 1);

  let bulb = "#5a4636";
  let glow: string | null = null;
  if (state.latched) {
    bulb = "#8fe3b0";
    glow = "rgba(126, 240, 192, 0.30)";
  } else if (state.lightTouch) {
    const on = Math.sin(time * 18) > 0;
    bulb = on ? "#ff9a5c" : "#6b4030";
    glow = on ? "rgba(255, 122, 69, 0.26)" : null;
  }

  ctx.fillStyle = bulb;
  ctx.fillRect(cx - 3, y + 2, 6, 3);
  if (state.latched) {
    ctx.fillStyle = "#d8fbe8";
    ctx.fillRect(cx - 3, y + 2, 6, 1);
  }

  // Light spilling down onto the plate ties the two together.
  if (glow) {
    const cone = ctx.createLinearGradient(0, y + 6, 0, FLOOR_Y);
    cone.addColorStop(0, glow);
    cone.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = cone;
    ctx.fillRect(cx - 12, y + 6, 24, FLOOR_Y - y - 6);
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

// ---------------------------------------------------------- electric puzzle

/**
 * The dark inside the tunnel, drawn before the locomotive so it sits in shadow
 * while it is still asleep. `drawTunnelShade` puts the same dark back over the
 * top afterwards, which is what makes driving out read as coming into the light.
 */
export function drawTunnelInterior(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = CIRCUIT_PALETTE.tunnel;
  ctx.fillRect(TUNNEL_MOUTH.x, TUNNEL_MOUTH.y, TUNNEL_MOUTH.width, TUNNEL_MOUTH.height);

  // A wooden arch around the mouth, so the recess reads as a built tunnel and
  // not a hole where the wall failed to draw. Lit on its leading edge, because
  // the mouth is the one part of it facing the room.
  const { x, y, width, height } = TUNNEL_MOUTH;
  ctx.fillStyle = PLATFORM_PALETTE[1];
  ctx.fillRect(x, y, 3, height);
  ctx.fillRect(x, y, width, 3);
  ctx.fillStyle = CIRCUIT_PALETTE.tunnelArch;
  ctx.fillRect(x, y, 2, height);
  ctx.fillRect(x, y, width, 2);
  ctx.fillStyle = PLATFORM_PALETTE[6];
  ctx.fillRect(x, y, 1, height - 1);
  ctx.fillRect(x, y, width, 1);

  // Keystone blocks along the arch, so it reads as built rather than extruded.
  ctx.fillStyle = PLATFORM_PALETTE[5];
  for (let bx = x + 4; bx < x + width; bx += 6) ctx.fillRect(bx, y, 1, 2);
}

export function drawTunnelShade(ctx: CanvasRenderingContext2D): void {
  const shade = ctx.createLinearGradient(
    TUNNEL_MOUTH.x,
    0,
    TUNNEL_MOUTH.x + TUNNEL_MOUTH.width,
    0,
  );
  // Light enough that the sleeping locomotive is plainly a locomotive: it has to
  // be recognisable from across the room for touching it to be an obvious move.
  shade.addColorStop(0, "rgba(11, 8, 24, 0.06)");
  shade.addColorStop(1, "rgba(11, 8, 24, 0.46)");
  ctx.fillStyle = shade;
  ctx.fillRect(TUNNEL_MOUTH.x + 2, TUNNEL_MOUTH.y + 2, TUNNEL_MOUTH.width - 2, TUNNEL_MOUTH.height - 2);
}

/**
 * The rail. Dead grey until the robot hands its charge over, then the discharge
 * spreads outwards from the contact along it — the same "you can see the cause
 * travel to the effect" trick the pressure plate's conduit uses, so the second
 * puzzle speaks a language the first one already taught.
 */
export function drawRail(
  ctx: CanvasRenderingContext2D,
  state: CircuitState,
  time: number,
): void {
  const headY = FLOOR_Y - 4;
  const bedY = FLOOR_Y - 3;
  const railX = state.config.railX;
  const span = RAIL_END - railX;
  const lit = state.powered;

  // Ballast, then sleepers across it, then the rail head sitting on top. Three
  // bands of 1px each is all the depth there is room for, and it is enough:
  // without the sleepers the rail read as a wire lying on the floorboards.
  ctx.fillStyle = "rgba(20, 12, 8, 0.55)";
  ctx.fillRect(railX, bedY, span, 3);
  for (let x = railX; x < RAIL_END; x += 6) {
    ctx.fillStyle = lit ? CIRCUIT_PALETTE.railTieLit : CIRCUIT_PALETTE.railTie;
    ctx.fillRect(x, bedY, 4, 3);
    ctx.fillStyle = "rgba(255, 226, 178, 0.14)";
    ctx.fillRect(x, bedY, 4, 1);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(railX, headY + 1, span, 1);
  ctx.fillStyle = CIRCUIT_PALETTE.railOff;
  ctx.fillRect(railX, headY, span, 1);

  if (!lit) return;

  // The charge entered at the nose of the sleeping locomotive and spreads both
  // ways from there.
  const contact = TUNNEL_WALL.x + 2;
  const left = contact - (contact - railX) * state.arc;
  const right = contact + (RAIL_END - contact) * state.arc;
  ctx.fillStyle = CIRCUIT_PALETTE.railOn;
  ctx.fillRect(Math.round(left), headY, Math.round(right - left), 1);

  if (state.arc < 1) {
    ctx.fillStyle = CIRCUIT_PALETTE.lampCore;
    ctx.fillRect(Math.round(left), headY - 1, 2, 3);
  } else {
    // Live rail: a bright pixel running along it, and a haze over the sleepers.
    const p = (time * 0.7) % 1;
    ctx.fillStyle = CIRCUIT_PALETTE.railGlow;
    ctx.fillRect(Math.round(railX + span * p), headY - 1, 2, 2);
    const haze = ctx.createLinearGradient(0, headY - 7, 0, headY + 2);
    haze.addColorStop(0, "rgba(255, 226, 74, 0)");
    haze.addColorStop(1, "rgba(255, 226, 74, 0.18)");
    ctx.fillStyle = haze;
    ctx.fillRect(railX, headY - 7, span, 9);
  }
}

/**
 * The battery. Crackling between its terminals while it holds a charge, dull
 * grey once the robot has taken it — the same object, in two states, so the
 * player can see at a glance that this one is spent.
 */
export function drawBattery(
  ctx: CanvasRenderingContext2D,
  state: CircuitState,
  time: number,
): void {
  const battery = state.config.battery;
  const charge = state.batteryCharge;
  const spent = charge <= 0.02;
  const palette = spent ? BATTERY_SPENT_PALETTE : BATTERY_PALETTE;

  fillEllipse(ctx, battery.x + battery.width / 2 + 1, battery.y + battery.height - 1, 6, 2, CONTACT_SHADOW);

  if (!spent) {
    const pulse = 0.16 + Math.abs(Math.sin(time * 3.1)) * 0.2 * charge;
    const cx = battery.x + battery.width / 2;
    const glow = ctx.createRadialGradient(cx, battery.y + 6, 1, cx, battery.y + 6, 18);
    glow.addColorStop(0, `rgba(255, 226, 74, ${pulse})`);
    glow.addColorStop(1, "rgba(255, 226, 74, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 18, battery.y - 12, 36, 36);
  }

  drawPixelGrid(ctx, BATTERY_GRID, palette, battery.x, battery.y, 1);

  if (spent) return;

  // Arcs skipping off the terminal. Deterministic from `time`, so it flickers
  // rather than strobes, and never lands on the same pixel two frames running.
  const cx = battery.x + battery.width / 2;
  for (let i = 0; i < 3; i++) {
    const phase = time * 9 + i * 2.1;
    if (Math.sin(phase * 1.7) < 0.2) continue;
    const dx = Math.round(Math.sin(phase) * 3);
    const dy = Math.round(-2 - Math.abs(Math.cos(phase * 1.3)) * 3);
    ctx.fillStyle = i === 0 ? CIRCUIT_PALETTE.lampCore : BATTERY_PALETTE[9];
    ctx.fillRect(cx + dx - 1, battery.y + dy, 1, 1);
  }
}

/** The locomotive, and its headlamp once there is something to light it with. */
export function drawTrain(
  ctx: CanvasRenderingContext2D,
  state: CircuitState,
  time: number,
): void {
  const train = trainRect(state);
  const x = Math.round(train.x);

  fillEllipse(ctx, x + TRAIN_WIDTH / 2, FLOOR_Y - 1, TRAIN_WIDTH / 2 - 1, 2, CONTACT_SHADOW);
  drawPixelGrid(ctx, TRAIN_GRID, TRAIN_PALETTE, x, TRAIN_TOP, 1);

  if (!state.powered) return;

  // Lamp lit, plus the beam it throws down the floor ahead of it.
  const flicker = 0.75 + Math.sin(time * 11) * 0.25;
  const lens = { x: x + LAMP_LENS.dx, y: TRAIN_TOP + LAMP_LENS.dy };
  ctx.fillStyle = CIRCUIT_PALETTE.lampLit;
  ctx.fillRect(lens.x, lens.y, LAMP_LENS.width, LAMP_LENS.height);
  ctx.fillStyle = CIRCUIT_PALETTE.lampCore;
  ctx.fillRect(lens.x, lens.y, 1, 1);

  const beam = ctx.createLinearGradient(lens.x, 0, lens.x - 26, 0);
  beam.addColorStop(0, `rgba(255, 246, 176, ${0.22 * flicker})`);
  beam.addColorStop(1, "rgba(255, 246, 176, 0)");
  ctx.fillStyle = beam;
  ctx.fillRect(lens.x - 26, lens.y - 5, 26, 16);

  const halo = ctx.createRadialGradient(lens.x + 1, lens.y + 1, 1, lens.x + 1, lens.y + 1, 9);
  halo.addColorStop(0, `rgba(255, 246, 176, ${0.4 * flicker})`);
  halo.addColorStop(1, "rgba(255, 246, 176, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(lens.x - 8, lens.y - 8, 18, 18);
}

/**
 * The charged form's aura, drawn under the sprite. A radial glow plus a couple
 * of arcs skipping across the hull: enough that the form reads as lit from
 * inside at 1px scale, where a recoloured sprite alone would not.
 */
export function drawChargeAura(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  time: number,
): void {
  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  const pulse = 0.26 + Math.abs(Math.sin(time * 5.3)) * 0.16;

  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 20);
  glow.addColorStop(0, `rgba(255, 246, 176, ${pulse})`);
  glow.addColorStop(0.45, `rgba(120, 226, 255, ${pulse * 0.5})`);
  glow.addColorStop(1, "rgba(120, 226, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 20, cy - 20, 40, 40);
}

/** Arcs crawling over the hull, drawn over the sprite so they read as on it. */
export function drawChargeArcs(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  time: number,
): void {
  for (let i = 0; i < 4; i++) {
    const phase = time * 7 + i * 1.9;
    if (Math.sin(phase * 2.3) < 0.35) continue;
    const t = (Math.sin(phase) + 1) / 2;
    const along = i % 2 === 0;
    const px = along
      ? body.x + Math.round(t * body.width)
      : body.x + (i === 1 ? -1 : body.width);
    const py = along
      ? body.y + (i === 0 ? -1 : body.height)
      : body.y + Math.round(t * body.height);
    ctx.fillStyle = i === 0 ? CIRCUIT_PALETTE.lampCore : CIRCUIT_PALETTE.railOn;
    ctx.fillRect(px, py, 1, 1);
  }
}

/**
 * The way out. A lit archway, warm where the whole room is cool, and the only
 * thing in the level that glows on its own — so "that is where I am going" needs
 * no telling. Drawn after the platforms so it sits in the surface it stands on.
 */
export function drawExit(
  ctx: CanvasRenderingContext2D,
  exit: Rect,
  time: number,
): void {
  const { x, y, width, height } = exit;
  // Breathes, but never dims: at the bottom of a wider swing the doorway went
  // dark enough to read as a hole in the wall rather than a way out of it.
  const pulse = 0.88 + Math.sin(time * 2.4) * 0.12;

  // Light thrown out into the room, so it reads as open air and not a painting.
  const spill = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    2,
    x + width / 2,
    y + height / 2,
    26,
  );
  spill.addColorStop(0, `rgba(255, 224, 160, ${0.5 * pulse})`);
  spill.addColorStop(1, "rgba(255, 224, 160, 0)");
  ctx.fillStyle = spill;
  ctx.fillRect(x + width / 2 - 26, y + height / 2 - 26, 52, 52);

  // The opening is full of light. A dark hole would read as scenery; the one
  // lit thing in a cool room reads as somewhere to go.
  ctx.fillStyle = PUZZLE_PALETTE.doorway;
  ctx.fillRect(x, y, width, height);
  const depth = ctx.createLinearGradient(0, y, 0, y + height);
  depth.addColorStop(0, `rgba(255, 250, 222, ${0.96 * pulse})`);
  depth.addColorStop(0.55, `rgba(255, 220, 152, ${0.92 * pulse})`);
  depth.addColorStop(1, `rgba(232, 168, 96, ${0.84 * pulse})`);
  ctx.fillStyle = depth;
  ctx.fillRect(x + 1, y + 1, width - 2, height - 1);

  // A brighter core, so it has a shape rather than being a flat wash.
  const core = ctx.createRadialGradient(
    x + width / 2,
    y + height * 0.62,
    1,
    x + width / 2,
    y + height * 0.62,
    width,
  );
  core.addColorStop(0, `rgba(255, 242, 196, ${0.35 * pulse})`);
  core.addColorStop(1, "rgba(255, 242, 196, 0)");
  ctx.fillStyle = core;
  ctx.fillRect(x + 1, y + 1, width - 2, height - 1);

  // Frame, lit down its left edge like everything else in the room.
  ctx.fillStyle = PLATFORM_PALETTE[1];
  ctx.fillRect(x - 2, y - 2, width + 4, 2);
  ctx.fillRect(x - 2, y - 2, 2, height + 2);
  ctx.fillRect(x + width, y - 2, 2, height + 2);
  ctx.fillStyle = PLATFORM_PALETTE[3];
  ctx.fillRect(x - 2, y - 2, width + 4, 1);
  ctx.fillRect(x - 2, y - 2, 1, height + 2);
  ctx.fillStyle = PLATFORM_PALETTE[6];
  ctx.fillRect(x - 1, y - 2, width + 2, 1);

  // A pool of light on the ground in front of the sill.
  fillEllipse(ctx, x + width / 2, y + height - 1, width / 2 + 5, 3, `rgba(255, 214, 150, ${0.4 * pulse})`);
}

// --------------------------------------------------------------------- toys

export function drawToys(ctx: CanvasRenderingContext2D, toys: Toy[]): void {
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
