/**
 * Water droplets. Small enough to stay a detail rather than an effect budget:
 * a fixed cap, no allocation churn once the pool is warm, and pure arithmetic
 * so it can be stepped inside the fixed-timestep loop with everything else.
 */
export interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  big: boolean;
}

const MAX_DROPLETS = 70;
const DROPLET_GRAVITY = 340;

const DROPLET_COLORS = ["#eafcff", "#9fe4f7", "#4fb3d9", "#2f7fa8"];

export class Droplets {
  private items: Droplet[] = [];

  get count(): number {
    return this.items.length;
  }

  /**
   * Scatters droplets from a point, biased upwards. `spread` seeds them across
   * a width rather than stacking every one on the same pixel, which otherwise
   * reads as a solid block for the first few frames.
   */
  burst(x: number, y: number, count: number, speed = 60, spread = 6): void {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_DROPLETS) return;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
      const power = speed * (0.45 + Math.random() * 0.75);
      const maxLife = 0.4 + Math.random() * 0.5;
      this.items.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y - Math.random() * 2,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        life: maxLife,
        maxLife,
        big: Math.random() < 0.35,
      });
    }
  }

  /** A single drip that falls from the sodden robot. */
  drip(x: number, y: number): void {
    if (this.items.length >= MAX_DROPLETS) return;
    const maxLife = 0.5 + Math.random() * 0.35;
    this.items.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: 12,
      life: maxLife,
      maxLife,
      big: false,
    });
  }

  update(dt: number, floorY: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const d = this.items[i];
      d.vy += DROPLET_GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;

      // Splat on the floor rather than sinking through it.
      if (d.y >= floorY) {
        d.y = floorY;
        d.vy = 0;
        d.vx *= 0.4;
        d.life = Math.min(d.life, 0.12);
      }
      if (d.life <= 0) this.items.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const d of this.items) {
      const t = d.life / d.maxLife;
      const shade = t > 0.66 ? 0 : t > 0.4 ? 1 : t > 0.18 ? 2 : 3;
      ctx.fillStyle = DROPLET_COLORS[shade];
      const size = d.big && t > 0.4 ? 2 : 1;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), size, size);
    }
  }
}

/**
 * Sparks. Same shape of thing as the droplets and stepped in the same loop, but
 * they behave the opposite way round: fast, hot, short-lived, and barely
 * affected by gravity — they wink out in the air rather than falling and
 * pooling. Keeping them a separate class rather than a flag on Droplet is what
 * lets each read as its own material.
 */
export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const MAX_SPARKS = 80;
const SPARK_GRAVITY = 90;
const SPARK_DRAG = 0.86;

/** White-hot, then yellow, then amber, then gone. */
const SPARK_COLORS = ["#ffffff", "#fff6b0", "#ffe24a", "#ff9a3c"];

export class Sparks {
  private items: Spark[] = [];

  get count(): number {
    return this.items.length;
  }

  /** A spray of hot pixels thrown out in every direction. */
  burst(x: number, y: number, count: number, speed = 110, spread = 6): void {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_SPARKS) return;
      const angle = Math.random() * Math.PI * 2;
      const power = speed * (0.3 + Math.random() * 0.9);
      const maxLife = 0.16 + Math.random() * 0.28;
      this.items.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.6,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        life: maxLife,
        maxLife,
      });
    }
  }

  /**
   * A single crackle that hangs where it is put and fades. This is the charged
   * form's ambient fizz: one pixel at a time is enough to read as "live", and
   * cheap enough to run every few frames forever.
   */
  fizz(x: number, y: number): void {
    if (this.items.length >= MAX_SPARKS) return;
    const maxLife = 0.1 + Math.random() * 0.18;
    this.items.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 26,
      vy: -8 - Math.random() * 22,
      life: maxLife,
      maxLife,
    });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const s = this.items[i];
      s.vx *= SPARK_DRAG;
      s.vy = s.vy * SPARK_DRAG + SPARK_GRAVITY * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) this.items.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const s of this.items) {
      const t = s.life / s.maxLife;
      const shade = t > 0.7 ? 0 : t > 0.45 ? 1 : t > 0.2 ? 2 : 3;
      ctx.fillStyle = SPARK_COLORS[shade];
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
  }
}

/** Paper confetti for the run-complete celebration. Falls, flutters, and lands. */
export interface Fleck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  color: string;
}

const MAX_CONFETTI = 120;
const CONFETTI_COLORS = ["#ef4b6b", "#ffd166", "#4dd4c4", "#a78bfa", "#7fd67f", "#ffffff"];

export class Confetti {
  private items: Fleck[] = [];

  get count(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  /** Drops `count` flecks from above the top of the screen, spread across `width`. */
  rain(width: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_CONFETTI) return;
      this.items.push({
        x: Math.random() * width,
        y: -2 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 24,
        vy: 18 + Math.random() * 34,
        spin: Math.random() * Math.PI * 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      });
    }
  }

  update(dt: number, floorY: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.spin += dt * 6;
      f.x += (f.vx + Math.sin(f.spin) * 14) * dt;
      f.y += f.vy * dt;
      if (f.y >= floorY) this.items.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const f of this.items) {
      ctx.fillStyle = f.color;
      // Flat side on, then edge on, so each fleck reads as a tumbling scrap.
      const tall = Math.abs(Math.sin(f.spin)) > 0.5;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), tall ? 1 : 2, tall ? 2 : 1);
    }
  }
}
