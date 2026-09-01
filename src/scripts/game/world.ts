import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import type { Rect } from "./physics";
import {
  drawPixelGrid,
  PLATFORM_TILE,
  TOY_BALL_GRID,
  TOY_BLOCK_GRID,
  TOY_PLUSH_GRID,
} from "./sprites";
import {
  PLATFORM_PALETTE,
  TOY_BALL_PALETTE,
  TOY_BLOCK_PALETTE,
  TOY_PLUSH_PALETTE,
} from "./constants";

const TILE_SCALE = 2;
const TILE_WIDTH = 16 * TILE_SCALE;
const TILE_HEIGHT = 8 * TILE_SCALE;

export interface Toy {
  x: number;
  y: number;
  grid: typeof TOY_BALL_GRID;
  palette: typeof TOY_BALL_PALETTE;
  scale: number;
}

export const platforms: Rect[] = [
  { x: 0, y: CANVAS_HEIGHT - 16, width: CANVAS_WIDTH, height: 16 },
  { x: 40, y: CANVAS_HEIGHT - 52, width: TILE_WIDTH, height: TILE_HEIGHT },
  { x: 110, y: CANVAS_HEIGHT - 76, width: TILE_WIDTH, height: TILE_HEIGHT },
  { x: 176, y: CANVAS_HEIGHT - 52, width: TILE_WIDTH, height: TILE_HEIGHT },
  { x: 200, y: CANVAS_HEIGHT - 100, width: TILE_WIDTH, height: TILE_HEIGHT },
];

export const toys: Toy[] = [
  { x: 20, y: CANVAS_HEIGHT - 36, grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE, scale: 1.6 },
  { x: 62, y: CANVAS_HEIGHT - 68, grid: TOY_BLOCK_GRID, palette: TOY_BLOCK_PALETTE, scale: 1.6 },
  { x: 130, y: CANVAS_HEIGHT - 90, grid: TOY_PLUSH_GRID, palette: TOY_PLUSH_PALETTE, scale: 1.6 },
  { x: 220, y: CANVAS_HEIGHT - 116, grid: TOY_BALL_GRID, palette: TOY_BALL_PALETTE, scale: 1.2 },
];

let backgroundCache: HTMLCanvasElement | null = null;

function buildBackground(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  const wallGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  wallGradient.addColorStop(0, "#3a2f52");
  wallGradient.addColorStop(1, "#241a38");
  ctx.fillStyle = wallGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let x = 0; x < CANVAS_WIDTH; x += 24) {
    ctx.fillRect(x, 0, 1, CANVAS_HEIGHT);
  }

  const floorY = CANVAS_HEIGHT - 16;
  ctx.fillStyle = "#8a5a2c";
  ctx.fillRect(0, floorY, CANVAS_WIDTH, 16);
  ctx.fillStyle = "#a8672f";
  ctx.fillRect(0, floorY, CANVAS_WIDTH, 3);
  ctx.fillStyle = "#5c3a1a";
  for (let x = 0; x < CANVAS_WIDTH; x += 20) {
    ctx.fillRect(x, floorY + 5, 14, 2);
  }

  const vignette = ctx.createRadialGradient(
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    20,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_WIDTH * 0.7,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  return canvas;
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  if (!backgroundCache) backgroundCache = buildBackground();
  ctx.drawImage(backgroundCache, 0, 0);
}

export function drawPlatforms(ctx: CanvasRenderingContext2D): void {
  for (const platform of platforms) {
    for (let x = platform.x; x < platform.x + platform.width; x += TILE_WIDTH) {
      drawPixelGrid(ctx, PLATFORM_TILE, PLATFORM_PALETTE, x, platform.y, TILE_SCALE);
    }
  }
}

export function drawToys(ctx: CanvasRenderingContext2D): void {
  for (const toy of toys) {
    drawPixelGrid(ctx, toy.grid, toy.palette, toy.x, toy.y, toy.scale);
  }
}
