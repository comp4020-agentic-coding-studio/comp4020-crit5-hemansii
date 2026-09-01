import { CANVAS_WIDTH, CANVAS_HEIGHT, ROBOT_PALETTE, FIXED_DT } from "./constants";
import { InputTracker } from "./input";
import { createRobot, updateRobot, type Robot } from "./robot";
import { platforms, drawBackground, drawPlatforms, drawToys } from "./world";
import { drawPixelGrid, ROBOT_GRID } from "./sprites";

const MAX_DT = 1 / 20; // clamp long frames (tab switches) so physics stays stable

function drawRobot(ctx: CanvasRenderingContext2D, robot: Robot): void {
  ctx.save();
  if (robot.facing === -1) {
    ctx.translate(robot.x + robot.width, robot.y);
    ctx.scale(-1, 1);
    drawPixelGrid(ctx, ROBOT_GRID, ROBOT_PALETTE, 0, 0, 1);
  } else {
    drawPixelGrid(ctx, ROBOT_GRID, ROBOT_PALETTE, robot.x, robot.y, 1);
  }
  ctx.restore();
}

export function startGame(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const input = new InputTracker();
  const robot = createRobot(20, CANVAS_HEIGHT - 30);

  let lastTime = performance.now();
  let accumulator = 0;

  function frame(time: number): void {
    accumulator += Math.min((time - lastTime) / 1000, MAX_DT);
    lastTime = time;

    // Fixed-step physics: several small updateRobot calls per rendered frame
    // rather than one large step, so a fast fall can't skip clean through a
    // thin platform in a single dt before it's ever recorded as grounded.
    while (accumulator >= FIXED_DT) {
      updateRobot(robot, input, FIXED_DT, platforms);
      accumulator -= FIXED_DT;
    }

    drawBackground(ctx);
    drawPlatforms(ctx);
    drawToys(ctx);
    drawRobot(ctx, robot);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
