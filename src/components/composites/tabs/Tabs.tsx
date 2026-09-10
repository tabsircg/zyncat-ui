'use client';

import './tabs.css';

import {
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import type { DataAttributes } from '../../../dom-props';
import { animate, set } from '../../../engine';
import { Motion } from '../../../motion/element';
import { GlidePill, useGlide } from '../../../motion/glide';
import { resolveMotionTiming } from '../../../motion/motion-timing';
import { type DisableableAnimation } from '../../../motion/timing';
import { motionFor } from '../../../tokens/motion-tokens';
import { useScrollEdges } from '../../internal/hooks/use-scroll-edges';
import { IconSlot } from '../../internal/icon/IconSlot';
import { activationProps, type ActivateOn } from '../../internal/utils/activation';
import { cx } from '../../internal/utils/cx';

/** One tab in the row. */
export interface TabItem {
  /** Stable identity - also used in the tab/panel id pair. */
  value: string;
  /** Visible tab text. */
  label: ReactNode;
  /** Leading icon - your own node. */
  icon?: ReactNode;
  /** Rendered mono + tabular. Pass a number or a preformatted string. */
  count?: number | string;
  /** Dims the tab, blocks selection, and skips it during arrow-key travel. */
  disabled?: boolean;
}

interface TabsOwnProps {
  /** The tab row, in order. @default [] */
  items: TabItem[];
  /** Controlled - the value of the active tab (null/undefined hides the ink). */
  value: string | null | undefined;
  /** Fires on click and on arrow-key travel. `dir` is the direction of travel (+1 right, -1 left);
   *  hand it to TabPanel so content enters from that side. */
  onChange?: (value: string, dir: 1 | -1) => void;
  /** Shared id prefix wiring tab and panel aria. Give Tabs and its TabPanel the same `name`;
   *  omit it when the tabs have no managed panel. */
  name?: string;
  /** Accessible name for the tablist (e.g. "Section views"). */
  ariaLabel?: string;
  /** Whether a tab switches on `pointerdown` (snappier) or waits for `click`. @default 'pointerdown' */
  activateOn?: ActivateOn;
  /** Skin: an underline that reaches across (default), or a segmented pill riding an inset track. */
  variant?: 'underline' | 'pill';
  /** Stretch the row to its container and split it evenly between the tabs. */
  fill?: boolean;
  /** Extra class(es) merged onto the root. */
  className?: string;
  /** Inline styles merged onto the root. */
  style?: CSSProperties;
}

export interface TabsProps extends TabsOwnProps {
  /** Standard <div> attributes (data-*, aria-*, ...) forwarded to the root. */
  htmlProps?: Omit<HTMLAttributes<HTMLDivElement>, keyof TabsOwnProps> & DataAttributes;
}

const TABS_EDGE_PAD = 24;
const TABS_ENTER_X = 20;

export function Tabs({
  items = [],
  value,
  onChange,
  name,
  ariaLabel,
  activateOn = 'pointerdown',
  variant = 'underline',
  fill = false,
  className = '',
  style,
  htmlProps,
}: TabsProps) {
  const autoId = useId();
  const base = name || autoId;
  const pill = variant === 'pill';

  const listRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const placedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const glide = useGlide(listRef);

  const place = (animated: boolean) => {
    const list = listRef.current,
      ink = inkRef.current;
    const el = valueRef.current != null ? tabRefs.current[valueRef.current] : null;
    if (!list || !ink) return;
    if (!el) {
      ink.style.opacity = '0';
      placedRef.current = false;
      return;
    }
    const next = { x: el.offsetLeft, w: el.offsetWidth };
    ink.style.opacity = '1';

    const motion = motionFor(list);

    if (!animated || !placedRef.current || motion.reduced) {
      set(ink, { x: [next.x], width: [next.w] });
    } else {
      const lr = list.getBoundingClientRect();
      const ir = ink.getBoundingClientRect();
      const cur = { x: ir.left - lr.left + list.scrollLeft, w: ir.width };
      if (Math.abs(cur.x - next.x) > 0.5 || Math.abs(cur.w - next.w) > 0.5) {
        const dir = next.x + next.w / 2 >= cur.x + cur.w / 2 ? 1 : -1;
        const span = dir === 1 ? next.x + next.w - cur.x : cur.x + cur.w - next.x;
        const lead = dir === 1 ? cur.x : next.x;
        animate(ink, {
          x: [cur.x, lead, next.x],
          width: [cur.w, span, next.w],
          timing: {
            duration: motion.dur.slow,
            times: [0, 0.55, 1],
            ease: [motion.ease.standard, motion.ease.entrance],
          },
        });
      }
    }
    placedRef.current = true;
  };

  const syncEdges = useScrollEdges(listRef, (edges, el) => {
    el.dataset.fade = ((edges.left ? 'start ' : '') + (edges.right ? 'end' : '')).trim();
  });

  useLayoutEffect(() => {
    place(true);
    const l = listRef.current,
      el = value != null ? tabRefs.current[value] : null;
    if (l && el && l.scrollWidth > l.clientWidth) {
      const behavior: ScrollBehavior = motionFor(l).reduced ? 'auto' : 'smooth';
      if (el.offsetLeft < l.scrollLeft + TABS_EDGE_PAD) {
        l.scrollTo({ left: el.offsetLeft - TABS_EDGE_PAD, behavior });
      } else if (el.offsetLeft + el.offsetWidth > l.scrollLeft + l.clientWidth - TABS_EDGE_PAD) {
        l.scrollTo({ left: el.offsetLeft + el.offsetWidth - l.clientWidth + TABS_EDGE_PAD, behavior });
      }
    }
  }, [value]);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      place(false);
      syncEdges();
    });
    if (listRef.current) ro.observe(listRef.current);
    Object.values(tabRefs.current).forEach((el) => el && ro.observe(el));
    syncEdges();
    return () => ro.disconnect();
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (v: string) => {
    if (v === value || !onChange) return;
    const idx = (x: string | null | undefined) => items.findIndex((i) => i.value === x);
    onChange(v, idx(v) >= idx(value) ? 1 : -1);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const enabled = items.filter((i) => !i.disabled);
    if (!enabled.length) return;
    let next: TabItem | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const i = enabled.findIndex((it) => it.value === value);
      next = enabled[(i + step + enabled.length) % enabled.length];
    } else if (e.key === 'Home') {
      next = enabled[0];
    } else if (e.key === 'End') {
      next = enabled[enabled.length - 1];
    }
    if (!next) return;
    e.preventDefault();
    select(next.value);
    const el = tabRefs.current[next.value];
    if (el) el.focus();
  };

  const focusValue = items.some((i) => i.value === value && !i.disabled)
    ? value
    : (items.find((i) => !i.disabled) || ({} as Partial<TabItem>)).value;

  return (
    <div
      className={cx('zc-tabs', pill && 'zc-tabs--pill', fill && 'zc-tabs--fill', className)}
      style={style}
      {...htmlProps}
    >
      <div
        className="zc-tabs__list"
        role="tablist"
        aria-label={ariaLabel}
        ref={listRef}
        onKeyDown={onKeyDown}
        onPointerLeave={pill ? undefined : glide.leave}
      >
        {!pill && <GlidePill className="zc-tab__hover" glide={glide} />}
        {items.map((it) => {
          const selected = it.value === value;
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              id={base + '-tab-' + it.value}
              aria-selected={selected}
              aria-controls={name ? name + '-panel-' + it.value : undefined}
              tabIndex={it.value === focusValue ? 0 : -1}
              disabled={it.disabled}
              className={'zc-tab' + (selected ? ' zc-is-selected' : '')}
              ref={(el) => {
                tabRefs.current[it.value] = el;
              }}
              {...activationProps<HTMLButtonElement>(() => select(it.value), { on: activateOn })}
              onPointerEnter={
                it.disabled || pill ? undefined : (e) => glide.enter(e.currentTarget.firstElementChild as HTMLElement)
              }
            >
              <span className="zc-tab__pad">
                {it.icon && <IconSlot size="sm">{it.icon}</IconSlot>}
                <span className="zc-tab__label">{it.label}</span>
                {it.count != null && <span className="zc-tab__count">{it.count}</span>}
              </span>
            </button>
          );
        })}
        <span className="zc-tabs__ink" key="ink" ref={inkRef} aria-hidden="true"></span>
      </div>
    </div>
  );
}

