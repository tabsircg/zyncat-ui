'use client';

import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import type { ThemeTransitionSetting } from '../components/expressive/theme-transition/theme-transition';
import { refreshMotionTokens } from './motion-tokens';
import * as store from './theme-store';

const loadThemeTransition = () => import('../components/expressive/theme-transition/theme-transition');

const setTheme = (theme: string) => store.setThemePreference({ theme });
const setPolarity = (polarity: store.PolarityPreference) => store.setThemePreference({ polarity });

export function useTheme(): store.ThemeControls {
  const state = useSyncExternalStore(store.subscribeTheme, store.getThemeSnapshot, store.getServerThemeSnapshot);
  return useMemo(() => ({ ...state, setTheme, setPolarity }), [state]);
}

export function useThemeTarget(): store.ThemeState {
  return useSyncExternalStore(store.subscribeTheme, store.getThemeTargetSnapshot, store.getServerThemeSnapshot);
}

export function ThemeSync({
  css,
  config,
  transition,
}: {
  css: string;
  config: string | null;
  transition?: ThemeTransitionSetting;
}): null {
  if (config) store.configureThemeStore(config);
  const transitionKey = config && transition ? JSON.stringify(transition) : null;

  useLayoutEffect(() => {
    if (config) store.applyTheme();
  }, [config]);

  useEffect(() => {
    if (!transitionKey) return;
    const setting = JSON.parse(transitionKey) as ThemeTransitionSetting;
    let live = true;
    void loadThemeTransition().then((module) => {
      if (!live) return;
      module.preloadThemeTransition(setting);
      store.setThemeTransition((change) => module.runThemeTransition(change, setting));
    });
    return () => {
      live = false;
      store.setThemeTransition(null);
    };
  }, [transitionKey]);

  useEffect(() => {
    refreshMotionTokens();
    return () => {
      refreshMotionTokens();
    };
  }, [css]);

  return null;
}
