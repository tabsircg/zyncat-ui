'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

import { motionFor } from '../../../tokens/motion-tokens';

export interface PressFeedback {
  pressed: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

export function usePressFeedback(inert: boolean): PressFeedback {
  const [pressed, setPressed] = useState(false);
  const holdUntil = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listeners = useRef<AbortController | undefined>(undefined);

  const release = useCallback(() => {
    listeners.current?.abort();
    listeners.current = undefined;
    clearTimeout(timer.current);
    const remaining = holdUntil.current - Date.now();
    if (remaining > 0) timer.current = setTimeout(() => setPressed(false), remaining);
    else setPressed(false);
  }, []);

  useEffect(
    () => () => {
      listeners.current?.abort();
      clearTimeout(timer.current);
    },
    [],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (inert) return;
      listeners.current?.abort();
      clearTimeout(timer.current);
      holdUntil.current = Date.now() + motionFor(event.currentTarget).dur.fast * 1000;
      setPressed(true);
      const controller = new AbortController();
      listeners.current = controller;
      addEventListener('pointerup', release, { signal: controller.signal });
      addEventListener('pointercancel', release, { signal: controller.signal });
    },
    [inert, release],
  );

  return { pressed, onPointerDown, onPointerLeave: release };
}
