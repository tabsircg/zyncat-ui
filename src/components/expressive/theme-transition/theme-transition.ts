import './theme-transition.css';

import { loop, type Playback } from '../../../engine';
import { UIMotion } from '../../../tokens/motion-tokens';
import type { ThemeChange, ThemeState } from '../../../tokens/theme-store';
import { clamp, type Effect, type EffectFactory, type Frame, type RGB, type Scene, type SweepDirection } from './scene';

export type ThemeTransitionEffect = 'tide' | 'bloom' | 'paint';

export interface ThemeTransitionOptions {
  /** `tide` sweeps a lit wave across the page, `bloom` grows a honeycomb from the pressed control, `paint` throws splats that run together. */
  effect: ThemeTransitionEffect;
  /** Divides the effect's own duration - `2` runs it twice as fast. @default 1 */
  speed?: number;
  /** Scales the wave, the tilt of the scales and the size of the splats. @default 1 */
  intensity?: number;
  /** Light the leading edge. @default true */
  glow?: boolean;
}

export type ThemeTransitionSetting = ThemeTransitionEffect | ThemeTransitionOptions;

interface Settings {
  effect: ThemeTransitionEffect;
  speed: number;
  intensity: number;
  glow: boolean;
}

interface Palette {
  background: RGB;
  ink: RGB;
  accent: RGB;
}

interface Run {
  current: ThemeState;
  next: ThemeState;
  direction: 1 | -1;
  finish(): void;
}

const ACTIVE = 'data-theme-transition';
const SETTLING = 'data-theme-settling';
const LEAD = '[data-theme-lead]';
const LEAD_NAME = 'zc-theme-lead-';
const NEW_ROOT = '::view-transition-new(root)';
const MAX_PIXEL_RATIO = 1.5;
const ORIGIN_ABOVE_BOTTOM = 48;
const HALO_SHIFT = 4096;
const GLOW = {
  polarity: { halo: 28, blur: 12, edge: 1.5, haloAlpha: 0.55, edgeAlpha: 0.95 },
  palette: { halo: 14, blur: 8, edge: 1, haloAlpha: 0.22, edgeAlpha: 0.6 },
};

const LOADERS: Record<ThemeTransitionEffect, () => Promise<EffectFactory>> = {
  tide: () => import('./tide').then((module) => module.tide),
  bloom: () => import('./bloom').then((module) => module.bloom),
  paint: () => import('./paint').then((module) => module.paint),
};
const loaded = new Map<ThemeTransitionEffect, Promise<EffectFactory>>();

const loadEffect = (effect: ThemeTransitionEffect) => {
  let pending = loaded.get(effect);
  if (!pending) {
    pending = LOADERS[effect]();
    loaded.set(effect, pending);
  }
  return pending;
};

const resolveSettings = (setting: ThemeTransitionSetting): Settings => {
  const options = typeof setting === 'string' ? { effect: setting } : setting;
  const effect = options.effect in LOADERS ? options.effect : 'tide';
  const speed = Number(options.speed);
  return {
    effect,
    speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
    intensity: Number.isFinite(Number(options.intensity)) ? Number(options.intensity) : 1,
    glow: options.glow !== false,
  };
};

export function preloadThemeTransition(setting: ThemeTransitionSetting): void {
  void loadEffect(resolveSettings(setting).effect);
}

let sampler: CanvasRenderingContext2D | null = null;

const rgbOf = (color: string): RGB => {
  sampler ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!sampler) return [0, 0, 0];
  sampler.clearRect(0, 0, 1, 1);
  sampler.fillStyle = 'black';
  sampler.fillStyle = color;
  sampler.fillRect(0, 0, 1, 1);
  const data = sampler.getImageData(0, 0, 1, 1).data;
  return [data[0], data[1], data[2]];
};

const readPalette = (): Palette => {
  const probe = document.body.appendChild(document.createElement('span'));
  probe.className = 'zc-theme-transition__probe';
  const style = getComputedStyle(probe);
  const palette = {
    background: rgbOf(style.color),
    ink: rgbOf(style.backgroundColor),
    accent: rgbOf(style.borderTopColor),
  };
  probe.remove();
  return palette;
};

const originOf = (width: number, height: number): [number, number] => {
  const focused = document.activeElement;
  if (focused instanceof HTMLElement && focused.closest(LEAD)) {
    const box = focused.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  }
  return [width / 2, height - ORIGIN_ABOVE_BOTTOM];
};

const sameState = (a: ThemeState, b: ThemeState) => a.theme === b.theme && a.resolvedPolarity === b.resolvedPolarity;

const directionOf = (current: ThemeState, next: ThemeState): SweepDirection => {
  if (current.resolvedPolarity !== next.resolvedPolarity) return next.resolvedPolarity === 'dark' ? 'down' : 'up';
  return next.themes.indexOf(next.theme) > current.themes.indexOf(current.theme) ? 'right' : 'left';
};

const createCanvas = (into: string, width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'zc-theme-transition';
  canvas.setAttribute('data-into', into);
  canvas.setAttribute('aria-hidden', 'true');
  const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { canvas, context, ratio };
};

