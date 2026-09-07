'use client';

import './theme-switcher.css';

import { useState, type CSSProperties } from 'react';

import type { DisableableAnimation } from '../../../motion/timing';
import { useTheme } from '../../../tokens/theme-sync';
import { cx } from '../../internal/utils/cx';
import { Button, type ButtonProps } from '../../primitives/button/Button';
import { Popover } from '../popover/Popover';
import { ThemeGrid, type ThemeGridProps } from './ThemeGrid';

const CAPTIONS: Record<string, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export interface ThemeSwitcherProps {
  /** Overrides the palette's own `name`, keyed like `themes`. For names that come from a translation. */
  labels?: ThemeGridProps['labels'];
  /** Accessible name of the control and its grid. @default 'Theme' */
  label?: string;
  /** Preferred side of the panel; flips to the opposite side when cramped. @default 'bottom' */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Cross-axis alignment of the panel against the chip. @default 'end' */
  align?: 'start' | 'center' | 'end';
  /** Open/close timing - motion tokens only, or `null` to disable. @default open 'base'/'entrance', close 'fast'/'exit' */
  animation?: DisableableAnimation;
  /** Extra class(es) merged onto the chip. */
  className?: string;
  /** Inline styles merged onto the chip. */
  style?: CSSProperties;
  /** Standard <button> attributes (aria-*, data-*, ...) forwarded to the chip. */
  htmlProps?: ButtonProps['htmlProps'];
}

export function ThemeSwitcher({
  labels,
  label = 'Theme',
  side = 'bottom',
  align = 'end',
  animation,
  className,
  style,
  htmlProps,
}: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { theme, polarity, themeNames } = useTheme();

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side={side}
      align={align}
      animation={animation}
      htmlProps={{ className: 'zc-theme-switcher__panel', 'data-theme-lead': '' }}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className={cx('zc-theme-switcher', className)}
          style={style}
          aria-label={`${label}: ${labels?.[theme] ?? themeNames[theme] ?? theme}, ${CAPTIONS[polarity]}`}
          htmlProps={{ 'data-theme-lead': '', ...htmlProps }}
        >
          <span className="zc-theme-switcher__preview zc-theme-switcher__preview--chip" aria-hidden="true">
            <span className="zc-theme-switcher__mini" />
          </span>
        </Button>
      }
    >
      <ThemeGrid labels={labels} label={label} autoFocus onDismiss={() => setOpen(false)} />
    </Popover>
  );
}
