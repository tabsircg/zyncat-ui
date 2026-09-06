import { motionDefaults } from './motion-defaults.generated';
import type { DistanceToken, DurationToken, EaseToken, ScaleToken } from './motion-scale';

export interface MotionTransition {
  type?: 'spring' | 'tween' | 'inertia' | 'keyframes';
  duration?: number;
  ease?:
    | Bezier
    | 'linear'
    | 'easeIn'
    | 'easeOut'
    | 'easeInOut'
    | 'circIn'
    | 'circOut'
    | 'circInOut'
    | 'backIn'
    | 'backOut'
    | 'backInOut'
    | 'anticipate';
  bounce?: number;
  visualDuration?: number;
  delay?: number;
}

export type Bezier = [number, number, number, number];

export type { DistanceToken, DurationToken, EaseToken, ScaleToken } from './motion-scale';

export interface MotionTokens {
  /** seconds - fast 0.14 - base 0.2 - slow 0.3 - slower 0.45 - slowest 0.9 */
  dur: Record<DurationToken, number>;
  ease: Record<EaseToken, Bezier>;
  dist: Record<DistanceToken, number>;
  scale: Record<ScaleToken, number>;
  /** ready-made Motion transitions */
  t: {
    enter: MotionTransition;
    exit: MotionTransition;
    layout: MotionTransition;
    settle: MotionTransition;
    glide: MotionTransition;
  };
  reduced: boolean;
}

type MotionScales = Pick<MotionTokens, 'dur' | 'ease' | 'dist' | 'scale'>;

const DURATION_TOKENS: DurationToken[] = ['fast', 'base', 'slow', 'slower', 'slowest'];
const EASE_TOKENS: EaseToken[] = ['standard', 'entrance', 'exit', 'spring', 'glide'];
const DISTANCE_TOKENS: DistanceToken[] = ['sm', 'md', 'lg'];
const SCALE_TOKENS: ScaleToken[] = ['panel', 'floating', 'chip'];

const table = <K extends string, V>(keys: readonly K[], read: (key: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((key) => [key, read(key)])) as Record<K, V>;

const DEFAULTS: MotionScales = {
  dur: table(DURATION_TOKENS, (key) => motionDefaults.duration[key] / 1000),
  ease: table(EASE_TOKENS, (key) => motionDefaults.ease[key]),
  dist: table(DISTANCE_TOKENS, (key) => motionDefaults.distance[key]),
  scale: table(SCALE_TOKENS, (key) => motionDefaults.scale[key]),
};

function build(scales: MotionScales): MotionTokens {
  const { dur, ease } = scales;
  const reduced = dur.base <= 0.005;
  return {
    ...scales,
    reduced,
    t: {
      enter: { duration: dur.base, ease: ease.entrance },
      exit: { duration: dur.fast, ease: ease.exit },
      layout: { duration: dur.slow, ease: ease.entrance },
      settle: reduced ? { duration: 0 } : { type: 'spring', visualDuration: dur.fast, bounce: 0.25 },
      glide: { duration: dur.base, ease: ease.glide },
    },
  };
}

function readFromDom(): MotionTokens {
  const cs = getComputedStyle(document.body ?? document.documentElement);
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const seconds = (name: string, fallback: number): number => {
    const v = cs.getPropertyValue(name).trim();
    const n = v.slice(-2) === 'ms' ? parseFloat(v) / 1000 : parseFloat(v);
    return isNaN(n) ? fallback : n;
  };
  const pixels = (name: string, fallback: number): number => {
    const v = cs.getPropertyValue(name).trim();
    const n = parseFloat(v);
    if (isNaN(n)) return fallback;
    return v.endsWith('rem') ? n * rootFontSize : n;
  };
  const ratio = (name: string, fallback: number): number => {
    const n = parseFloat(cs.getPropertyValue(name));
    return isNaN(n) ? fallback : n;
  };
  const bezier = (name: string, fallback: Bezier): Bezier => {
    const m = cs.getPropertyValue(name).match(/-?[\d.]+/g);
    return m && m.length === 4 ? (m.map(Number) as Bezier) : fallback;
  };
  return build({
    dur: table(DURATION_TOKENS, (key) => seconds(`--duration-${key}`, DEFAULTS.dur[key])),
    ease: table(EASE_TOKENS, (key) => bezier(`--ease-${key}`, DEFAULTS.ease[key])),
    dist: table(DISTANCE_TOKENS, (key) => pixels(`--distance-${key}`, DEFAULTS.dist[key])),
    scale: table(SCALE_TOKENS, (key) => ratio(`--scale-${key}`, DEFAULTS.scale[key])),
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function replaceInto(target: Record<string, unknown>, next: Record<string, unknown>): void {
  for (const key of Object.keys(target)) if (!(key in next)) delete target[key];
  for (const [key, value] of Object.entries(next)) {
    const current = target[key];
    if (isRecord(current) && isRecord(value)) replaceInto(current, value);
    else target[key] = value;
  }
}

const hasDom = typeof document !== 'undefined';

export const UIMotion: MotionTokens = hasDom ? readFromDom() : build(DEFAULTS);

/**
 * Re-reads the motion tokens into `UIMotion` in place, so every held reference sees the new values. Runs on
 * a `data-theme` or `data-polarity` change, a `prefers-reduced-motion` flip and after `ZyncatTheme`
 * renders; call it yourself after injecting a stylesheet that retimes the `--duration-*` tokens.
 */
export function refreshMotionTokens(): MotionTokens {
  if (hasDom)
    replaceInto(UIMotion as unknown as Record<string, unknown>, readFromDom() as unknown as Record<string, unknown>);
  return UIMotion;
}

if (hasDom) {
  if (typeof matchMedia === 'function')
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => refreshMotionTokens());
  if (typeof MutationObserver === 'function')
    new MutationObserver(() => refreshMotionTokens()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-polarity'],
      subtree: true,
    });
}

export default UIMotion;
