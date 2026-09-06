'use client';

import { useSyncExternalStore } from 'react';

import { Button } from '@zyncat/ui/button';

import { Icon } from './icon';

type Polarity = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'zyncat-docs-theme';

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-polarity'] });
  return () => observer.disconnect();
};

const readPolarity = (): Polarity => (document.documentElement.dataset.polarity === 'dark' ? 'dark' : 'light');

const serverPolarity = (): Polarity => 'light';

export function ThemeToggle() {
  const polarity = useSyncExternalStore(subscribe, readPolarity, serverPolarity);
  const dark = polarity === 'dark';

  const toggle = () => {
    const next: Polarity = dark ? 'light' : 'dark';
    document.documentElement.dataset.polarity = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'}
      aria-pressed={dark}
    >
      <Icon name={dark ? 'sun' : 'moon'} size="sm" />
    </Button>
  );
}
