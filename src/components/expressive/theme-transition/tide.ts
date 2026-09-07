import { easeInOut, easeOut, TAU, type EffectFactory, type Frame } from './scene';

const DURATION = { polarity: 1250, palette: 560 };
const POINTS = 72;
const POLARITY_WAVE = { heightShare: 0.085, maxAmplitude: 96, margin: 24 };
const PALETTE_WAVE = { widthShare: 0.02, maxAmplitude: 26, tiltShare: 0.16, margin: 16 };
const REST_AMPLITUDE = 0.3;

const wave = (points: string[], crest: Path2D, x: number, y: number) => {
  points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  if (points.length === 1) crest.moveTo(x, y);
  else crest.lineTo(x, y);
};

export const tide: EffectFactory = (scene) => {
  const { width: W, height: H, kind, direction } = scene;
  const intensity = Math.max(0, scene.intensity);

  const polarityFrame = (p: number, t: number): Frame => {
    const points: string[] = [];
    const crest = new Path2D();
    const e = easeInOut(p);
    const env = Math.sin(Math.PI * p);
    const A0 = Math.min(H * POLARITY_WAVE.heightShare, POLARITY_WAVE.maxAmplitude) * intensity;
    const amp = A0 * (REST_AMPLITUDE + (1 - REST_AMPLITUDE) * env);
    const m = A0 + POLARITY_WAVE.margin;
    const span = H + 2 * m;
    const down = direction === 'down';
    const front = down ? -m + e * span : H + m - e * span;
    for (let i = 0; i <= POINTS; i++) {
      const u = i / POINTS;
      const y =
        front +
        amp *
          (Math.sin(u * TAU * 1.15 + t * 0.0012) +
            0.55 * Math.sin(u * TAU * 2.35 - t * 0.0019 + 1.7) +
            0.22 * Math.sin(u * TAU * 4.1 + t * 0.0031));
      wave(points, crest, W * u, y);
    }
    const close = down ? `L${W} 0 L0 0Z` : `L${W} ${H} L0 ${H}Z`;
    return { clip: `path("M${points.join(' L')} ${close}")`, crest };
  };

  const paletteFrame = (p: number, t: number): Frame => {
    const points: string[] = [];
    const crest = new Path2D();
    const e = easeOut(p);
    const env = Math.sin(Math.PI * p);
    const A0 = Math.min(W * PALETTE_WAVE.widthShare, PALETTE_WAVE.maxAmplitude) * intensity;
    const amp = A0 * (REST_AMPLITUDE + (1 - REST_AMPLITUDE) * env);
    const tilt = H * PALETTE_WAVE.tiltShare;
    const m = A0 + tilt / 2 + PALETTE_WAVE.margin;
    const span = W + 2 * m;
    const right = direction === 'right';
    const front = right ? -m + e * span : W + m - e * span;
    const sign = right ? 1 : -1;
    for (let i = 0; i <= POINTS; i++) {
      const v = i / POINTS;
      const x =
        front +
        (v - 0.5) * tilt * sign +
        amp * (Math.sin(v * TAU * 1.3 + t * 0.002) + 0.5 * Math.sin(v * TAU * 2.8 - t * 0.003 + 1));
      wave(points, crest, x, H * v);
    }
    const close = right ? `L0 ${H} L0 0Z` : `L${W} ${H} L${W} 0Z`;
    return { clip: `path("M${points.join(' L')} ${close}")`, crest };
  };

  return { duration: DURATION[kind], frame: kind === 'polarity' ? polarityFrame : paletteFrame };
};
