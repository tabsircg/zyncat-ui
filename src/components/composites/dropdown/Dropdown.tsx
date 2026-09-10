'use client';

import './dropdown.css';

import {
  Fragment,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type RefObject,
} from 'react';

import type { DataAttributes } from '../../../dom-props';
import { resolveMotionTiming } from '../../../motion/motion-timing';
import { Presence } from '../../../motion/presence';
import { popIn, popOut } from '../../../motion/presets';
import type { DisableableAnimation } from '../../../motion/timing';
import { motionFor } from '../../../tokens/motion-tokens';
import { useControllable } from '../../internal/hooks/use-controllable';
import { ovCloneTrigger, OverlayPortal } from '../../internal/overlay/layer';
import type { ActivateOn } from '../../internal/utils/activation';
import { MenuPanel } from './menu-panel';
import {
  levelKey,
  resolveLevels,
  ROOT_LEVEL,
  type DropdownItem,
  type DropdownItems,
  type MenuChain,
  type SeedFocus,
} from './types';

export type { DropdownItem, DropdownGroup } from './types';

const DROPDOWN_TIMING = {
  open: { duration: 'base', ease: 'entrance' },
  close: { duration: 'fast', ease: 'exit' },
} as const;

export interface DropdownProps {
  /** The rows - a flat `DropdownItem[]`, or `DropdownGroup[]` to render divided sections.
   *  A row with its own `items` opens a submenu instead of committing. @default [] */
  items: DropdownItems;
  /** Cloned to toggle the menu, and used as the anchor. Gets the `aria-haspopup="menu"` wiring. */
  trigger: ReactElement;
  /** Whether the trigger and the rows fire on `pointerdown` (snappier) or wait for `click`. @default 'pointerdown' */
  activateOn?: ActivateOn;

  /** Controlled open state. Omit to stay uncontrolled. */
  open?: boolean;
  /** Initial state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Fires whenever the open state changes. Pair with `open` for controlled use. */
  onOpenChange?: (open: boolean) => void;
  /** Fires when a row commits - gets its `id` and the full item. Committing closes every level. */
  onSelect?: (id: string, item: DropdownItem) => void;
  /** Move focus back to the trigger when a row commits or the keyboard dismisses the menu. Turn off when
   *  rows place focus themselves - an editor command that refocuses its document. @default true */
  returnFocus?: boolean;

  /** Preferred side of the trigger; flips to the opposite side when cramped. @default 'bottom' */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Cross-axis alignment against the trigger. Submenus always align to their row. @default 'start' */
  align?: 'start' | 'center' | 'end';
  /** Hue of the highlight that travels between rows: the neutral wash, or the accent wash with accent
   *  ink on the active row. @default 'neutral' */
  highlight?: 'neutral' | 'accent';
  /** Short accent bar on the leading edge of the highlight, marking the active row. @default false */
  rail?: boolean;

  /** Base id for the menu and its rows; drives the trigger's `aria-controls`. Auto-generated when omitted. */
  id?: string;
  /** Accessible name for the menu - supply when the trigger's own label does not describe it. */
  ariaLabel?: string;
  /** Standard attributes (className, style, data-*, ...) forwarded to the top-level menu panel. */
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  /** Open/close timing - motion tokens only, or `null` to disable. @default open 'base'/'entrance', close 'fast'/'exit' */
  animation?: DisableableAnimation;
}

export function Dropdown({
  items = [],
  trigger,
  activateOn = 'pointerdown',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  returnFocus = true,
  side = 'bottom',
  align = 'start',
  highlight = 'neutral',
  rail = false,
  id,
  ariaLabel,
  htmlProps,
  animation,
}: DropdownProps) {
  const [open, setOpen] = useControllable(controlledOpen, defaultOpen, onOpenChange);
  const [path, setPath] = useState<string[]>([]);
  const [seed, setSeed] = useState({ key: ROOT_LEVEL, focus: 'first' as SeedFocus });

  const refs = useRef(new Map<string, RefObject<HTMLElement>>());
  const hoverDepth = useRef(-1);
  const autoId = useId();
  const menuId = id || 'dropdown-' + autoId;
  const levels = useMemo(() => resolveLevels(items, path), [items, path]);

  const refFor = (key: string): RefObject<HTMLElement> => {
    if (!refs.current.has(key)) refs.current.set(key, { current: null });
    return refs.current.get(key)!;
  };
  const triggerRef = refFor('trigger');
  const timings = resolveMotionTiming(animation, DROPDOWN_TIMING, triggerRef.current);

  const dismiss = (refocus: boolean) => {
    setPath([]);
    hoverDepth.current = -1;
    setOpen(false);
    if (refocus && returnFocus && triggerRef.current) triggerRef.current.focus();
  };

  const show = (focus: SeedFocus) => {
    setSeed({ key: ROOT_LEVEL, focus });
    setPath([]);
    setOpen(true);
  };

  const chain: MenuChain = {
    levels,
    menuId,
    activateOn,
    side,
    align,
    highlight,
    rail,
    ariaLabel,
    htmlProps,
    seed,
    hoverDepth,
    refFor,
    dismiss,
    openSub: (depth, item, focus) => {
      setSeed({ key: levelKey(depth + 1, item.id), focus });
      setPath([...path.slice(0, depth), item.id]);
    },
    closeSub: (depth) => {
      if (path.length > depth) setPath(path.slice(0, depth));
    },
    cancel: (depth) => {
      if (depth === 0) return dismiss(true);
      setPath(path.slice(0, depth - 1));
      const owner = refFor('row:' + levelKey(depth - 1, levels[depth].owner!.id)).current;
      if (owner) owner.focus();
    },
    select: (item) => {
      if (item.onSelect) item.onSelect();
      if (onSelect) onSelect(item.id, item);
      dismiss(true);
    },
  };

  return (
    <Fragment>
      {ovCloneTrigger(trigger, {
        open,
        onPress: () => (open ? dismiss(false) : show('first')),
        onKeyDown: (e) => {
          if (open || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
          e.preventDefault();
          show(e.key === 'ArrowDown' ? 'first' : 'last');
        },
        panelId: menuId,
        haspopup: 'menu',
        triggerRef,
        activateOn,
      })}
      <OverlayPortal scope={triggerRef.current}>
        <Presence>
          {open &&
            levels.map((level, depth) => (
              <MenuPanel
                key={level.key}
                chain={chain}
                depth={depth}
                animate={popIn(motionFor(triggerRef.current).scale.floating, timings.open)}
                exit={popOut(motionFor(triggerRef.current).scale.floating, timings.close)}
              />
            ))}
        </Presence>
      </OverlayPortal>
    </Fragment>
  );
}
