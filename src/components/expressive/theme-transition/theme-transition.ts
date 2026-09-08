import './theme-transition.css';

import { clock, loop } from '../../../engine';
import { UIMotion } from '../../../tokens/motion-tokens';
import { DEFAULT_THEME, getThemeSnapshot, type ThemeChange, type ThemeState } from '../../../tokens/theme-store';
import { type BloomShape, type EffectFactory, type Scene, type SweepDirection } from './scene';

export type ThemeTransitionEffect = 'tide' | 'paint' | `bloom-${BloomShape}`;

export interface ThemeTransitionOptions {
  /**
   * `tide` sweeps a wave across the page; `paint` throws splats that run together; `bloom-circle`,
   * `bloom-hexagon`, `bloom-star`, `bloom-petal` and `bloom-blob` grow that outline from the
   * pressed control.
   */
  effect: ThemeTransitionEffect;
  /** Divides the effect's own duration - `2` runs it twice as fast. @default 1 */
  speed?: number;
  /** Scales the wave, the relief and spin of the bloom outline and the size of the splats. @default 1 */
  intensity?: number;
}

export type ThemeTransitionSetting = ThemeTransitionEffect | ThemeTransitionOptions;

interface Settings {
  effect: ThemeTransitionEffect;
  speed: number;
  intensity: number;
}

interface Run {
  current: ThemeState;
  next: ThemeState;
  direction: 1 | -1;
  finish(): void;
}

interface Plan {
  change: ThemeChange;
  current: ThemeState;
  settings: Settings;
  factory: EffectFactory;
}

interface Overlay {
  root: HTMLElement;
  inner: HTMLElement;
  left: number;
  top: number;
  scrollX: number;
  scrollY: number;
}

const SETTLING = 'data-theme-settling';
const LEAD = '[data-theme-lead]';
const ORIGIN_ABOVE_BOTTOM = 48;
const NEVER_CLONED = 'script, style, link, template, noscript, .zc-theme-transition';
const EMBEDS = 'iframe, video, object, embed';
const BLOOM_SHAPES: Partial<Record<ThemeTransitionEffect, BloomShape>> = {
  'bloom-circle': 'circle',
  'bloom-hexagon': 'hexagon',
  'bloom-star': 'star',
  'bloom-petal': 'petal',
  'bloom-blob': 'blob',
};
const loadBloom = () => import('./bloom').then((module) => module.bloom);
const LOADERS: Record<ThemeTransitionEffect, () => Promise<EffectFactory>> = {
  tide: () => import('./tide').then((module) => module.tide),
  paint: () => import('./paint').then((module) => module.paint),
  'bloom-circle': loadBloom,
  'bloom-hexagon': loadBloom,
  'bloom-star': loadBloom,
  'bloom-petal': loadBloom,
  'bloom-blob': loadBloom,
};
const loading = new Map<ThemeTransitionEffect, Promise<EffectFactory>>();
const ready = new Map<ThemeTransitionEffect, EffectFactory>();

const loadEffect = (effect: ThemeTransitionEffect) => {
  let pending = loading.get(effect);
  if (!pending) {
    pending = LOADERS[effect]().then((factory) => {
      ready.set(effect, factory);
      return factory;
    });
    loading.set(effect, pending);
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
  };
};

export function preloadThemeTransition(setting: ThemeTransitionSetting): void {
  void loadEffect(resolveSettings(setting).effect);
}

const ACCENT_RAMP = 'var(--accent)';

type ThemeRoot = Pick<ThemeState, 'theme' | 'resolvedPolarity'>;

const markThemeRoot = (element: HTMLElement, state: ThemeRoot, ramp: string | null) => {
  element.setAttribute('data-theme', state.theme);
  element.setAttribute('data-polarity', state.resolvedPolarity);
  if (ramp) element.style.setProperty('--neutral', ramp);
};

const probeOf = (state: ThemeRoot, ramp: string | null): HTMLSpanElement => {
  const probe = document.body.appendChild(document.createElement('span'));
  probe.className = 'zc-theme-transition__probe';
  markThemeRoot(probe, state, ramp);
  return probe;
};

const neutralOf = (element: Element) => getComputedStyle(element).getPropertyValue('--neutral').trim();

const rampOf = (next: ThemeState): string | null => {
  const target = probeOf(next, null);
  const pinned = neutralOf(target) !== neutralOf(document.documentElement);
  target.remove();
  if (pinned) return null;
  const base = probeOf({ theme: DEFAULT_THEME, resolvedPolarity: next.resolvedPolarity }, null);
  const tied = neutralOf(base) === getComputedStyle(base).getPropertyValue('--accent').trim();
  base.remove();
  return tied ? ACCENT_RAMP : null;
};

