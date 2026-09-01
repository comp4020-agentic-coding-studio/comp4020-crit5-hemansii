import { FIXED_DT } from "./constants";
import type { Controls } from "./input";
import type { Rect } from "./physics";
import type { RobotForm } from "./forms";
import { createRobot, setRobotForm, updateRobot, type Robot } from "./robot";
import {
  createPuzzle,
  gateCollider,
  updatePuzzle,
  type PuzzleEvents,
  type PuzzleState,
} from "./puzzle";
import { rectsOverlap } from "./physics";
import { LEVELS, type Level } from "./levels";
import {
  createCircuit,
  trainRect,
  updateCircuit,
  type CircuitEvents,
  type CircuitState,
} from "./circuit";

/**
 * The whole game, minus every pixel of it. Pulling the simulation out from the
 * render loop is what lets the level be *played* in a test rather than only
 * measured: `spec/playthrough.test.ts` drives this with a scripted controller
 * and checks the robot actually finishes, using the same physics the browser
 * runs. Geometry assertions can only tell you a route ought to work.
 */

export interface World {
  readonly level: Level;
  readonly levelIndex: number;
  robot: Robot;
  /** Null on levels without the water puzzle. */
  puzzle: PuzzleState | null;
  /** Null on levels without the electric puzzle. */
  circuit: CircuitState | null;
  /** Set once the robot is standing in the exit; the level is over. */
  finished: boolean;
}

export interface WorldEvents {
  puzzle: PuzzleEvents | null;
  circuit: CircuitEvents | null;
  /** True on the single step the robot reaches the exit. */
  finished: boolean;
  /**
   * The form the charge displaced, when it displaced one. The engine uses this
   * to throw off the water the robot was holding; it is also the record that a
   * form is replaced rather than added to.
   */
  replaced: RobotForm | null;
}

export function createWorld(levelIndex = 0): World {
  const level = LEVELS[levelIndex];
  return {
    level,
    levelIndex,
    // Wakes up left of everything, so walking right meets each mechanism before
    // the material that answers it.
    robot: createRobot(level.spawn.x, level.spawn.y),
    puzzle: level.water ? createPuzzle() : null,
    circuit: level.circuit ? createCircuit(level.circuit) : null,
    finished: false,
  };
}

/** Everything solid this instant: the level, the portcullis, and the locomotive. */
export function worldColliders(world: World): Rect[] {
  const colliders: Rect[] = world.level.platforms.slice();
  const gate = world.puzzle && gateCollider(world.puzzle);
  if (gate) colliders.push(gate);
  if (world.circuit) colliders.push(trainRect(world.circuit));
  return colliders;
}

/**
 * The locomotive is the one collider in the level that moves, and the collision
 * pass only reasons about static ones: a body standing on the roof would be slid
 * out from under, and a body in the way would end up inside it. So the train
 * carries what rides it and shoves what blocks it, once per step.
 */
function rideTrain(robot: Robot, train: Rect, dx: number): void {
  if (dx === 0) return;
  const overlapsX = robot.x < train.x + train.width && robot.x + robot.width > train.x;
  if (!overlapsX) return;

  const feet = robot.y + robot.height;
  if (robot.grounded && Math.abs(feet - train.y) <= 1) {
    robot.x += dx; // riding the roof
    return;
  }
  if (feet > train.y && robot.y < train.y + train.height) {
    // Caught in front of it. The train only ever drives left, so being shoved
    // means being set down against its buffer rather than swallowed by it.
    robot.x = train.x - robot.width;
    if (robot.vx > 0) robot.vx = 0;
  }
}

/** One fixed physics step. `dt` should be FIXED_DT; see the accumulator in engine.ts. */
export function stepWorld(world: World, input: Controls, dt: number = FIXED_DT): WorldEvents {
  const { robot, puzzle, circuit } = world;

  updateRobot(robot, input, dt, worldColliders(world));

  let puzzleEvents: PuzzleEvents | null = null;
  if (puzzle) {
    puzzleEvents = updatePuzzle(puzzle, robot, dt);
    if (puzzleEvents.absorbed) setRobotForm(robot, "water");
  }

  let circuitEvents: CircuitEvents | null = null;
  let replaced: RobotForm | null = null;
  if (circuit) {
    circuitEvents = updateCircuit(circuit, robot, dt);
    if (circuitEvents.charged) {
      replaced = robot.form;
      setRobotForm(robot, "electric");
    }
    rideTrain(robot, trainRect(circuit), circuitEvents.trainDx);
  }

  // Standing in the doorway ends the level. Grounded matters: without it, a jump
  // that clips the sill from underneath would finish a level from below it.
  const finished =
    !world.finished && robot.grounded && rectsOverlap(robot, world.level.exit);
  if (finished) world.finished = true;

  return { puzzle: puzzleEvents, circuit: circuitEvents, replaced, finished };
}
