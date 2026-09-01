import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ELECTRIC_ROBOT_PALETTE,
  ROBOT_PALETTE,
  WATER_ROBOT_PALETTE,
  FIXED_DT,
  type Palette,
} from "./constants";
import { InputTracker } from "./input";
import type { RobotForm } from "./forms";
import type { Robot } from "./robot";
import { Confetti, Droplets, Sparks } from "./particles";
import { createWorld, stepWorld, worldColliders, type World } from "./sim";
import { trainRect, TRAIN_TOP, TRAIN_WIDTH } from "./circuit";
import { LEVELS } from "./levels";
import { PUDDLE } from "./puzzle";
import {
  drawBackground,
  drawBattery,
  drawExit,
  drawChargeArcs,
  drawChargeAura,
  drawDoorway,
  drawPlatforms,
  drawRail,
  drawToys,
  drawTrain,
  drawTunnelInterior,
  drawTunnelShade,
  drawPuddle,
  drawPlate,
  drawConduit,
  drawGate,
  drawRobotShadow,
  drawAmbience,
} from "./world";
import {
  drawPixelGrid,
  ELECTRIC_ROBOT_GRID,
  ROBOT_GRID,
  WATER_ROBOT_GRID,
  WATER_ROBOT_SQUASH,
  type SpriteGrid,
} from "./sprites";

const MAX_DT = 1 / 20; // clamp long frames (tab switches) so physics stays stable
const FLOOR_TOP = CANVAS_HEIGHT - 16;
const SQUASH_TIME = 0.16; // how long the landing frame is held
const DRIP_INTERVAL = 0.55;
const FIZZ_INTERVAL = 0.07; // the charged form's ambient crackle
const WIPE_TIME = 0.55; // how long the fade between levels lasts, each way
const HOP_INTERVAL = 0.7; // how often the robot bounces once the run is complete

const FORM_PALETTES: Record<RobotForm, Palette> = {
  dry: ROBOT_PALETTE,
  water: WATER_ROBOT_PALETTE,
  electric: ELECTRIC_ROBOT_PALETTE,
};

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
  if (robot.form === "water") {
    const squashing = robot.sinceLanded < SQUASH_TIME && robot.landingImpact > 0.25;
    if (squashing) {
      return { grid: WATER_ROBOT_SQUASH, offsetX: -2, offsetY: 0 };
    }
    return { grid: WATER_ROBOT_GRID, offsetX: -1, offsetY: -2 };
  }
  const grid = robot.form === "electric" ? ELECTRIC_ROBOT_GRID : ROBOT_GRID;
  return { grid, offsetX: -1, offsetY: -2 };
}

function drawRobot(ctx: CanvasRenderingContext2D, robot: Robot, time: number): void {
  const { grid, offsetX, offsetY } = robotSprite(robot);
  const palette = FORM_PALETTES[robot.form];
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

  if (robot.form === "electric") drawChargeAura(ctx, robot, time);

  ctx.save();
  if (robot.facing === -1) {
    ctx.translate(x + spriteWidth, y);
    ctx.scale(-1, 1);
    drawPixelGrid(ctx, grid, palette, 0, 0, 1, wobble);
  } else {
    drawPixelGrid(ctx, grid, palette, x, y, 1, wobble);
  }
  ctx.restore();

  if (robot.form === "electric") drawChargeArcs(ctx, robot, time);
}

/** What the page needs to know to draw a sidebar. */
export interface GameState {
  levelIndex: number;
  /** One flag per level, true once its exit has been reached. */
  cleared: boolean[];
  /** All three finished. */
  complete: boolean;
  /** False before Play is pressed, and while the page is showing a menu. */
  running: boolean;
}

/** What the page can do to the game. */
export interface GameHandle {
  play(): void;
  pause(): void;
  goToLevel(index: number): void;
  replay(): void;
  onChange(listener: (state: GameState) => void): void;
}

