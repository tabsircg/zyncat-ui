import { clamp, easeInOut, easeOut, TAU, type EffectFactory, type RGB } from './scene';

const DURATION = { polarity: 1400, palette: 620 };
const SCALES = {
  polarity: { band: 3.2, tilt: 1.13, lift: 0.5, glint: 0.6, seam: true, tail: 0.6 },
  palette: { band: 2.2, tilt: 0.6, lift: 0.22, glint: 0.28, seam: false, tail: 0.5 },
};
const MIN_SCALE = 11;
const MAX_SCALE = 16;
const SCALE_PER_WIDTH = 1 / 70;
const HEX_OVERLAP = 1.08;
const SWELL = 0.12;
const SHADE = 0.3;
const GLINT_CENTRE = 0.55;
const GLINT_WIDTH = 0.14;
const MIX_START = 0.35;
const MIX_END = 0.65;
const SEAM_START = 0.8;
const SEAM_ALPHA = 0.35;
const FRONT_LEAD = 1.7;
const EDGE_LAG = 0.5;
const MIN_INTENSITY = 0.4;
const MAX_INTENSITY = 1.8;
const POLARITY_GLINT: RGB = [255, 214, 150];
const RING_HALO = 0.6;

interface Cell {
  x: number;
  y: number;
  d: number;
}

const mixTowardWhite = (rgb: RGB): RGB => [
  Math.round(rgb[0] * 0.5 + 128),
  Math.round(rgb[1] * 0.5 + 128),
  Math.round(rgb[2] * 0.5 + 128),
];

export const bloom: EffectFactory = (scene) => {
  const { width: W, height: H, originX: ox, originY: oy, kind } = scene;
  const P = SCALES[kind];
  const intensity = clamp(scene.intensity, MIN_INTENSITY, MAX_INTENSITY);
  const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, W * SCALE_PER_WIDTH));
  const hw = Math.sqrt(3) * s;
  const vh = 1.5 * s;
  const rows = Math.ceil(H / vh) + 2;
  const cols = Math.ceil(W / hw) + 2;
  const cells: Cell[] = [];
  for (let r = -1; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const x = c * hw + (r & 1 ? hw / 2 : 0);
      const y = r * vh;
      cells.push({ x, y, d: Math.hypot(x - ox, y - oy) });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  const verts = Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    return [Math.cos(a) * s * HEX_OVERLAP, Math.sin(a) * s * HEX_OVERLAP];
  });
  const farthest = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(W - ox, oy),
    Math.hypot(ox, H - oy),
    Math.hypot(W - ox, H - oy),
  );
  const band = P.band * hw;
  const [ro, go, bo] = scene.from;
  const [rn, gn, bn] = scene.to;
  const [rs, gs, bs] = scene.ink;
  const [rg, gg, bg] = kind === 'polarity' ? POLARITY_GLINT : mixTowardWhite(scene.accent);

  const front = (p: number) => {
    const e = kind === 'polarity' ? easeInOut(p) : easeOut(p);
    const R = (farthest + band * FRONT_LEAD) * e;
    return { R, edge: R - band * EDGE_LAG };
  };

  const drawScales = (ctx: CanvasRenderingContext2D, R: number) => {
    const tail = 1 + P.tail;
    const low = R - band * tail;
    let a = 0;
    let b = cells.length;
    while (a < b) {
      const m = (a + b) >> 1;
      if (cells[m].d < low) a = m + 1;
      else b = m;
    }
    const items: [Cell, number][] = [];
    for (let i = a; i < cells.length && cells[i].d <= R; i++) {
      const phi = (R - cells[i].d) / band;
      if (phi > 0 && phi < tail) items.push([cells[i], phi]);
    }
    items.sort((p1, p2) => Math.abs(p2[1] - 0.5) - Math.abs(p1[1] - 0.5));
    ctx.lineWidth = 1;
    for (const [c, phi] of items) {
      const d = c.d || 1e-3;
      const ux = (c.x - ox) / d;
      const uy = (c.y - oy) / d;
      const wx = -uy;
      const wy = ux;
      const q = Math.min(1, phi);
      const sq = Math.sin(Math.PI * q);
      const theta = P.tilt * intensity * sq;
      const cosT = Math.cos(theta);
      const lift = P.lift * s * sq * intensity;
      const sc = 1 + SWELL * sq;
      const cx = c.x + ux * lift;
      const cy = c.y + uy * lift;
      const mx = phi < MIX_START ? 0 : phi > MIX_END ? 1 : (phi - MIX_START) / (MIX_END - MIX_START);
      const m2 = mx * mx * (3 - 2 * mx);
      const shade = 1 - SHADE * Math.sin(theta);
      const gl = P.glint * intensity * Math.exp(-Math.pow((phi - GLINT_CENTRE) / GLINT_WIDTH, 2));
      let r = (ro + (rn - ro) * m2) * shade;
      let g = (go + (gn - go) * m2) * shade;
      let bl = (bo + (bn - bo) * m2) * shade;
      r += (rg - r) * gl;
      g += (gg - g) * gl;
      bl += (bg - bl) * gl;
      const alpha = phi <= 1 ? 1 : 1 - (phi - 1) / P.tail;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const [vx, vy] = verts[k];
        const t = vx * wx + vy * wy;
        const rr = (vx * ux + vy * uy) * cosT;
        const px = cx + (t * wx + rr * ux) * sc;
        const py = cy + (t * wy + rr * uy) * sc;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha.toFixed(3)})`;
      ctx.fill();
      if (P.seam && phi > SEAM_START) {
        ctx.strokeStyle = `rgba(${rs},${gs},${bs},${(alpha * SEAM_ALPHA).toFixed(3)})`;
        ctx.stroke();
      }
    }
  };

  return {
    duration: DURATION[kind],
    frame(p) {
      const { R, edge } = front(p);
      const clip = `circle(${Math.max(0, edge).toFixed(1)}px at ${ox.toFixed(1)}px ${oy.toFixed(1)}px)`;
      let crest: Path2D | undefined;
      if (edge > 0) {
        crest = new Path2D();
        crest.arc(ox, oy, edge, 0, TAU);
      }
      return { clip, crest, halo: RING_HALO, edge: 0, draw: (ctx) => drawScales(ctx, R) };
    },
  };
};
