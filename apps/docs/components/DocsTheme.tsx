'use client';

import { useSyncExternalStore } from 'react';

import { ZyncatTheme, type ThemeTransitionOptions } from '@zyncat/ui/theme';

import { DOCS_THEMES } from '@/lib/themes';

export const DEFAULT_TRANSITION: ThemeTransitionOptions = { effect: 'paint', speed: 1, intensity: 1 };

let transition = DEFAULT_TRANSITION;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const read = () => transition;
const readDefault = () => DEFAULT_TRANSITION;

export function setDocsTransition(next: ThemeTransitionOptions): void {
  transition = next;
  for (const listener of listeners) listener();
}

export function useDocsTransition(): ThemeTransitionOptions {
  return useSyncExternalStore(subscribe, read, readDefault);
}

export function DocsTheme() {
  const setting = useDocsTransition();
  return <ZyncatTheme themes={DOCS_THEMES} transition={setting} />;
}
