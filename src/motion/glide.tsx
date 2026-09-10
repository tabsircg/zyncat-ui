'use client';

import { useCallback, useMemo, useRef, type RefObject } from 'react';

import { animate, flip, measure, set, type Box } from '../engine';
import { motionFor } from '../tokens/motion-tokens';

export type GlideApi = ReturnType<typeof useGlide>;

function layoutBox(target: HTMLElement, container: HTMLElement): Box | null {
  let left = 0;
  let top = 0;
  let el = target;
  while (el !== container) {
    left += el.offsetLeft;
    top += el.offsetTop;
    const parent = el.offsetParent;
    if (!(parent instanceof HTMLElement)) return null;
    if (parent !== container) {
      left += parent.clientLeft;
      top += parent.clientTop;
    }
    el = parent;
  }
  return { left, top, width: target.offsetWidth, height: target.offsetHeight };
}

export function useGlide<T extends HTMLElement>(containerRef: RefObject<T | null>) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const visible = useRef(false);

  const enter = useCallback(
    (target: HTMLElement | null) => {
      const box = containerRef.current,
        pill = ref.current;
      if (!box || !pill || !target) return;
      const at = layoutBox(target, box);
      if (!at) return;
      const motion = motionFor(box);
      const was = measure(pill);
      set(pill, { x: [at.left], y: [at.top], width: [at.width], height: [at.height] });
      animate(pill, { opacity: [1], timing: { duration: motion.dur.fast, ease: motion.ease.standard } });
      const glided = visible.current && !motion.reduced && was.width > 0 && was.height > 0;
      visible.current = true;
      if (glided) flip(pill, was, { size: 'morph', timing: motion.t.glide });
    },
    [containerRef],
  );

  const leave = useCallback(() => {
    visible.current = false;
    if (!ref.current) return;
    const motion = motionFor(containerRef.current);
    animate(ref.current, { opacity: [0], timing: { duration: motion.dur.fast, ease: motion.ease.exit } });
  }, [containerRef]);

  return useMemo(() => ({ ref, enter, leave }), [enter, leave]);
}

export function GlidePill({ className, glide }: { className?: string; glide: GlideApi }) {
  return <span ref={glide.ref} className={className} style={{ overflowAnchor: 'none' }} aria-hidden="true" />;
}
