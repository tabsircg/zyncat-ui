'use client';

import './theme-switcher.css';

import { useId, type CSSProperties, type HTMLAttributes, type KeyboardEvent } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { Motion } from '../../../motion/element';
import { setThemePreference, type Polarity, type PolarityPreference } from '../../../tokens/theme-store';
import { useTheme } from '../../../tokens/theme-sync';
import { cx } from '../../internal/utils/cx';

const POLARITIES: readonly PolarityPreference[] = ['system', 'light', 'dark'];
const CAPTIONS: Record<PolarityPreference, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const STEPS: Record<string, number[]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

const focusOnMount = (node: HTMLElement | null) => node?.focus({ preventScroll: true });

export interface ThemeGridProps {
  /** Overrides the palette's own `name`, keyed like `themes`. For names that come from a translation. */
  labels?: Record<string, string>;
  /** Accessible name of the radio group. @default 'Theme' */
  label?: string;
  /** Focus the selected card on mount - for a grid that opens inside an overlay. @default false */
  autoFocus?: boolean;
  /** Enter or Tab on a card. `ThemeSwitcher` closes its panel with it; inline, leave it unset. */
  onDismiss?: () => void;
  /** Extra class(es) merged onto the grid. */
  className?: string;
  /** Inline styles merged onto the grid. */
  style?: CSSProperties;
  /** Standard <div> attributes (aria-*, data-*, ...) forwarded to the grid. */
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
}

function Mini({ palette, polarity, half }: { palette: string; polarity: Polarity; half?: boolean }) {
  return (
    <span
      className={cx('zc-theme-switcher__mini', half && 'zc-theme-switcher__mini--half')}
      data-theme={palette}
      data-polarity={polarity}
    />
  );
}

export function ThemeGrid({
  labels,
  label = 'Theme',
  autoFocus = false,
  onDismiss,
  className,
  style,
  htmlProps,
}: ThemeGridProps) {
  const { theme, polarity, themes, themeNames } = useTheme();
  const ringId = useId();
  const nameOf = (palette: string) => labels?.[palette] ?? themeNames[palette] ?? palette;

  const onKeyDown = (event: KeyboardEvent, row: number, col: number) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
      if (!onDismiss) return;
      event.preventDefault();
      onDismiss();
      return;
    }
    const step = STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    setThemePreference({
      theme: themes[(row + step[0] + themes.length) % themes.length],
      polarity: POLARITIES[(col + step[1] + POLARITIES.length) % POLARITIES.length],
    });
  };

  return (
    <div
      {...htmlProps}
      role="radiogroup"
      aria-label={label}
      style={style}
      className={cx('zc-theme-switcher__grid', className)}
    >
      {themes.map((palette, row) => (
        <div key={palette} className="zc-theme-switcher__row">
          {themes.length > 1 && (
            <span className="zc-theme-switcher__row-label" aria-hidden="true">
              {nameOf(palette)}
            </span>
          )}
          {POLARITIES.map((choice, col) => {
            const checked = palette === theme && choice === polarity;
            return (
              <button
                key={choice}
                ref={checked && autoFocus ? focusOnMount : undefined}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={`${nameOf(palette)}, ${CAPTIONS[choice]}`}
                tabIndex={checked ? 0 : -1}
                className={cx('zc-theme-switcher__card', checked && 'zc-is-selected')}
                onClick={() => setThemePreference({ theme: palette, polarity: choice })}
                onKeyDown={(event) => onKeyDown(event, row, col)}
              >
                <span className="zc-theme-switcher__preview">
                  <Mini palette={palette} polarity={choice === 'dark' ? 'dark' : 'light'} />
                  {choice === 'system' && <Mini palette={palette} polarity="dark" half />}
                  {checked && (
                    <Motion as="span" layoutId={ringId} className="zc-theme-switcher__ring" aria-hidden="true" />
                  )}
                </span>
                {CAPTIONS[choice]}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
