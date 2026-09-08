import { clamp, easeInOut, easeOut, sample, SAMPLE_MS, TAU, type BloomShape, type EffectFactory } from './scene';

const DURATION = { polarity: 1400, palette: 620 };
const MAX_RELIEF = 2;
const DEEPEST_CUT = 0.7;
const COVER_MARGIN = 1.02;
const SPIN = 0.35;
const HEX_SIDES = 6;
const STAR_LOBES = 8;
const STAR_CUT = 0.38;
const PETAL_LOBES = 5;
const PETAL_CUT = 0.26;
const CURVE_VERTICES = 120;
const BLOB_WAVES: readonly [lobes: number, depth: number, phase: number, drift: number][] = [
  [2, 0.09, 0.6, 1.1],
  [3, 0.07, 2.4, -0.8],
  [5, 0.045, 4.1, 1.7],
];

interface Outline {
  vertices: number;
  innermost: number;
  radial(theta: number, progress: number): number;
  turn(progress: number): number;
}

const lobed = (lobes: number, cut: number, vertices: number, spin: number): Outline => ({
  vertices,
  innermost: 1 - cut,
  radial: (theta) => 1 - (cut * (1 - Math.cos(lobes * theta))) / 2,
  turn: (progress) => spin * progress,
});

const OUTLINES: Record<Exclude<BloomShape, 'circle'>, (relief: number) => Outline> = {
  hexagon: (relief) => ({
    vertices: HEX_SIDES,
    innermost: Math.cos(Math.PI / HEX_SIDES),
    radial: () => 1,
    turn: (progress) => Math.PI / HEX_SIDES + SPIN * relief * progress,
  }),
  star: (relief) => lobed(STAR_LOBES, clamp(STAR_CUT * relief, 0, DEEPEST_CUT), STAR_LOBES * 2, SPIN * relief),
  petal: (relief) => lobed(PETAL_LOBES, clamp(PETAL_CUT * relief, 0, DEEPEST_CUT), CURVE_VERTICES, SPIN * relief),
  blob: (relief) => {
    const swell = Math.min(relief, DEEPEST_CUT / BLOB_WAVES.reduce((sum, [, depth]) => sum + depth, 0));
    return {
      vertices: CURVE_VERTICES,
      innermost: 1 - BLOB_WAVES.reduce((sum, [, depth]) => sum + depth * swell, 0),
      radial: (theta, progress) =>
        BLOB_WAVES.reduce(
          (r, [lobes, depth, phase, drift]) => r + depth * swell * Math.sin(lobes * theta + phase + drift * progress),
          1,
        ),
      turn: () => 0,
    };
  },
};

const polygonAt = (outline: Outline, reach: number, progress: number, ox: number, oy: number) => {
  const turn = outline.turn(progress);
  const points: string[] = [];
  for (let i = 0; i < outline.vertices; i++) {
    const theta = (i / outline.vertices) * TAU;
    const r = reach * outline.radial(theta, progress);
    const a = theta + turn;
    points.push(`${(ox + Math.cos(a) * r).toFixed(1)}px ${(oy + Math.sin(a) * r).toFixed(1)}px`);
  }
  return `polygon(${points.join(', ')})`;
};

export const bloom: EffectFactory = (scene) => {
  const { width: W, height: H, originX: ox, originY: oy, kind, shape } = scene;
  const relief = clamp(scene.intensity, 0, MAX_RELIEF);
  const farthest = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(W - ox, oy),
    Math.hypot(ox, H - oy),
    Math.hypot(W - ox, H - oy),
  );
  const ease = kind === 'polarity' ? easeInOut : easeOut;
  const outline = shape === 'circle' ? null : OUTLINES[shape](relief);
  const reach = (farthest * COVER_MARGIN) / (outline?.innermost ?? 1);
  const at = ` at ${ox.toFixed(1)}px ${oy.toFixed(1)}px)`;
  const clipAt = (p: number) => {
    const e = ease(p);
    return outline ? polygonAt(outline, reach * e, e, ox, oy) : `circle(${(reach * e).toFixed(1)}px${at}`;
  };
  return { duration: DURATION[kind], clips: sample(DURATION[kind], SAMPLE_MS, clipAt) };
};
