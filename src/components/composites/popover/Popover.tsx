'use client';

import './popover.css';

import { Fragment, useId, useRef, type HTMLAttributes, type ReactElement, type ReactNode, type RefObject } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { resolveMotionTiming } from '../../../motion/motion-timing';
import { Presence } from '../../../motion/presence';
import { popIn, popOut } from '../../../motion/presets';
import type { DisableableAnimation } from '../../../motion/timing';
import { useMotion, type MotionSpecs } from '../../../motion/use-motion';
import { motionFor } from '../../../tokens/motion-tokens';
import { useControllable } from '../../internal/hooks/use-controllable';
import { useReturnFocus } from '../../internal/overlay/focus';
import { ovCloneTrigger, OverlayPortal, useOutsidePress, useOverlayEntry } from '../../internal/overlay/layer';
import { useAnchorPosition, type VirtualAnchor } from '../../internal/overlay/position';
import type { ActivateOn } from '../../internal/utils/activation';
import { cx } from '../../internal/utils/cx';

export type { VirtualAnchor };

const POPOVER_TIMING = {
  open: { duration: 'base', ease: 'entrance' },
  close: { duration: 'fast', ease: 'exit' },
} as const;

export interface PopoverProps {
  /** Controlled open state. Omit to stay uncontrolled. */
  open?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  /** Fires whenever the open state changes. Pair with `open` for controlled use. */
  onOpenChange?: (open: boolean) => void;

  /** Cloned to toggle the panel, and used as the anchor unless `anchor` is set. */
  trigger?: ReactElement | null;
  /** Whether the trigger fires on `pointerdown` (snappier) or waits for `click`. @default 'click' */
  activateOn?: ActivateOn;
  /** Anchor to an arbitrary rect instead of the trigger - any `{ getBoundingClientRect() }`, which an element also satisfies.
   *  Drive `open` yourself; pass a new object to re-place a moving anchor. */
  anchor?: VirtualAnchor | null;

  /** Preferred side; flips to the opposite side when cramped. Default 'bottom'. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Cross-axis alignment against the trigger. Default 'start'. */
  align?: 'start' | 'center' | 'end';
  /** Caret tracking the trigger center. Default false. */
  arrow?: boolean;

  /** Esc + outside-press dismissal. Default true. */
  dismissible?: boolean;

  /** Base id for the panel; drives the trigger's `aria-controls`. Auto-generated when omitted. */
  id?: string;
  /** Standard attributes (className, style, data-*, ...) forwarded to the popover panel. */
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  /** Open/close timing - motion tokens only, or `null` to disable. @default open 'base'/'entrance', close 'fast'/'exit' */
  animation?: DisableableAnimation;
  /** The ENTIRE surface - paint AND semantics. Drive dismissal with `open`/`onOpenChange`. */
  children: ReactNode;
}

function PopoverPanel({
  panelId,
  side,
  align,
  arrow,
  dismissible,
  requestClose,
  anchor,
  triggerRef,
  htmlProps,
  animate,
  exit,
  children,
}: {
  panelId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
  arrow: boolean;
  dismissible: boolean;
  requestClose: () => void;
  anchor?: VirtualAnchor | null;
  triggerRef: RefObject<HTMLElement>;
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  children: ReactNode;
} & MotionSpecs) {
  const panelRef = useRef<HTMLElement>(null);
  const entry = useOverlayEntry({ nodeRef: panelRef, dismissible, requestClose });
  useMotion(panelRef, { animate, exit });
  useReturnFocus(panelRef);
  useAnchorPosition({ side, align, arrow, anchor, triggerRef, panelRef });
  useOutsidePress({ entry, refs: [triggerRef, panelRef], enabled: dismissible, onPress: requestClose });
  return (
    <div
      {...htmlProps}
      id={panelId}
      ref={panelRef as RefObject<HTMLDivElement>}
      className={cx('zc-overlay-popover', htmlProps?.className)}
    >
      {arrow && <span className="zc-overlay-popover__arrow" aria-hidden="true"></span>}
      {children}
    </div>
  );
}

export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  trigger = null,
  activateOn,
  anchor = null,
  side = 'bottom',
  align = 'start',
  arrow = false,
  dismissible = true,
  id,
  htmlProps,
  animation,
  children,
}: PopoverProps) {
  const [open, setOpen] = useControllable(controlledOpen, defaultOpen, onOpenChange);
  const triggerRef = useRef<HTMLElement>(null);
  const autoId = useId();
  const panelId = id || 'popover-' + autoId;
  const close = () => setOpen(false);
  const timings = resolveMotionTiming(animation, POPOVER_TIMING, triggerRef.current);

  return (
    <Fragment>
      {ovCloneTrigger(trigger, {
        open,
        onPress: () => setOpen(!open),
        panelId,
        haspopup: 'true',
        triggerRef,
        activateOn,
      })}
      <OverlayPortal scope={triggerRef.current}>
        <Presence>
          {open && (
            <PopoverPanel
              key="panel"
              animate={popIn(motionFor(triggerRef.current).scale.floating, timings.open)}
              exit={popOut(motionFor(triggerRef.current).scale.floating, timings.close)}
              panelId={panelId}
              side={side}
              align={align}
              arrow={arrow}
              dismissible={dismissible}
              requestClose={close}
              anchor={anchor}
              triggerRef={triggerRef}
              htmlProps={htmlProps}
            >
              {children}
            </PopoverPanel>
          )}
        </Presence>
      </OverlayPortal>
    </Fragment>
  );
}
