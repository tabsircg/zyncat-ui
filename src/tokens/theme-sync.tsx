'use client';

import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import { refreshMotionTokens } from './motion-tokens';
import * as store from './theme-store';

const setTheme = (theme: string) => store.setThemePreference({ theme });
const setPolarity = (polarity: store.PolarityPreference) => store.setThemePreference({ polarity });

export function useTheme(): store.ThemeControls {
  const state = useSyncExternalStore(store.subscribeTheme, store.getThemeSnapshot, store.getServerThemeSnapshot);
  return useMemo(() => ({ ...state, setTheme, setPolarity }), [state]);
}

export function ThemeSync({ css, config }: { css: string; config: string | null }): null {
  if (config) store.configureThemeStore(config);

  useLayoutEffect(() => {
    if (config) store.applyTheme();
  }, [config]);

  useEffect(() => {
    refreshMotionTokens();
    return () => {
      refreshMotionTokens();
    };
  }, [css]);

  return null;
}
