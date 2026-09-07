import { clamp, TAU, type EffectFactory } from './scene';

const DURATION = { polarity: 2200, palette: 800 };
const PLANS = {
  polarity: { rMax: 0.36, rMin: 0.11, bursts: [6, 7], L: 0.2, hold: 0.15, gap: 0.075, drops: [4, 8], over: 1.7 },
  palette: { rMax: 0.5, rMin: 0.2, bursts: [4, 4], L: 0.34, hold: 0.14, gap: 0.08, drops: [2, 4], over: 1.1 },
};
const POP_SHARE = 0.14;
const COVERAGE = 0.84;
const MIN_CELL = 28;
const MAX_CELL = 48;
const CELLS_ACROSS = 20;
const MIN_INTENSITY = 0.4;
const MAX_INTENSITY = 1.8;
const HERO = { x: 0.3, y: 0.27, jitter: 0.05, swell: 0.1 };
const INSET = { x: 0.1, y: 0.12, bottom: 0.88 };
const POOL_INSET = { x: 0.09, right: 0.9, y: 0.12, bottom: 0.9 };
const NUDGE_INSET = { x: 0.08, right: 0.92, y: 0.1, bottom: 0.9 };
const CORNER = { x: 0.42, y: 0.58, jitter: 0.3 };
const ZONE_JITTER = 0.6;
const SECOND_PICK_CHANCE = 0.3;
const RUN_CURVE = 1.4;
const ROUNDING = 0.6;
const EMPTY_CLIP = 'polygon(0 0,0 0,0 0)';

const f = (v: number) => Math.round(v * 10) / 10;

interface Drop {
  a: number;
  d: number;
  r: number;
  delay: number;
}

interface Splat {
  x: number;
  y: number;
  R: number;
  t0: number;
  Rf: number;
  geo: Float32Array;
  geoR: Float32Array;
  x0: number;
  y0: number;
  xr0: number;
  yr0: number;
  drops: Drop[];
}

interface Seed {
  x: number;
  y: number;
  R: number;
  t0: number;
}

interface Spot {
  bl: boolean;
  x: number;
  y: number;
  d: number;
}

const controlPoints = (Q: Float32Array, pn: number) => {
  const g = new Float32Array(pn * 6);
  for (let j = 0; j < pn; j++) {
    const a = ((j - 1 + pn) % pn) * 2;
    const b = j * 2;
    const c = ((j + 1) % pn) * 2;
    const d = ((j + 2) % pn) * 2;
    const o = j * 6;
    g[o] = Q[b] + (Q[c] - Q[a]) / 6;
    g[o + 1] = Q[b + 1] + (Q[c + 1] - Q[a + 1]) / 6;
    g[o + 2] = Q[c] - (Q[d] - Q[b]) / 6;
    g[o + 3] = Q[c + 1] - (Q[d + 1] - Q[b + 1]) / 6;
    g[o + 4] = Q[c];
    g[o + 5] = Q[c + 1];
  }
  return g;
};

