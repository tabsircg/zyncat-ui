import { clock } from '../../engine';
import { motionDefaults } from '../../tokens/motion-defaults.generated';

export interface SlowmoState {
  /** 1 = real time. >1 = that many times slower (4 = quarter speed). */
  factor: number;
  /** Freeze motion in place - useful for inspecting a transition mid-flight. */
  paused: boolean;
}

export interface SlowmoOptions {
  /** Also scale setTimeout/setInterval so duration-coupled JS cleanups don't truncate
   *  slowed CSS. Turn off if stretched app timers get in your way. @default true */
  scaleTimers: boolean;
}

const CANONICAL: Record<string, number> = Object.fromEntries(
  Object.entries(motionDefaults.duration).map(([step, ms]) => [`--duration-${step}`, ms]),
);
const DURATION_TOKENS = Object.keys(CANONICAL);
const COLLAPSED_MS = 4;
const FROZEN_MS = 600_000;
const MAX_TIMER_DELAY = 2 ** 30;

const clamp = (min: number, max: number, v: number) => (v < min ? min : v > max ? max : v);
const hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';

const state: SlowmoState = { factor: 1, paused: false };
const options: SlowmoOptions = { scaleTimers: true };
const listeners = new Set<(s: SlowmoState) => void>();

let active = false;
let baseMs: Record<string, number> = {};
let overrideSheet: HTMLStyleElement | null = null;

type SetTimer = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => number;
let origSetTimeout: SetTimer | null = null;
let origSetInterval: SetTimer | null = null;

type AnimateFn = (this: Element, ...args: unknown[]) => Animation;
let origAnimate: AnimateFn | null = null;
const trackedRates = new Map<Animation, number>();

function readBaseMs(token: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const n = raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : parseFloat(raw);
  if (isNaN(n) || n <= COLLAPSED_MS) return CANONICAL[token];
  return n;
}

function applyCssTokens() {
  if (!overrideSheet) {
    overrideSheet = document.createElement('style');
    overrideSheet.dataset.zyncatSlowmo = '';
    document.head.append(overrideSheet);
  }
  const declarations = DURATION_TOKENS.map((token) => {
    const ms = state.paused ? FROZEN_MS : baseMs[token] * state.factor;
    return `${token}: ${ms}ms !important;`;
  });
  overrideSheet.textContent = `:root, [data-theme], [data-polarity] { ${declarations.join(' ')} }`;
}

function clearCssTokens() {
  overrideSheet?.remove();
  overrideSheet = null;
}

function scaleDelay(delay?: number): number | undefined {
  if (typeof delay !== 'number' || !isFinite(delay)) return delay;
  return Math.min(delay * state.factor, MAX_TIMER_DELAY);
}

function patchTimers() {
  if (origSetTimeout) return;
  origSetTimeout = window.setTimeout as unknown as SetTimer;
  origSetInterval = window.setInterval as unknown as SetTimer;
  const nativeTimeout = origSetTimeout.bind(window);
  const nativeInterval = origSetInterval.bind(window);
  window.setTimeout = ((h: TimerHandler, t?: number, ...a: unknown[]) =>
    nativeTimeout(h, scaleDelay(t), ...a)) as typeof window.setTimeout;
  window.setInterval = ((h: TimerHandler, t?: number, ...a: unknown[]) =>
    nativeInterval(h, scaleDelay(t), ...a)) as typeof window.setInterval;
}

function restoreTimers() {
  if (origSetTimeout) window.setTimeout = origSetTimeout as typeof window.setTimeout;
  if (origSetInterval) window.setInterval = origSetInterval as typeof window.setInterval;
  origSetTimeout = origSetInterval = null;
}

function liveRate(): number {
  return state.paused ? 0 : 1 / state.factor;
}

function track(anim: Animation, original: number) {
  if (trackedRates.has(anim)) return;
  trackedRates.set(anim, original);
  const forget = () => trackedRates.delete(anim);
  anim.finished.then(forget).catch(forget);
}

function patchAnimate() {
  if (origAnimate) return;
  origAnimate = Element.prototype.animate as unknown as AnimateFn;
  const original = origAnimate;
  Element.prototype.animate = function (this: Element, ...args: unknown[]): Animation {
    const anim = original.apply(this, args);
    try {
      track(anim, anim.playbackRate);
      anim.playbackRate = liveRate();
    } catch {}
    return anim;
  } as typeof Element.prototype.animate;
}

function restoreAnimate() {
  if (origAnimate) Element.prototype.animate = origAnimate as typeof Element.prototype.animate;
  origAnimate = null;
}

function sweepExisting() {
  const rate = liveRate();
  for (const anim of document.getAnimations()) {
    try {
      track(anim, anim.playbackRate);
      anim.playbackRate = rate;
    } catch {}
  }
}

function applyTrackedRates() {
  const rate = liveRate();
  for (const anim of trackedRates.keys()) {
    try {
      anim.playbackRate = rate;
    } catch {}
  }
}

function restoreTrackedRates() {
  for (const [anim, original] of trackedRates) {
    try {
      anim.playbackRate = original;
    } catch {}
  }
  trackedRates.clear();
}

function applyEngineClock() {
  clock.scale = state.paused ? Infinity : state.factor;
}

function install() {
  active = true;
  baseMs = {};
  for (const token of DURATION_TOKENS) baseMs[token] = readBaseMs(token);
  applyCssTokens();
  applyEngineClock();
  if (options.scaleTimers) patchTimers();
  patchAnimate();
  sweepExisting();
}

function reconfigure() {
  applyCssTokens();
  applyEngineClock();
  applyTrackedRates();
}

function uninstall() {
  active = false;
  clearCssTokens();
  clock.scale = 1;
  restoreTimers();
  restoreAnimate();
  restoreTrackedRates();
}

function notify() {
  const snapshot = { ...state };
  for (const cb of listeners) cb(snapshot);
}

export function shouldBeActive(factor: number, paused: boolean): boolean {
  return factor > 1 || paused;
}

/** Imperative control surface - drive slow-mo from a console, a hotkey, or the panel.
 *  Safe to call during SSR (no-ops the DOM work, still tracks state for hydration). */
export const motionSlowmo = {
  /** Current state (a copy). */
  get(): SlowmoState {
    return { ...state };
  },

  /** Merge a partial state. factor is clamped to [1, 64]. */
  set(patch: Partial<SlowmoState>): void {
    if (typeof patch.factor === 'number') state.factor = clamp(1, 64, patch.factor);
    if (typeof patch.paused === 'boolean') state.paused = patch.paused;

    if (hasDOM) {
      const wantActive = shouldBeActive(state.factor, state.paused);
      if (!active && wantActive) install();
      else if (active && !wantActive) uninstall();
      else if (active) reconfigure();
    }
    notify();
  },

  /** Tune engine behaviour (e.g. stop scaling timers). Applies immediately if active. */
  configure(patch: Partial<SlowmoOptions>): void {
    if (typeof patch.scaleTimers === 'boolean' && patch.scaleTimers !== options.scaleTimers) {
      options.scaleTimers = patch.scaleTimers;
      if (active) options.scaleTimers ? patchTimers() : restoreTimers();
    }
  },

  /** Convenience: back to real time and unpaused. */
  reset(): void {
    this.set({ factor: 1, paused: false });
  },

  /** Subscribe to state changes; returns an unsubscribe fn. */
  subscribe(cb: (s: SlowmoState) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export type MotionSlowmo = typeof motionSlowmo;