const originOf = (change: ThemeChange, width: number, height: number): [number, number] => {
  if (change.origin) return [change.origin[0], change.origin[1]];
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

const mirrorState = (live: Element, copy: Element) => {
  if (live instanceof HTMLInputElement) {
    const input = copy as HTMLInputElement;
    input.value = live.value;
    input.checked = live.checked;
    return;
  }
  if (live instanceof HTMLTextAreaElement) {
    (copy as HTMLTextAreaElement).value = live.value;
    return;
  }
  if (live instanceof HTMLSelectElement) {
    (copy as HTMLSelectElement).selectedIndex = live.selectedIndex;
    return;
  }
  if (live instanceof HTMLCanvasElement) {
    try {
      (copy as HTMLCanvasElement).getContext('2d')?.drawImage(live, 0, 0);
    } catch {}
    return;
  }
  if (live.matches(EMBEDS)) {
    const box = live.getBoundingClientRect();
    const stand = document.createElement('div');
    stand.className = copy.className;
    stand.setAttribute(
      'style',
      `${copy.getAttribute('style') ?? ''};display:inline-block;width:${box.width}px;height:${box.height}px`,
    );
    copy.replaceWith(stand);
  }
};

const RESERVED_KEYFRAME_KEYS = new Set(['offset', 'computedOffset', 'easing', 'composite']);
const THEMED_PROPERTY = /color|background|shadow|fill|stroke|outline|border-image|caret/;
const KEYFRAME_ALIASES: Record<string, string> = { cssOffset: 'offset', cssFloat: 'float' };

const propertyOf = (key: string) =>
  KEYFRAME_ALIASES[key] ?? (key.startsWith('--') ? key : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));

const twinKey = (index: number, animation: CSSAnimation, pseudo: string | null) =>
  `${index}|${animation.animationName}|${pseudo ?? ''}`;

const unthemedKeyframes = (effect: KeyframeEffect): Keyframe[] | null => {
  let carries = false;
  const frames = effect.getKeyframes().map((keyframe) => {
    const frame: Keyframe = { offset: keyframe.computedOffset, easing: keyframe.easing, composite: keyframe.composite };
    for (const key of Object.keys(keyframe)) {
      if (RESERVED_KEYFRAME_KEYS.has(key) || THEMED_PROPERTY.test(propertyOf(key))) continue;
      frame[key] = keyframe[key];
      carries = true;
    }
    return frame;
  });
  return carries ? frames : null;
};

const replicate = (target: Element, effect: KeyframeEffect): Animation | null => {
  const frames = unthemedKeyframes(effect);
  if (!frames) return null;
  const { duration } = effect.getComputedTiming();
  return target.animate(frames, {
    ...effect.getTiming(),
    duration: typeof duration === 'number' ? duration : 0,
    composite: effect.composite,
    pseudoElement: effect.pseudoElement,
  });
};

const pace = (twin: Animation, lead: Animation) => {
  if (lead.currentTime === null) return;
  twin.playbackRate = lead.playbackRate;
  twin.currentTime = lead.currentTime;
  if (lead.playState === 'paused') twin.pause();
};

const finishable = (animation: Animation) => {
  const rate = animation.playbackRate;
  return rate < 0 || (rate > 0 && animation.effect?.getComputedTiming().endTime !== Infinity);
};

const syncAnimations = (live: NodeListOf<Element>, copy: NodeListOf<Element>) => {
  const liveIndex = new Map<Element, number>();
  const copyIndex = new Map<Element, number>();
  live.forEach((element, index) => liveIndex.set(element, index));
  copy.forEach((element, index) => copyIndex.set(element, index));
  const animations = document.getAnimations();
  const twins = new Map<string, CSSAnimation>();
  const orphans = new Set<CSSAnimation>();
  for (const animation of animations) {
    const effect = animation.effect;
    if (!(animation instanceof CSSAnimation) || !(effect instanceof KeyframeEffect) || !effect.target) continue;
    const index = copyIndex.get(effect.target);
    if (index === undefined) continue;
    twins.set(twinKey(index, animation, effect.pseudoElement), animation);
    orphans.add(animation);
  }
  for (const animation of animations) {
    const effect = animation.effect;
    if (!(effect instanceof KeyframeEffect) || !effect.target) continue;
    const index = liveIndex.get(effect.target);
    if (index === undefined) continue;
    if (animation instanceof CSSAnimation) {
      const twin = twins.get(twinKey(index, animation, effect.pseudoElement));
      if (!twin) continue;
      orphans.delete(twin);
      pace(twin, animation);
    } else {
      const replica = replicate(copy[index], effect);
      if (replica) pace(replica, animation);
    }
  }
  for (const orphan of orphans) if (finishable(orphan)) orphan.finish();
};

