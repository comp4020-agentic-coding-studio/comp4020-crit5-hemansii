import {
  TOY_BALL_PALETTE,
  TOY_BLOCK_PALETTE,
  TOY_PLUSH_PALETTE,
  TOY_ROCKET_PALETTE,
  type Palette,
} from "./constants";
import type { Rect } from "./physics";
import {
  EXIT_SHELF,
  TUNNEL_WALL,
  type CircuitConfig,
} from "./circuit";
import { GATE, PUDDLE } from "./puzzle";
import {
  TOY_BALL_GRID,
  TOY_BLOCK_GRID,
  TOY_PLUSH_GRID,
  TOY_ROCKET_GRID,
  type SpriteGrid,
} from "./sprites";

/**
 * Three short levels, in order: water, electricity, then both together. Each is
 * one screen, each ends at a lit doorway, and each is built from the same two
 * mechanisms — a pressure plate that only answers to weight, and a toy
 * locomotive that only answers to charge.
 *
 * Level 3 is deliberately not a new idea. It is the two levels' mechanisms in
 * one room, which is the only place the forms' one rule bites: absorbing the
 * battery replaces the water, so the plate has to be dealt with first.
 */

const FLOOR_TOP = 128;
const FLOOR: Rect = { x: 0, y: FLOOR_TOP, width: 256, height: 16 };
const SHELF = 8;

/** The beam above the portcullis. Together they seal the gateway ceiling to floor. */
const DOOR_BEAM: Rect = { x: GATE.x, y: 0, width: GATE.width, height: GATE.y };

/** The shelf the puddle is spilled on. */
const PUDDLE_SHELF: Rect = { x: 52, y: 98, width: 44, height: SHELF };

export interface Toy {
  x: number;
  y: number;
  grid: SpriteGrid;
  palette: Palette;
}

const toy = (grid: SpriteGrid, palette: Palette) => (x: number, y: number): Toy => ({
  x,
  y,
  grid,
  palette,
});
const ball = toy(TOY_BALL_GRID, TOY_BALL_PALETTE);
const blocks = toy(TOY_BLOCK_GRID, TOY_BLOCK_PALETTE);
const plush = toy(TOY_PLUSH_GRID, TOY_PLUSH_PALETTE);
const rocket = toy(TOY_ROCKET_GRID, TOY_ROCKET_PALETTE);

/** The way out. Standing in it finishes the level. */
export const EXIT_WIDTH = 14;
export const EXIT_HEIGHT = 20;

/** An exit doorway standing on the surface whose top is `surfaceY`. */
const exitOn = (x: number, surfaceY: number): Rect => ({
  x,
  y: surfaceY - EXIT_HEIGHT,
  width: EXIT_WIDTH,
  height: EXIT_HEIGHT,
});

export interface Level {
  name: string;
  spawn: { x: number; y: number };
  platforms: Rect[];
  toys: Toy[];
  /** Present when this level has a puddle, a pressure plate and a portcullis. */
  water: boolean;
  /** Present when this level has a battery and a locomotive. */
  circuit: CircuitConfig | null;
  exit: Rect;
}

export const LEVELS: Level[] = [
  {
    name: "Water",
    spawn: { x: 14, y: FLOOR_TOP - 14 },
    platforms: [
      FLOOR,
      PUDDLE_SHELF,
      { x: 104, y: 68, width: 36, height: SHELF },
      { x: 72, y: 40, width: 32, height: SHELF },
      DOOR_BEAM,
    ],
    toys: [blocks(80, 22), plush(112, 54), ball(150, 114), rocket(240, 112)],
    water: true,
    circuit: null,
    // Straight through the gate the plate opened. Nothing else stands in the way:
    // this level is about the one idea.
    exit: exitOn(214, FLOOR_TOP),
  },
  {
    name: "Electricity",
    spawn: { x: 14, y: FLOOR_TOP - 14 },
    platforms: [
      FLOOR,
      { x: 40, y: 96, width: 40, height: SHELF },
      { x: 100, y: 74, width: 36, height: SHELF },
      // A wall down from the ceiling, doing the job level 3's door beam does for
      // free: without it a running jump off the y=74 shelf sails across and lands
      // on the exit shelf, because the two are nearly the same height.
      { x: 170, y: 0, width: 16, height: 60 },
      TUNNEL_WALL,
      EXIT_SHELF,
    ],
    toys: [plush(46, 82), blocks(104, 56), ball(120, 114)],
    water: false,
    // The battery is the first thing on the floor walking right, so the form
    // arrives before the thing that needs it.
    circuit: { battery: { x: 56, y: FLOOR_TOP - 20, width: 10, height: 20 }, railX: 150 },
    // Up on the shelf no form can reach from the floor. The locomotive's roof is
    // the only step to it, and the locomotive only moves once it is charged.
    exit: exitOn(EXIT_SHELF.x + 3, EXIT_SHELF.y),
  },
  {
    name: "Water and electricity",
    spawn: { x: 14, y: FLOOR_TOP - 14 },
    platforms: [
      FLOOR,
      PUDDLE_SHELF,
      { x: 104, y: 68, width: 36, height: SHELF },
      DOOR_BEAM,
      TUNNEL_WALL,
      EXIT_SHELF,
    ],
    toys: [plush(112, 54), ball(150, 114)],
    water: true,
    // Beyond the portcullis, so the plate has to be solved while the robot still
    // has the water to solve it with. Absorbing this replaces that water.
    circuit: { battery: { x: 194, y: FLOOR_TOP - 20, width: 10, height: 20 }, railX: 204 },
    exit: exitOn(EXIT_SHELF.x + 3, EXIT_SHELF.y),
  },
];

/** The puddle only exists on levels that have the water puzzle. */
export const puddleFor = (level: Level): Rect | null => (level.water ? PUDDLE : null);
