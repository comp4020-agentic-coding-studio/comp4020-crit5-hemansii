const MOVE_LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const MOVE_RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);
const JUMP_KEYS = new Set(["ArrowUp", "w", "W", " "]);

/**
 * All the simulation asks of a controller. `InputTracker` is the keyboard
 * implementation; `spec/playthrough.test.ts` drives the same surface from a
 * script, which is what lets the level be played without a browser.
 */
export interface Controls {
  readonly moveDirection: -1 | 0 | 1;
  consumeJump(): boolean;
}

export class InputTracker implements Controls {
  private held = new Set<string>();
  private jumpQueued = false;

  constructor(target: Window = window) {
    target.addEventListener("keydown", (event) => {
      this.held.add(event.key);
      if (JUMP_KEYS.has(event.key)) {
        event.preventDefault();
        this.jumpQueued = true;
      }
    });
    target.addEventListener("keyup", (event) => {
      this.held.delete(event.key);
    });
  }

  get moveDirection(): -1 | 0 | 1 {
    const left = [...MOVE_LEFT_KEYS].some((key) => this.held.has(key));
    const right = [...MOVE_RIGHT_KEYS].some((key) => this.held.has(key));
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  }

  /** Edge-triggered: true once per key press, then consumed. */
  consumeJump(): boolean {
    if (!this.jumpQueued) return false;
    this.jumpQueued = false;
    return true;
  }
}
