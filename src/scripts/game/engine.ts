import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ROBOT_PALETTE,
  WATER_ROBOT_PALETTE,
  FIXED_DT,
} from "./constants";
import { InputTracker } from "./input";
import { createRobot, setRobotForm, updateRobot, type Robot } from "./robot";
import type { Rect } from "./physics";
import { Droplets } from "./particles";
import {
  createPuzzle,
  gateCollider,
  updatePuzzle,
  PUDDLE,
  type PuzzleState,
} from "./puzzle";
import {
  platforms,
  drawBackground,
  drawDoorway,
  drawPlatforms,
  drawToys,
  drawPuddle,
  drawPlate,
  drawConduit,
  drawGate,
  drawRobotShadow,
  drawAmbience,
} from "./world";
import {
  drawPixelGrid,
  ROBOT_GRID,
  WATER_ROBOT_GRID,
  WATER_ROBOT_SQUASH,
  type SpriteGrid,
} from "./sprites";

const MAX_DT = 1 / 20; // clamp long frames (tab switches) so physics stays stable
const FLOOR_TOP = CANVAS_HEIGHT - 16;
const SQUASH_TIME = 0.16; // how long the landing frame is held
const DRIP_INTERVAL = 0.55;

interface SpriteChoice {
  grid: SpriteGrid;
  offsetX: number;
  offsetY: number;
}

/**
 * Picks the frame for this instant. Sprites overhang the hitbox, and the
 * squash frame is wider and shorter, so each carries the offset that keeps its
 * feet on the ground and its body centred.
 */
function robotSprite(robot: Robot): SpriteChoice {
  if (robot.form === "dry") {
    return { grid: ROBOT_GRID, offsetX: -1, offsetY: -2 };
  }
  const squashing = robot.sinceLanded < SQUASH_TIME && robot.landingImpact > 0.25;
  if (squashing) {
    return { grid: WATER_ROBOT_SQUASH, offsetX: -2, offsetY: 0 };
  }
  return { grid: WATER_ROBOT_GRID, offsetX: -1, offsetY: -2 };
}

function drawRobot(ctx: CanvasRenderingContext2D, robot: Robot, time: number): void {
  const { grid, offsetX, offsetY } = robotSprite(robot);
  const palette = robot.form === "dry" ? ROBOT_PALETTE : WATER_ROBOT_PALETTE;
  const spriteWidth = grid[0].length;
  const x = robot.x + offsetX;
  const y = robot.y + offsetY;

  // The water form is never quite still: rows shear a pixel either way, most
  // at the top, so the body slops around over planted feet.
  let wobble: ((row: number) => number) | undefined;
  if (robot.form === "water") {
    // Kept under ~1 so rows shear by at most a pixel: any more and the head
    // visibly parts company with the body instead of looking squishy.
    const settling = Math.max(0, 1 - robot.sinceLanded / 0.45);
    const amount = 0.3 + settling * 0.55 + Math.min(1, Math.abs(robot.vx) / 60) * 0.2;
    const rows = grid.length;
    wobble = (row) => {
      const weight = 1 - row / rows; // planted at the feet, loose up top
      return Math.round(Math.sin(time * 6.5 - row * 0.45) * amount * weight);
    };
  }

  ctx.save();
  if (robot.facing === -1) {
    ctx.translate(x + spriteWidth, y);
    ctx.scale(-1, 1);
    drawPixelGrid(ctx, grid, palette, 0, 0, 1, wobble);
  } else {
    drawPixelGrid(ctx, grid, palette, x, y, 1, wobble);
  }
  ctx.restore();
}

function collidersFor(puzzle: PuzzleState): Rect[] {
  const colliders: Rect[] = platforms.slice();
  const gate = gateCollider(puzzle);
  if (gate) colliders.push(gate);
  return colliders;
}

export function startGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const input = new InputTracker();
  // Wakes up left of everything, so walking right meets the plate before the
  // water: you see it refuse your weight before you know what to do about it.
  const robot = createRobot(14, FLOOR_TOP - 14);
  const puzzle = createPuzzle();
  const droplets = new Droplets();

  let lastTime = performance.now();
  let accumulator = 0;
  let time = 0;
  let puddleSparkle = 0;

  function step(dt: number): void {
    const colliders = collidersFor(puzzle);
    updateRobot(robot, input, dt, colliders);

    const events = updatePuzzle(puzzle, robot, dt);

    if (events.absorbed) {
      setRobotForm(robot, "water");
      // The puddle leaps up into the robot.
      droplets.burst(
        PUDDLE.x + PUDDLE.width / 2,
        PUDDLE.y + PUDDLE.height - 2,
        22,
        78,
        PUDDLE.width * 0.8,
      );
    }
    if (events.latched) {
      droplets.burst(robot.x + robot.width / 2, robot.y + robot.height - 1, 10, 46, robot.width);
    }

    // A sodden robot drips, and splashes when it lands.
    if (robot.form === "water") {
      if (robot.dripTimer >= DRIP_INTERVAL) {
        robot.dripTimer = 0;
        const side = Math.random() < 0.5 ? 0.25 : 0.75;
        droplets.drip(robot.x + robot.width * side, robot.y + robot.height - 2);
      }
      if (robot.sinceLanded === 0 && robot.landingImpact > 0.35) {
        droplets.burst(
          robot.x + robot.width / 2,
          robot.y + robot.height - 1,
          Math.round(4 + robot.landingImpact * 7),
          40,
          robot.width + 4,
        );
      }
    }

    // The puddle throws off the occasional sparkle so it reads as interactive.
    puddleSparkle -= dt;
    if (puzzle.puddleAmount > 0.5 && puddleSparkle <= 0) {
      puddleSparkle = 0.7 + Math.random() * 0.8;
      const spread = PUDDLE.width * 0.4 * puzzle.puddleAmount;
      droplets.drip(
        PUDDLE.x + PUDDLE.width / 2 + (Math.random() - 0.5) * spread * 2,
        PUDDLE.y + PUDDLE.height - 3,
      );
    }

    droplets.update(dt, FLOOR_TOP - 1);
    time += dt;
  }

  function frame(now: number): void {
    accumulator += Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;

    // Fixed-step physics: several small updates per rendered frame rather than
    // one large one, so a fast fall can't skip clean through a thin platform.
    while (accumulator >= FIXED_DT) {
      step(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    drawBackground(ctx);
    drawDoorway(ctx);
    drawPlatforms(ctx);
    drawConduit(ctx, puzzle, time);
    drawPlate(ctx, puzzle, time);
    drawPuddle(ctx, puzzle, time);
    drawToys(ctx);
    drawGate(ctx, puzzle);
    drawRobotShadow(ctx, robot, collidersFor(puzzle));
    drawRobot(ctx, robot, time);
    droplets.draw(ctx);
    drawAmbience(ctx);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