export const paint: EffectFactory = (scene) => {
  const { width: W, height: H, kind } = scene;
  const P = PLANS[kind];
  const rnd = Math.random;
  const intensity = clamp(scene.intensity, MIN_INTENSITY, MAX_INTENSITY);
  const m = Math.min(W, H);
  const rMax = m * P.rMax;
  const rMin = m * P.rMin;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, m / CELLS_ACROSS));
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const n = cols * rows;
  const cx = new Float32Array(n);
  const cy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    cx[i] = ((i % cols) + 0.5) * cell;
    cy[i] = (Math.floor(i / cols) + 0.5) * cell;
  }
  const seeds: Seed[] = [
    {
      x: W * (HERO.x + HERO.jitter * (rnd() - 0.5)),
      y: H * (HERO.y + HERO.jitter * (rnd() - 0.5)),
      R: rMax * (1 + HERO.swell * rnd()),
      t0: 0,
    },
  ];
  const bursts = P.bursts[0] + Math.floor(rnd() * (P.bursts[1] - P.bursts[0] + 1));
  const L = P.L;
  const edgeAt = (s: Seed, p: number) => {
    if (p <= s.t0) return 0;
    const e0 = s.t0 + POP_SHARE * L;
    const ps = Math.max(0, Math.min(1, (p - e0) / Math.max(0.01, 1 - e0)));
    return s.R * (0.1 + 0.9 * Math.min(1, (p - s.t0) / L)) * (1 + 0.35 * Math.pow(ps, RUN_CURVE));
  };
  const cz = W >= H ? (bursts > 4 ? 3 : 2) : 2;
  const rz = bursts > 4 ? (W >= H ? 2 : 3) : 2;
  const zw = W / cz;
  const zh = H / rz;
  const zx0 = Math.min(cz - 1, Math.floor(seeds[0].x / zw));
  const zy0 = Math.min(rz - 1, Math.floor(seeds[0].y / zh));
  const pool: Spot[] = [];
  for (let r = 0; r < rz; r++) {
    for (let c = 0; c < cz; c++) {
      if (c === zx0 && r === zy0) continue;
      const bl = c === 0 && r === rz - 1;
      const jitter = bl ? CORNER.jitter : ZONE_JITTER;
      pool.push({
        bl,
        x: clamp((c + (bl ? CORNER.x : 0.5) + jitter * (rnd() - 0.5)) * zw, W * POOL_INSET.x, W * POOL_INSET.right),
        y: clamp((r + (bl ? CORNER.y : 0.5) + jitter * (rnd() - 0.5)) * zh, H * POOL_INSET.y, H * POOL_INSET.bottom),
        d: Infinity,
      });
    }
  }
  while (seeds.length < bursts) {
    const t0 = P.hold + (seeds.length - 1) * P.gap;
    let pt: { x: number; y: number };
    if (pool.length) {
      for (const q of pool) {
        q.d = Infinity;
        for (const s of seeds) q.d = Math.min(q.d, Math.hypot(q.x - s.x, q.y - s.y));
      }
      pool.sort((a, b) => (b.bl ? 1e6 : b.d) - (a.bl ? 1e6 : a.d));
      pt = pool.splice(!pool[0].bl && pool.length > 1 && rnd() < SECOND_PICK_CHANCE ? 1 : 0, 1)[0];
    } else {
      const cands: [number, number][] = [];
      for (let i = 0; i < n; i += 2) {
        if (cx[i] < W * INSET.x || cx[i] > W * (1 - INSET.x) || cy[i] < H * INSET.y || cy[i] > H * INSET.bottom)
          continue;
        let d = Infinity;
        for (const s of seeds) d = Math.min(d, Math.hypot(cx[i] - s.x, cy[i] - s.y) - edgeAt(s, t0));
        cands.push([d, i]);
      }
      cands.sort((a, b) => b[0] - a[0]);
      const i = cands[Math.min(cands.length - 1, Math.floor(rnd() * rnd() * 4))][1];
      pt = { x: cx[i] + (rnd() - 0.5) * cell * 2, y: cy[i] + (rnd() - 0.5) * cell * 2 };
    }
    let d = Infinity;
    let nearest: Seed | null = null;
    for (const s of seeds) {
      const g = Math.hypot(pt.x - s.x, pt.y - s.y) - edgeAt(s, t0);
      if (g < d) {
        d = g;
        nearest = s;
      }
    }
    if (d < rMin && nearest) {
      const dx = pt.x - nearest.x;
      const dy = pt.y - nearest.y;
      const len = Math.hypot(dx, dy) || 1;
      const push = rMin - d;
      pt.x = clamp(pt.x + (dx / len) * push, W * NUDGE_INSET.x, W * NUDGE_INSET.right);
      pt.y = clamp(pt.y + (dy / len) * push, H * NUDGE_INSET.y, H * NUDGE_INSET.bottom);
      d = rMin;
    }
    seeds.push({ x: pt.x, y: pt.y, R: clamp(d * (0.7 + 0.25 * rnd()), rMin, rMax * 0.85), t0 });
  }
  const own = seeds.map(() => 0);
  for (let i = 0; i < n; i++) {
    let k = 0;
    let bd = Infinity;
    seeds.forEach((s, j) => {
      const d = Math.hypot(cx[i] - s.x, cy[i] - s.y) - s.R;
      if (d < bd) {
        bd = d;
        k = j;
      }
    });
    own[k] = Math.max(own[k], bd + seeds[k].R);
  }
  const splats: Splat[] = seeds.map((s, i) => {
    const Rf = Math.max(s.R * 1.05, (own[i] / COVERAGE + cell * 0.7) * 1.02);
    const rot = rnd() * TAU;
    const pn = Math.max(20, Math.min(36, Math.round(s.R / 9)));
    const harmonics = [
      [2, 0.035 + 0.035 * rnd(), rnd() * TAU],
      [3, 0.02 + 0.03 * rnd(), rnd() * TAU],
      [5, 0.01 + 0.015 * rnd(), rnd() * TAU],
    ];
    const bumps = Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => [
      rnd() * TAU,
      0.14 + 0.12 * rnd(),
      0.14 + 0.28 * rnd(),
    ]);
    const pts = new Float32Array(pn * 2);
    for (let j = 0; j < pn; j++) {
      const th = (j / pn) * TAU;
      let r = 1;
      for (const [k, a, ph] of harmonics) r += a * Math.cos(k * th + ph);
      for (const [bt, bw, bh] of bumps) {
        let dt = th - bt;
        dt = Math.atan2(Math.sin(dt), Math.cos(dt));
        r += bh * Math.exp((-dt * dt) / (2 * bw * bw));
      }
      pts[2 * j] = r * Math.cos(th + rot);
      pts[2 * j + 1] = r * Math.sin(th + rot);
    }
    const rp = new Float32Array(pn * 2);
    for (let j = 0; j < pn; j++) {
      const th = (j / pn) * TAU + rot;
      rp[2 * j] = Math.cos(th);
      rp[2 * j + 1] = Math.sin(th);
    }
    const size = clamp((s.R - rMin) / Math.max(1, rMax - rMin), 0, 1);
    const K = Math.round((P.drops[0] + (P.drops[1] - P.drops[0]) * size) * Math.min(1.4, Math.max(0.6, intensity)));
    const drops: Drop[] = Array.from({ length: K }, () => ({
      a: rnd() * TAU,
      d: 1.25 + 0.6 * rnd(),
      r: 0.04 + 0.07 * rnd(),
      delay: rnd() * 0.25,
    }));
    return {
      ...s,
      Rf,
      geo: controlPoints(pts, pn),
      geoR: controlPoints(rp, pn),
      x0: pts[0],
      y0: pts[1],
      xr0: rp[0],
      yr0: rp[1],
      drops,
    };
  });
  const over = P.over * intensity;

  const shape = (p: number) => {
    let d = '';
    for (const s of splats) {
      const u = (p - s.t0) / L;
      if (u <= 0) continue;
      const uu = Math.min(1, u);
      let sc: number;
      let v = 0;
      let mix = 0;
      if (uu < POP_SHARE) {
        const q = uu / POP_SHARE;
        sc = 0.1 * q * q * (3 - 2 * q);
      } else {
        v = (uu - POP_SHARE) / (1 - POP_SHARE);
        const w = v - 1;
        sc = 0.1 + 0.9 * (1 + (over + 1) * w * w * w + over * w * w);
        const e0 = s.t0 + POP_SHARE * L;
        const es = Math.pow(Math.min(1, (p - e0) / Math.max(0.01, 1 - e0)), RUN_CURVE);
        sc += (s.Rf / s.R - 1) * es;
        mix = ROUNDING * es;
      }
      const k = s.R * sc;
      const { x, y, geo: g, geoR: gr } = s;
      const mm = 1 - mix;
      const X = (o: number) => f(x + (mm * g[o] + mix * gr[o]) * k);
      const Y = (o: number) => f(y + (mm * g[o] + mix * gr[o]) * k);
      let b = `M${f(x + (mm * s.x0 + mix * s.xr0) * k)} ${f(y + (mm * s.y0 + mix * s.yr0) * k)}`;
      for (let o = 0; o < g.length; o += 6) b += `C${X(o)} ${Y(o + 1)} ${X(o + 2)} ${Y(o + 3)} ${X(o + 4)} ${Y(o + 5)}`;
      d += b + 'Z';
      if (v > 0) {
        for (const dr of s.drops) {
          const w = Math.max(0, Math.min(1, (v - dr.delay) / (1 - dr.delay)));
          if (w <= 0) continue;
          const e = 1 - Math.pow(1 - w, 3);
          const dist = s.R * (sc * 0.9 * (1 - e) + dr.d * e);
          const rr = s.R * dr.r * Math.min(1, w * 4);
          const rx = rr * (1 + 1.8 * (1 - e));
          const ca = Math.cos(dr.a);
          const sa = Math.sin(dr.a);
          const px = x + ca * dist;
          const py = y + sa * dist;
          const x1 = f(px - ca * rx);
          const y1 = f(py - sa * rx);
          const x2 = f(px + ca * rx);
          const y2 = f(py + sa * rx);
          const deg = f((dr.a * 180) / Math.PI);
          d += `M${x1} ${y1}A${f(rx)} ${f(rr)} ${deg} 1 1 ${x2} ${y2}A${f(rx)} ${f(rr)} ${deg} 1 1 ${x1} ${y1}Z`;
        }
      }
    }
    return d ? `path("${d}")` : EMPTY_CLIP;
  };

  return { duration: DURATION[kind], frame: (p) => ({ clip: shape(p) }) };
};