interface TabPanelOwnProps {
  /** The active tab's value - changing it cuts to the new content. */
  tab: string;
  /** Same `name` as the paired Tabs - wires role/id/aria-labelledby. */
  name?: string;
  /** Direction of travel from Tabs' onChange; 0 = plain fade. */
  dir?: -1 | 0 | 1;
  /** Panel content - only this inner node animates in on `tab` change; the root chrome stays static. */
  children?: ReactNode;
  /** Entrance timing for the inner content - motion tokens only, or `null` to disable.
   *  @default duration 'base' + ease 'entrance' */
  animation?: DisableableAnimation;
  /** Extra class(es) merged onto the root. */
  className?: string;
  /** Inline styles merged onto the root. */
  style?: CSSProperties;
}

export interface TabPanelProps extends TabPanelOwnProps {
  /** Standard <div> attributes (data-*, aria-*, ...) forwarded to the root. */
  htmlProps?: Omit<HTMLAttributes<HTMLDivElement>, keyof TabPanelOwnProps> & DataAttributes;
}

const TABPANEL_TIMING = {
  open: { duration: 'base', ease: 'entrance' },
  close: { duration: 'base', ease: 'entrance' },
} as const;

export function TabPanel({ tab, name, dir = 0, className = '', style, children, animation, htmlProps }: TabPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const enter = resolveMotionTiming(animation, TABPANEL_TIMING, panelRef.current).open;

  return (
    <Motion
      ref={panelRef}
      layout
      layoutTransition={{ size: 'morph', timing: enter }}
      role="tabpanel"
      tabIndex={0}
      id={name ? `${name}-panel-${tab}` : undefined}
      aria-labelledby={name ? `${name}-tab-${tab}` : undefined}
      className={cx('zc-tab-panel', className)}
      style={style}
      {...htmlProps}
    >
      <Motion className="zc-tab-panel__inner" animate={{ x: [dir * TABS_ENTER_X, 0], timing: enter }} deps={[tab]}>
        {children}
      </Motion>
    </Motion>
  );
}
