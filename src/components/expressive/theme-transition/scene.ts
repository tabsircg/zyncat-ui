export type ThemeChangeKind = 'polarity' | 'palette';
export type SweepDirection = 'down' | 'up' | 'right' | 'left';
export type BloomShape = 'circle' | 'hexagon' | 'star' | 'petal' | 'blob';

export interface Scene {
  width: number;
  height: number;
  originX: number;
  originY: number;
  kind: ThemeChangeKind;
  direction: SweepDirection;
  intensity: number;
  shape: BloomShape;
}

export interface Effect {
  duration: number;
  clips: readonly string[];
}

export type EffectFactory = (scene: Scene) => Effect;

export const TAU = Math.PI * 2;

export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

export const SAMPLE_MS = 8;

export const sample = <T>(duration: number, step: number, at: (progress: number, elapsed: number) => T): T[] => {
  const last = Math.ceil(duration / step);
  const table: T[] = [];
  for (let i = 0; i <= last; i++) table.push(at(i / last, (i / last) * duration));
  return table;
};
