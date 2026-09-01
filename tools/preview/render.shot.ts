import { it } from "vitest";

/**
 * A darkroom, not a sensor. `pnpm shots` renders each level to a PNG through a
 * software canvas so the art and the layouts can be looked at without a browser.
 * Named `.shot.ts` so `pnpm check` never picks it up: it writes files and
 * asserts nothing.
 *
 * It has already earned its place. The locomotive's roof is a platform, and a
 * body rests at its collider's top edge — a screenshot showed the robot floating
 * two pixels above the cab roof, because the sprite's tallest line was the
 * chimney rather than the roof. The sensor that now guards it
 * (`spec/sprites.test.ts`, unbroken roofline) exists because a picture showed it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { SoftCanvas } from "./canvas";
import { FIXED_DT } from "../../src/scripts/game/constants";
import type { Controls } from "../../src/scripts/game/input";
import { createWorld, stepWorld, type World } from "../../src/scripts/game/sim";
import { LEVELS } from "../../src/scripts/game/levels";
import { trainAtRest } from "../../src/scripts/game/circuit";
import { setRobotForm } from "../../src/scripts/game/robot";

// Stand in for the browser so the engine's own draw order is what gets captured.
(globalThis as never as { document: unknown }).document = {
  createElement: () => new SoftCanvas(256, 144),
};

class Pad implements Controls {
  direction: -1 | 0 | 1 = 0;
  private q = false;
  get moveDirection() {
    return this.direction;
  }
  consumeJump() {
    const j = this.q;
    this.q = false;
    return j;
  }
  jump() {
    this.q = true;
  }
}

it("renders every level", async () => {
  mkdirSync("tools/preview/shots", { recursive: true });
  const { drawFrame } = await import("./draw");
  const canvas = new SoftCanvas(256, 144);

  const shoot = (name: string, world: World, time: number) => {
    drawFrame(canvas as never, world, time);
    writeFileSync(`tools/preview/shots/${name}.png`, canvas.toPNG(3));
  };

  LEVELS.forEach((level, index) => {
    const world = createWorld(index);
    const pad = new Pad();
    const run = (seconds: number, done?: (w: World) => boolean) => {
      const steps = Math.round(seconds / FIXED_DT);
      for (let i = 0; i < steps; i++) {
        stepWorld(world, pad, FIXED_DT);
        if (done?.(world)) return;
      }
    };

    const slug = `${index + 1}-${level.name.toLowerCase().replace(/\W+/g, "-")}`;
    shoot(`${slug}-a-start`, world, 0.5);

    // Solve it the way the playthrough test does, and shoot the end state.
    if (level.water) {
      setRobotForm(world.robot, "water");
      world.robot.x = 110;
      world.puzzle!.puddleAmount = 0;
      world.puzzle!.draining = true;
      run(8, (w) => w.puzzle!.gateOpenness === 1);
      shoot(`${slug}-b-gate-open`, world, 2);
    }
    if (level.circuit) {
      pad.direction = 1;
      run(8, (w) => w.robot.form === "electric");
      run(0.5);
      shoot(`${slug}-c-charged`, world, 3);
      run(8, (w) => w.circuit!.powered);
      pad.direction = 0;
      run(4, (w) => trainAtRest(w.circuit!));
      shoot(`${slug}-d-parked`, world, 5);
      pad.direction = 1;
      pad.jump();
      run(4, (w) => w.robot.grounded && w.robot.y + w.robot.height === 102);
      run(2, (w) => w.robot.x >= 206);
      pad.direction = 0;
      pad.jump();
      run(2, (w) => w.robot.y + w.robot.height < 70);
      // Steer left only until over the shelf; holding left carries you past it.
      pad.direction = -1;
      run(2, (w) => w.robot.x + w.robot.width / 2 < 206);
      pad.direction = 0;
      run(3, (w) => w.robot.grounded && w.robot.y + w.robot.height === 70);
    }
    pad.direction = 1;
    run(8, (w) => w.finished);
    shoot(`${slug}-e-exit`, world, 7);
  });
});