interface Brush {
  context: CanvasRenderingContext2D;
  ratio: number;
  color: string;
  glow: boolean;
}

const paintFrame = (brush: Brush, scene: Scene, frame: Frame, progress: number) => {
  const { context: ctx, ratio, color } = brush;
  ctx.clearRect(0, 0, scene.width, scene.height);
  frame.draw?.(ctx);
  if (!brush.glow || !frame.crest) return;
  const q = Math.sqrt(Math.sin(Math.PI * progress));
  const G = GLOW[scene.kind];
  const haloWidth = scene.kind === 'polarity' ? G.halo * scene.intensity : G.halo;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  const halo = G.haloAlpha * q * (frame.halo ?? 1);
  if (halo > 0) {
    ctx.save();
    ctx.globalAlpha = halo;
    ctx.lineWidth = haloWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = G.blur * 2 * ratio;
    ctx.shadowOffsetY = HALO_SHIFT * ratio;
    ctx.translate(0, -HALO_SHIFT);
    ctx.stroke(frame.crest);
    ctx.restore();
  }
  const edge = G.edgeAlpha * q * (frame.edge ?? 1);
  if (edge > 0) {
    ctx.globalAlpha = edge;
    ctx.lineWidth = G.edge;
    ctx.stroke(frame.crest);
    ctx.globalAlpha = 1;
  }
};

let active: Run | null = null;

const start = (change: ThemeChange, settings: Settings): Run => {
  const { current, next } = change;
  const root = document.documentElement;
  const width = root.clientWidth;
  const height = root.clientHeight;
  const [originX, originY] = originOf(width, height);
  const from = readPalette();
  const kind = current.resolvedPolarity === next.resolvedPolarity ? 'palette' : 'polarity';
  const into = kind === 'palette' ? 'palette' : next.resolvedPolarity;
  const leads = [...document.querySelectorAll<HTMLElement>(LEAD)];
  leads.forEach((lead, index) => lead.style.setProperty('view-transition-name', LEAD_NAME + index));
  root.setAttribute(ACTIVE, settings.effect);
  const { canvas, context, ratio } = createCanvas(into, width, height);

  let factory: EffectFactory | null = null;
  let effect: Effect | null = null;
  let scene: Scene | null = null;
  let brush: Brush | null = null;
  let clip: Animation | null = null;
  let playback: Playback | null = null;
  let done = false;
  let time = 0;
  let elapsed = 0;

  const teardown = () => {
    if (done) return;
    done = true;
    playback?.stop();
    clip?.cancel();
    canvas.remove();
    for (const lead of leads) lead.style.removeProperty('view-transition-name');
    root.removeAttribute(ACTIVE);
    root.removeAttribute(SETTLING);
    if (active === run) active = null;
  };

  const transition = document.startViewTransition(async () => {
    root.setAttribute(SETTLING, '');
    change.commit();
    document.body.appendChild(canvas);
    factory = await loadEffect(settings.effect);
  });

  const finish = () => {
    teardown();
    transition.skipTransition();
  };

  const revert = () => {
    playback?.stop();
    change.revert();
    root.getBoundingClientRect();
    finish();
  };

  const render = () => {
    if (!effect || !scene || !clip) return;
    const total = effect.duration / settings.speed;
    const progress = clamp(time / total, 0, 1);
    const frame = effect.frame(progress, elapsed);
    (clip.effect as KeyframeEffect).setKeyframes([{ clipPath: frame.clip }, { clipPath: frame.clip }]);
    if (brush) paintFrame(brush, scene, frame, progress);
    if (run.direction > 0 && time >= total) finish();
    else if (run.direction < 0 && time <= 0) revert();
  };

  const run: Run = { current, next, direction: 1, finish };

  transition.ready
    .then(() => {
      if (done || !factory) return;
      const to = readPalette();
      scene = {
        width,
        height,
        originX,
        originY,
        kind,
        direction: directionOf(current, next),
        intensity: settings.intensity,
        from: from.background,
        to: to.background,
        ink: to.ink,
        accent: to.accent,
      };
      effect = factory(scene);
      if (context) brush = { context, ratio, color: getComputedStyle(canvas).color, glow: settings.glow };
      const total = effect.duration / settings.speed;
      const first = effect.frame(0, 0).clip;
      clip = root.animate([{ clipPath: first }, { clipPath: first }], {
        pseudoElement: NEW_ROOT,
        duration: 1,
        fill: 'both',
      });
      clip.pause();
      playback = loop((_, dt) => {
        elapsed += dt;
        time = clamp(time + dt * run.direction, 0, total);
        render();
      });
    })
    .catch(teardown);
  void transition.finished.then(teardown, teardown);

  return run;
};

export function runThemeTransition(change: ThemeChange, setting: ThemeTransitionSetting): void {
  const { current, next } = change;
  if (active) {
    if (sameState(active.next, next)) {
      active.direction = 1;
      return;
    }
    if (sameState(active.current, next)) {
      active.direction = -1;
      return;
    }
    active.finish();
  }
  if (sameState(current, next) || UIMotion.reduced || !document.startViewTransition) {
    change.commit();
    return;
  }
  active = start(change, resolveSettings(setting));
}
