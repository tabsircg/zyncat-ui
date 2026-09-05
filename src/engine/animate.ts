import { sharedSlot } from '../shared-slot';
import { resolveTiming, type Timing } from './ease';

export const clock = { scale: 1 };

export interface Playback {
  stop(): void;
  finished: Promise<void>;
}

type Vec = [number, number];
export type Length = number | `${number}%`;
export type Size = Length | 'auto';

export interface Layer {
  x?: Length[];
  y?: Length[];
  scale?: number[] | Vec[];
  opacity?: number[];
  width?: Size[];
  height?: Size[];
  radius?: string[];
  timing?: Timing;
  composite?: CompositeOperation;
}

export type Placement = Omit<Layer, 'timing' | 'composite'>;

const RESET: Record<string, string> = { translate: '0px 0px', scale: '1' };
const CSS_NAME: Record<string, string> = { borderRadius: 'border-radius' };

function cssName(key: string): string {
  return CSS_NAME[key] ?? key;
}
const AUTO_METRIC = { width: 'offsetWidth', height: 'offsetHeight' } as const;
const SIZES = ['width', 'height'] as const;

function measureAuto(el: HTMLElement, key: 'width' | 'height'): number {
  const saved = el.style.getPropertyValue(key);
  el.style.setProperty(key, 'auto');
  const measured = el[AUTO_METRIC[key]];
  if (saved) el.style.setProperty(key, saved);
  else el.style.removeProperty(key);
  return measured;
}

function held<T>(list: T[], index: number): T {
  return list[Math.min(index, list.length - 1)];
}

function cssLength(value: Length): string {
  return typeof value === 'number' ? `${value}px` : value;
}

function currentValue(el: HTMLElement, key: string): string {
  const raw = getComputedStyle(el).getPropertyValue(cssName(key)).trim();
  return raw && raw !== 'none' ? raw : RESET[key];
}

function compile(el: HTMLElement, layer: Layer) {
  const frames: Record<string, string[]> = {};
  const autoKeys: string[] = [];

  if (layer.x?.length || layer.y?.length) {
    const x = layer.x?.length ? layer.x : [0];
    const y = layer.y?.length ? layer.y : [0];
    const count = Math.max(x.length, y.length);
    frames.translate = Array.from({ length: count }, (_, i) => `${cssLength(held(x, i))} ${cssLength(held(y, i))}`);
  }
  if (layer.scale) frames.scale = layer.scale.map((v) => (typeof v === 'number' ? String(v) : `${v[0]} ${v[1]}`));
  if (layer.opacity) frames.opacity = layer.opacity.map(String);
  if (layer.radius) frames.borderRadius = [...layer.radius];

  for (const key of SIZES) {
    const list = layer[key];
    if (!list) continue;
    if (list[list.length - 1] === 'auto') autoKeys.push(key);
    const measured = list.includes('auto') ? measureAuto(el, key) : 0;
    frames[key] = list.map((v) => (v === 'auto' ? `${measured}px` : cssLength(v)));
  }

  for (const [key, list] of Object.entries(frames)) if (list.length === 1) list.unshift(currentValue(el, key));
  return { frames, autoKeys };
}

function commitIfRendered(animation: Animation): void {
  try {
    animation.commitStyles();
  } catch {}
}

export interface PropertyHolder {
  cancel(): void;
}

const owned = sharedSlot('engine.owned@1', () => new WeakMap<HTMLElement, Map<string, PropertyHolder>>());

export function claim(el: HTMLElement, keys: string[], holder: PropertyHolder | null): void {
  const map = owned.get(el) ?? new Map<string, PropertyHolder>();
  owned.set(el, map);
  for (const key of keys) {
    const previous = map.get(key);
    if (previous && previous !== holder) previous.cancel();
    if (holder) map.set(key, holder);
    else map.delete(key);
  }
}

export function release(el: HTMLElement, keys: string[], holder: PropertyHolder): void {
  const map = owned.get(el);
  if (!map) return;
  for (const key of keys) if (map.get(key) === holder) map.delete(key);
}

function play(el: HTMLElement, layer: Layer): Playback | null {
  const { frames, autoKeys } = compile(el, layer);
  const keys = Object.keys(frames);
  if (!keys.length) return null;

  const timing = layer.timing;
  const resolved = resolveTiming(timing);

  if (resolved.duration <= 0) {
    claim(el, keys, null);
    if (timing?.fill !== 'none')
      for (const key of keys) el.style.setProperty(cssName(key), frames[key][frames[key].length - 1]);
    return null;
  }

  const shaped: PropertyIndexedKeyframes = { ...frames };
  if (timing?.times) shaped.offset = timing.times;
  if (resolved.segments) shaped.easing = resolved.segments;

  const animation = el.animate(shaped, {
    duration: resolved.duration,
    delay: resolved.delay,
    easing: resolved.easing,
    fill: timing?.fill ?? 'both',
    composite: layer.composite,
  });
  animation.playbackRate = 1 / clock.scale;
  if (layer.composite !== 'add') claim(el, keys, animation);

  const finished = animation.finished.then(
    (): void => {
      if (!autoKeys.length && !timing?.release) return;
      commitIfRendered(animation);
      animation.cancel();
      for (const key of autoKeys) el.style.setProperty(key, 'auto');
    },
    (): void => {},
  );

  return { stop: () => animation.cancel(), finished };
}

const settled: Playback = { stop() {}, finished: Promise.resolve() };

export function animate(el: HTMLElement, ...layers: Layer[]): Playback {
  const plays: Playback[] = [];
  for (const layer of layers) {
    const started = play(el, layer);
    if (started) plays.push(started);
  }
  if (!plays.length) return settled;
  if (plays.length === 1) return plays[0];
  return {
    stop: () => {
      for (const started of plays) started.stop();
    },
    finished: Promise.all(plays.map((started) => started.finished)).then((): void => {}),
  };
}

export function set(el: HTMLElement, ...placements: Placement[]): void {
  for (const placement of placements) play(el, { ...placement, timing: { duration: 0 } });
}
