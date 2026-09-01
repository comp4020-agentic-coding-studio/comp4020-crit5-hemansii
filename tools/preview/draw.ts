import type { World } from "../../src/scripts/game/sim";
import { worldColliders } from "../../src/scripts/game/sim";
import * as W from "../../src/scripts/game/world";
import {
  ELECTRIC_ROBOT_PALETTE,
  ROBOT_PALETTE,
  WATER_ROBOT_PALETTE,
} from "../../src/scripts/game/constants";
import {
  drawPixelGrid,
  ELECTRIC_ROBOT_GRID,
  ROBOT_GRID,
  WATER_ROBOT_GRID,
} from "../../src/scripts/game/sprites";

/** The engine's draw order, minus the particles (which are random per frame). */
export function drawFrame(ctx: CanvasRenderingContext2D, world: World, time: number): void {
  const { robot, puzzle, circuit, level } = world;
  W.drawBackground(ctx);
  if (puzzle) W.drawDoorway(ctx);
  if (circuit) W.drawTunnelInterior(ctx);
  W.drawPlatforms(ctx, level.platforms);
  if (puzzle) {
    W.drawConduit(ctx, puzzle, time);
    W.drawPlate(ctx, puzzle, time);
    W.drawPuddle(ctx, puzzle, time);
  }
  if (circuit) {
    W.drawRail(ctx, circuit, time);
    W.drawBattery(ctx, circuit, time);
    W.drawTrain(ctx, circuit, time);
    W.drawTunnelShade(ctx);
  }
  W.drawExit(ctx, level.exit, time);
  W.drawToys(ctx, level.toys);
  if (puzzle) W.drawGate(ctx, puzzle);
  W.drawRobotShadow(ctx, robot, worldColliders(world));

  const grid =
    robot.form === "water"
      ? WATER_ROBOT_GRID
      : robot.form === "electric"
        ? ELECTRIC_ROBOT_GRID
        : ROBOT_GRID;
  const palette =
    robot.form === "water"
      ? WATER_ROBOT_PALETTE
      : robot.form === "electric"
        ? ELECTRIC_ROBOT_PALETTE
        : ROBOT_PALETTE;
  if (robot.form === "electric") W.drawChargeAura(ctx, robot, time);
  drawPixelGrid(ctx, grid, palette, robot.x - 1, robot.y - 2, 1);
  if (robot.form === "electric") W.drawChargeArcs(ctx, robot, time);

  W.drawAmbience(ctx);
}
