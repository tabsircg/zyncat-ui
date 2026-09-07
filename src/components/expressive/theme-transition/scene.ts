export type RGB = readonly [number, number, number];
export type ThemeChangeKind = 'polarity' | 'palette';
export type SweepDirection = 'down' | 'up' | 'right' | 'left';

export interface Scene {
  width: number;
  height: number;
  originX: number;
  originY: number;
  kind: ThemeChangeKind;
  direction: SweepDirection;
  intensity: number;
  from: RGB;
  to: RGB;
  ink: RGB;
  accent: RGB;
}

export interface Frame {
  clip: string;
  crest?: Path2D;
  halo?: number;
  edge?: number;
  draw?(ctx: CanvasRenderingContext2D): void;
}

export interface Effect {
  duration: number;
  frame(progress: number, elapsed: number): Frame;
}

export type EffectFactory = (scene: Scene) => Effect;

export const TAU = Math.PI * 2;

export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