const buildOverlay = (next: ThemeState, clip: string, ramp: string | null): Overlay => {
  const body = document.body;
  const inner = body.cloneNode(true) as HTMLElement;
  const live = body.querySelectorAll('*');
  const copy = inner.querySelectorAll('*');
  const scrolled: [Element, number, number][] = [];
  for (let i = 0; i < live.length; i++) {
    const source = live[i];
    if (source.scrollTop || source.scrollLeft) scrolled.push([copy[i], source.scrollTop, source.scrollLeft]);
    mirrorState(source, copy[i]);
  }
  for (const dead of inner.querySelectorAll(NEVER_CLONED)) dead.remove();
  inner.classList.add('zc-theme-transition__inner');
  const box = body.getBoundingClientRect();
  inner.style.cssText += `;position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;margin:0`;
  const root = document.createElement('div');
  root.className = 'zc-theme-transition';
  markThemeRoot(root, next, ramp);
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('inert', '');
  root.style.clipPath = clip;
  root.appendChild(inner);
  body.appendChild(root);
  syncAnimations(live, copy);
  for (const [element, top, left] of scrolled) {
    element.scrollTop = top;
    element.scrollLeft = left;
  }
  return { root, inner, left: box.left, top: box.top, scrollX: window.scrollX, scrollY: window.scrollY };
};

let active: Run | null = null;

const build = (run: Run, { change, current, settings, factory }: Plan) => {
  const { next } = change;
  const root = document.documentElement;
  const width = root.clientWidth;
  const height = root.clientHeight;
  const [originX, originY] = originOf(change, width, height);
  const ramp = rampOf(next);
  const scene: Scene = {
    width,
    height,
    originX,
    originY,
    kind: current.resolvedPolarity === next.resolvedPolarity ? 'palette' : 'polarity',
    direction: directionOf(current, next),
    intensity: settings.intensity,
    shape: BLOOM_SHAPES[settings.effect] ?? 'circle',
  };
  const effect = factory(scene);
  const total = effect.duration / settings.speed;
  const overlay = buildOverlay(next, effect.clips[0], ramp);
  const reveal = overlay.root.animate(
    effect.clips.map((clipPath) => ({ clipPath })),
    { duration: total, easing: 'linear', fill: 'both' },
  );

  let done = false;
  const rateOf = () => run.direction / clock.scale;
  reveal.playbackRate = rateOf();

  const follow = () => {
    overlay.inner.style.left = `${overlay.left + overlay.scrollX - window.scrollX}px`;
    overlay.inner.style.top = `${overlay.top + overlay.scrollY - window.scrollY}px`;
  };
  const resize = () => {
    const box = document.body.getBoundingClientRect();
    overlay.left = box.left;
    overlay.top = box.top;
    overlay.scrollX = window.scrollX;
    overlay.scrollY = window.scrollY;
    overlay.inner.style.width = `${box.width}px`;
    follow();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') finish();
  };

  const release = () => {
    window.removeEventListener('scroll', follow);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    overlay.root.remove();
    if (active === run) active = null;
  };

  const finish = () => {
    if (done) return;
    done = true;
    playback.stop();
    reveal.cancel();
    overlay.root.style.clipPath = 'none';
    root.setAttribute(SETTLING, '');
    change.commit();
    void document.body.offsetWidth;
    root.removeAttribute(SETTLING);
    release();
  };

  const cancel = () => {
    if (done) return;
    done = true;
    playback.stop();
    reveal.cancel();
    release();
    change.revert();
  };

  const playback = loop(() => {
    const rate = rateOf();
    if (reveal.playbackRate !== rate) reveal.playbackRate = rate;
  });

  reveal.finished.then(
    () => (run.direction > 0 ? finish() : cancel()),
    () => {},
  );
  run.finish = finish;

  window.addEventListener('scroll', follow, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
};

const start = (plan: Plan): Run => {
  const run: Run = { current: plan.current, next: plan.change.next, direction: 1, finish: () => {} };
  queueMicrotask(() => {
    if (active === run) build(run, plan);
  });
  return run;
};

export function runThemeTransition(change: ThemeChange, setting: ThemeTransitionSetting): void {
  const { next } = change;
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
  const current = getThemeSnapshot();
  const settings = resolveSettings(setting);
  const factory = ready.get(settings.effect);
  if (!factory) void loadEffect(settings.effect);
  if (!factory || sameState(current, next) || UIMotion.reduced || document.visibilityState === 'hidden') {
    change.commit();
    return;
  }
  active = start({ change, current, settings, factory });
}
