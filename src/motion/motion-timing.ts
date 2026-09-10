import type { DurationToken, EaseToken } from '../tokens/motion-scale';
import { motionFor, type MotionTransition } from '../tokens/motion-tokens';
import { resolveDirection, type DisableableAnimation, type TimingDirection } from './timing';

export interface DirectionDefault {
  duration: DurationToken;
  ease: EaseToken;
}

export interface MotionTimingDefaults {
  open: DirectionDefault;
  close: DirectionDefault;
}

export interface MotionTimings {
  open: MotionTransition;
  close: MotionTransition;
}

export function resolveMotionTiming(
  animation: DisableableAnimation | undefined,
  defaults: MotionTimingDefaults,
  scope?: Element | null,
): MotionTimings {
  if (animation === null) return { open: { duration: 0 }, close: { duration: 0 } };

  const motion = motionFor(scope);

  const build = (dir: TimingDirection): MotionTransition => {
    const durToken = (animation && resolveDirection(animation.duration, dir)) || defaults[dir].duration;
    const easeToken = (animation && resolveDirection(animation.ease, dir)) || defaults[dir].ease;
    return { duration: motion.dur[durToken], ease: motion.ease[easeToken] };
  };

  return { open: build('open'), close: build('close') };
}
