/**
 * A throwaway software canvas, just enough of CanvasRenderingContext2D for this
 * game's drawing code, so a frame can be rendered to a PNG in Node and actually
 * looked at. Not shipped and not part of `check` — a darkroom, not a sensor.
 */
import { deflateSync } from "node:zlib";

type RGBA = [number, number, number, number];

function parseColor(css: string): RGBA {
  if (css.startsWith("#")) {
    const h = css.slice(1);
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
      1,
    ];
  }
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return [255, 0, 255, 1];
  const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function lerp(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

class Gradient {
  stops: Array<{ at: number; color: RGBA }> = [];
  constructor(
    readonly kind: "linear" | "radial",
    readonly a: number[],
  ) {}
  addColorStop(at: number, color: string) {
    this.stops.push({ at, color: parseColor(color) });
    this.stops.sort((p, q) => p.at - q.at);
  }
  at(x: number, y: number): RGBA {
    let t: number;
    if (this.kind === "linear") {
      const [x0, y0, x1, y1] = this.a;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len2 = dx * dx + dy * dy;
      t = len2 === 0 ? 0 : ((x - x0) * dx + (y - y0) * dy) / len2;
    } else {
      const [, , r0, x1, y1, r1] = this.a;
      const d = Math.hypot(x - x1, y - y1);
      t = r1 === r0 ? 0 : (d - r0) / (r1 - r0);
    }
    t = Math.max(0, Math.min(1, t));
    if (!this.stops.length) return [0, 0, 0, 0];
    let lo = this.stops[0];
    let hi = this.stops[this.stops.length - 1];
    for (let i = 0; i < this.stops.length - 1; i++) {
      if (t >= this.stops[i].at && t <= this.stops[i + 1].at) {
        lo = this.stops[i];
        hi = this.stops[i + 1];
        break;
      }
    }
    const span = hi.at - lo.at;
    return lerp(lo.color, hi.color, span === 0 ? 0 : (t - lo.at) / span);
  }
}

interface State {
  fill: string | Gradient;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  clip: { x0: number; y0: number; x1: number; y1: number } | null;
}

export class SoftCanvas {
  data: Float64Array; // rgba, straight alpha, 0..255
  private stack: State[] = [];
  private s: State = { fill: "#000", tx: 0, ty: 0, sx: 1, sy: 1, clip: null };
  private path: { x: number; y: number; w: number; h: number } | null = null;
  imageSmoothingEnabled = true;
  // Text is the browser's job; the preview only cares about the pixel art.
  textAlign = "left";
  font = "";
  fillText(): void {}

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Float64Array(width * height * 4);
  }

  getContext() {
    return this;
  }

  set fillStyle(v: string | Gradient) {
    this.s.fill = v;
  }
  get fillStyle() {
    return this.s.fill;
  }

  save() {
    this.stack.push({ ...this.s });
  }
  restore() {
    const p = this.stack.pop();
    if (p) this.s = p;
  }
  translate(x: number, y: number) {
    this.s.tx += x * this.s.sx;
    this.s.ty += y * this.s.sy;
  }
  scale(x: number, y: number) {
    this.s.sx *= x;
    this.s.sy *= y;
  }

  beginPath() {
    this.path = null;
  }
  rect(x: number, y: number, w: number, h: number) {
    this.path = { x, y, w, h };
  }
  /** Only used for the porthole; a circle's bounding box is close enough here. */
  arc(cx: number, cy: number, r: number) {
    this.path = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }
  clip() {
    if (!this.path) return;
    const { x, y, w, h } = this.path;
    const x0 = this.s.tx + x * this.s.sx;
    const y0 = this.s.ty + y * this.s.sy;
    const box = { x0, y0, x1: x0 + w * this.s.sx, y1: y0 + h * this.s.sy };
    this.s.clip = this.s.clip
      ? {
          x0: Math.max(this.s.clip.x0, box.x0),
          y0: Math.max(this.s.clip.y0, box.y0),
          x1: Math.min(this.s.clip.x1, box.x1),
          y1: Math.min(this.s.clip.y1, box.y1),
        }
      : box;
  }
  fill() {
    if (this.path) this.fillRect(this.path.x, this.path.y, this.path.w, this.path.h);
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new Gradient("linear", [x0, y0, x1, y1]);
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new Gradient("radial", [x0, y0, r0, x1, y1, r1]);
  }

  private blend(px: number, py: number, c: RGBA) {
    if (c[3] <= 0) return;
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const cl = this.s.clip;
    if (cl && (px < Math.floor(cl.x0) || py < Math.floor(cl.y0) || px >= Math.ceil(cl.x1) || py >= Math.ceil(cl.y1))) return;
    const i = (py * this.width + px) * 4;
    const a = Math.max(0, Math.min(1, c[3]));
    this.data[i] = c[0] * a + this.data[i] * (1 - a);
    this.data[i + 1] = c[1] * a + this.data[i + 1] * (1 - a);
    this.data[i + 2] = c[2] * a + this.data[i + 2] * (1 - a);
    this.data[i + 3] = a * 255 + this.data[i + 3] * (1 - a);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    let x0 = this.s.tx + x * this.s.sx;
    let y0 = this.s.ty + y * this.s.sy;
    let x1 = x0 + w * this.s.sx;
    let y1 = y0 + h * this.s.sy;
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    const grad = this.s.fill instanceof Gradient ? this.s.fill : null;
    const flat = grad ? null : parseColor(this.s.fill as string);
    for (let py = Math.round(y0); py < Math.round(y1); py++) {
      for (let px = Math.round(x0); px < Math.round(x1); px++) {
        this.blend(px, py, grad ? grad.at(px + 0.5, py + 0.5) : flat!);
      }
    }
  }

  drawImage(src: SoftCanvas, ...args: number[]) {
    let sx = 0;
    let sy = 0;
    let sw = src.width;
    let sh = src.height;
    let dx = 0;
    let dy = 0;
    if (args.length === 2) {
      [dx, dy] = args;
    } else if (args.length >= 6) {
      // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) — no scaling needed here.
      [sx, sy, sw, sh, dx, dy] = args;
    }
    for (let row = 0; row < sh; row++) {
      for (let col = 0; col < sw; col++) {
        const si = ((sy + row) * src.width + (sx + col)) * 4;
        const a = src.data[si + 3] / 255;
        if (a <= 0) continue;
        this.blend(dx + col, dy + row, [src.data[si], src.data[si + 1], src.data[si + 2], a]);
      }
    }
  }

  /** Minimal 8-bit RGB PNG. */
  toPNG(scale = 1): Buffer {
    const w = this.width * scale;
    const h = this.height * scale;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    let o = 0;
    for (let y = 0; y < h; y++) {
      raw[o++] = 0;
      for (let x = 0; x < w; x++) {
        const i = (Math.floor(y / scale) * this.width + Math.floor(x / scale)) * 4;
        raw[o++] = Math.round(Math.max(0, Math.min(255, this.data[i])));
        raw[o++] = Math.round(Math.max(0, Math.min(255, this.data[i + 1])));
        raw[o++] = Math.round(Math.max(0, Math.min(255, this.data[i + 2])));
      }
    }
    const chunk = (type: string, body: Buffer) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(body.length);
      const td = Buffer.concat([Buffer.from(type, "ascii"), body]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(td) >>> 0);
      return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

let crcTable: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}
