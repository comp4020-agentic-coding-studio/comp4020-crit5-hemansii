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