export function startGame(canvas: HTMLCanvasElement): GameHandle {
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const input = new InputTracker();
  const droplets = new Droplets();
  const sparks = new Sparks();
  const confetti = new Confetti();

  let world = createWorld(0);
  /** Set once the last level is finished. The run stops advancing and celebrates. */
  let complete = false;
  let hopTimer = 0;
  /** The game holds still until Play is pressed, so the sidebar can be read first. */
  let running = false;
  const cleared = LEVELS.map(() => false);
  const listeners: Array<(state: GameState) => void> = [];

  const publish = () => {
    const state: GameState = {
      levelIndex: world.levelIndex,
      cleared: cleared.slice(),
      complete,
      running,
    };
    for (const listener of listeners) listener(state);
  };
  /** Counts up once a level is finished, and drives the fade out and back in. */
  let wipe = 0;

  let lastTime = performance.now();
  let accumulator = 0;
  let time = 0;
  let puddleSparkle = 0;
  let wheelSpark = 0;

  function step(dt: number): void {
    const { robot, puzzle, circuit } = world;

    // Simulation first, then everything the simulation is worth watching for.
    const events = stepWorld(world, input, dt);

    if (events.finished) {
      sparks.burst(robot.x + robot.width / 2, robot.y + robot.height / 2, 26, 120, robot.width);
      cleared[world.levelIndex] = true;
      if (world.levelIndex === LEVELS.length - 1) {
        complete = true;
        confetti.rain(CANVAS_WIDTH, 90);
      }
      publish();
    }

    if (events.puzzle?.absorbed) {
      // The puddle leaps up into the robot.
      droplets.burst(
        PUDDLE.x + PUDDLE.width / 2,
        PUDDLE.y + PUDDLE.height - 2,
        22,
        78,
        PUDDLE.width * 0.8,
      );
    }
    if (events.puzzle?.latched) {
      droplets.burst(robot.x + robot.width / 2, robot.y + robot.height - 1, 10, 46, robot.width);
    }

    if (events.circuit?.charged && circuit) {
      const cell = circuit.config.battery;
      sparks.burst(cell.x + cell.width / 2, cell.y + 4, 20, 130, cell.width);
      sparks.burst(robot.x + robot.width / 2, robot.y + robot.height / 2, 16, 100, robot.width);
      // Whatever it was holding is gone, and you watch it go: the water it was
      // carrying sheets off as the charge takes over.
      if (events.replaced === "water") {
        droplets.burst(robot.x + robot.width / 2, robot.y + robot.height - 2, 18, 60, robot.width + 4);
      }
    }

    if (events.circuit?.powered && circuit) {
      sparks.burst(trainRect(circuit).x, TRAIN_TOP + 14, 24, 150, 4);
    }

    if (events.circuit?.trainDx && circuit) {
      wheelSpark -= dt;
      if (wheelSpark <= 0) {
        wheelSpark = 0.05;
        const train = trainRect(circuit);
        sparks.fizz(train.x + 2 + Math.random() * (TRAIN_WIDTH - 6), FLOOR_TOP - 2);
      }
    }

    // A sodden robot drips, and splashes when it lands; a charged one fizzes.
    if (robot.form === "water") {
      if (robot.effectTimer >= DRIP_INTERVAL) {
        robot.effectTimer = 0;
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
    } else if (robot.form === "electric") {
      if (robot.effectTimer >= FIZZ_INTERVAL) {
        robot.effectTimer = 0;
        // Around the edge of the body, so the crackle reads as coming off the
        // hull rather than out of the middle of it.
        const edge = Math.random();
        sparks.fizz(
          edge < 0.5 ? robot.x + Math.random() * robot.width : robot.x + (edge < 0.75 ? -1 : robot.width),
          edge < 0.5 ? robot.y + (Math.random() < 0.5 ? -1 : robot.height) : robot.y + Math.random() * robot.height,
        );
      }
      if (robot.sinceLanded === 0 && robot.landingImpact > 0.3) {
        sparks.burst(
          robot.x + robot.width / 2,
          robot.y + robot.height - 1,
          Math.round(3 + robot.landingImpact * 6),
          90,
          robot.width,
        );
      }
    }

    // The puddle throws off the occasional sparkle so it reads as interactive.
    puddleSparkle -= dt;
    if (puzzle && puzzle.puddleAmount > 0.5 && puddleSparkle <= 0) {
      puddleSparkle = 0.7 + Math.random() * 0.8;
      const spread = PUDDLE.width * 0.4 * puzzle.puddleAmount;
      droplets.drip(
        PUDDLE.x + PUDDLE.width / 2 + (Math.random() - 0.5) * spread * 2,
        PUDDLE.y + PUDDLE.height - 3,
      );
    }

    droplets.update(dt, FLOOR_TOP - 1);
    sparks.update(dt);
    time += dt;

    if (complete) {
      // Keep it raining, and let the robot bounce on the spot. The controls stay
      // live, so you can still walk about in the mess you made.
      if (Math.random() < dt * 22) confetti.rain(CANVAS_WIDTH, 1);
      confetti.update(dt, CANVAS_HEIGHT);
      hopTimer += dt;
      if (hopTimer >= HOP_INTERVAL && robot.grounded) {
        hopTimer = 0;
        robot.vy = -150;
      }
    }

    // Fade out, swap level, fade back in. The robot keeps moving under the fade,
    // which is why the swap happens at the darkest point and not on contact.
    if (world.finished && !complete) {
      wipe += dt;
      if (wipe >= WIPE_TIME) {
        world = createWorld(nextIndex(world));
        wipe = WIPE_TIME; // hold the black, then the branch below fades it back in
        publish();
      }
    } else if (wipe > 0) {
      wipe = Math.max(0, wipe - dt);
    }
  }

  /** Levels run in order and then round again, so the game never dead-ends. */
  function nextIndex(w: World): number {
    return (w.levelIndex + 1) % LEVELS.length;
  }

  function draw(): void {
    const { robot, puzzle, circuit, level } = world;

    drawBackground(ctx);
    if (puzzle) drawDoorway(ctx);
    if (circuit) drawTunnelInterior(ctx);
    drawPlatforms(ctx, level.platforms);
    if (puzzle) {
      drawConduit(ctx, puzzle, time);
      drawPlate(ctx, puzzle, time);
      drawPuddle(ctx, puzzle, time);
    }
    if (circuit) {
      drawRail(ctx, circuit, time);
      drawBattery(ctx, circuit, time);
      drawTrain(ctx, circuit, time);
      drawTunnelShade(ctx);
    }
    drawExit(ctx, level.exit, time);
    drawToys(ctx, level.toys);
    if (puzzle) drawGate(ctx, puzzle);
    drawRobotShadow(ctx, robot, worldColliders(world));
    drawRobot(ctx, robot, time);
    droplets.draw(ctx);
    sparks.draw(ctx);
    drawAmbience(ctx);
    confetti.draw(ctx);
    drawProgress(ctx, world.levelIndex);
    if (complete) drawComplete(ctx);

    // The fade, over everything.
    if (wipe > 0) {
      const t = Math.min(1, wipe / WIPE_TIME);
      ctx.fillStyle = `rgba(8, 5, 18, ${t})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  /** The one bit of text in the game, and it is the one that has earned it. */
  function drawComplete(ctx: CanvasRenderingContext2D): void {
    const cx = CANVAS_WIDTH / 2;
    const y = 34;
    const word = "COMPLETE";

    ctx.textAlign = "center";
    ctx.font = "bold 16px monospace";

    // A soft plate behind it, so the word holds up over any part of the scene.
    const glow = ctx.createRadialGradient(cx, y - 5, 4, cx, y - 5, 60);
    glow.addColorStop(0, "rgba(12, 8, 26, 0.72)");
    glow.addColorStop(1, "rgba(12, 8, 26, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 60, y - 30, 120, 50);

    ctx.fillStyle = "rgba(12, 8, 26, 0.9)";
    ctx.fillText(word, cx + 1, y + 1);
    ctx.fillStyle = "#ffe24a";
    ctx.fillText(word, cx, y);
  }

  /** Which of the three levels this is: three pips, no words. */
  function drawProgress(ctx: CanvasRenderingContext2D, index: number): void {
    for (let i = 0; i < LEVELS.length; i++) {
      const x = 5 + i * 5;
      ctx.fillStyle = "rgba(8, 5, 18, 0.5)";
      ctx.fillRect(x - 1, 4, 4, 4);
      const done = complete || i < index;
      ctx.fillStyle = done ? "#8fe3b0" : i === index ? "#ffe24a" : "rgba(255, 246, 214, 0.22)";
      ctx.fillRect(x, 5, 2, 2);
    }
  }

  function frame(now: number): void {
    accumulator += Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;

    // Fixed-step physics: several small updates per rendered frame rather than
    // one large one, so a fast fall can't skip clean through a thin platform.
    while (accumulator >= FIXED_DT) {
      if (running) step(FIXED_DT);
      else accumulator = 0; // paused: don't bank up time to replay in a burst
      accumulator -= FIXED_DT;
    }

    draw();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  function enter(index: number): void {
    world = createWorld(index);
    wipe = 0;
    complete = false;
    hopTimer = 0;
    publish();
  }

  return {
    play() {
      running = true;
      publish();
    },
    pause() {
      running = false;
      publish();
    },
    goToLevel(index) {
      enter(Math.max(0, Math.min(LEVELS.length - 1, index)));
      running = true;
      publish();
    },
    replay() {
      for (let i = 0; i < cleared.length; i++) cleared[i] = false;
      enter(0);
      running = true;
      publish();
    },
    onChange(listener) {
      listeners.push(listener);
      listener({
        levelIndex: world.levelIndex,
        cleared: cleared.slice(),
        complete,
        running,
      });
    },
  };
}
