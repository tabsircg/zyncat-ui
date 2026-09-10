'use client';

import './sheet.css';

import { Fragment, useId, useRef, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { resolveMotionTiming, type MotionTimings } from '../../../motion/motion-timing';
import { Presence } from '../../../motion/presence';
import type { DisableableAnimation } from '../../../motion/timing';
import type { MotionSpecs } from '../../../motion/use-motion';
import { useControllable } from '../../internal/hooks/use-controllable';
import { ovCloneTrigger, OverlayPortal } from '../../internal/overlay/layer';
import { ModalShell } from '../../internal/overlay/modal';
import type { ActivateOn } from '../../internal/utils/activation';
import { useSheetDrag } from './use-sheet-drag';

const SHEET_TIMING = {
  open: { duration: 'slow', ease: 'entrance' },
  close: { duration: 'base', ease: 'exit' },
} as const;

const SHEET_REST_SCALE: [number, number][] = [[1, 1]];

export interface SheetProps {
  /** Controlled open state. Omit to stay uncontrolled. */
  open?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  /** Fires whenever the open state changes. Pair with `open` for controlled use. */
  onOpenChange?: (open: boolean) => void;

  /** Cloned to open the sheet. */
  trigger?: ReactElement | null;
  /** Whether the trigger fires on `pointerdown` (snappier) or waits for `click`. @default 'click' */
  activateOn?: ActivateOn;

  /** Edge the sheet slides in from. Default 'right'. */
  side?: 'right' | 'bottom';

  /** Scrim/Esc dismissal + drag-to-edge. Default true. */
  dismissible?: boolean;

  /** Dock inside this element instead of the viewport - it must be positioned (`position: relative` or similar).
   *  Scrim, scroll lock and inert scope to it; the rest of the page stays interactive. */
  container?: HTMLElement | null;

  /** Base id for the panel; drives the trigger's `aria-controls`. Auto-generated when omitted. */
  id?: string;
  /** Standard attributes (className, style, data-*, ...) forwarded to the sheet panel. */
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  /** Open/close timing - motion tokens only, or `null` to disable. @default open 'slow'/'entrance', close 'base'/'exit' */
  animation?: DisableableAnimation;
  /** The ENTIRE surface - paint AND semantics. Drive dismissal with `open`/`onOpenChange`. */
  children: ReactNode;
}

function SheetShell({
  side,
  panelId,
  dismissible,
  container,
  requestClose,
  htmlProps,
  timings,
  animate,
  exit,
  children,
}: {
  side: 'right' | 'bottom';
  panelId: string;
  dismissible: boolean;
  container?: HTMLElement | null;
  requestClose: () => void;
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  timings: MotionTimings;
  children: ReactNode;
} & MotionSpecs) {
  const panelRef = useRef<HTMLElement>(null);
  const dragProps = useSheetDrag({ side, panelRef, enabled: dismissible, requestClose });
  return (
    <ModalShell
      timings={timings}
      animate={animate}
      exit={exit}
      layerClass={'zc-overlay-layer--sheet-' + side}
      panelClass={'zc-overlay-panel--sheet-' + side}
      panelId={panelId}
      dismissible={dismissible}
      container={container}
      requestClose={requestClose}
      panelRef={panelRef}
      panelProps={{ ...htmlProps, ...dragProps }}
    >
      {children}
    </ModalShell>
  );
}

export function Sheet({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  trigger = null,
  activateOn,
  side = 'right',
  dismissible = true,
  container = null,
  id,
  htmlProps,
  animation,
  children,
}: SheetProps) {
  const [open, setOpen] = useControllable(controlledOpen, defaultOpen, onOpenChange);
  const triggerRef = useRef<HTMLElement>(null);
  const autoId = useId();
  const panelId = id || 'sheet-' + autoId;
  const close = () => setOpen(false);
  const timings = resolveMotionTiming(animation, SHEET_TIMING, container ?? triggerRef.current);
  const axis = side === 'bottom' ? 'y' : 'x';

  return (
    <Fragment>
      {ovCloneTrigger(trigger, {
        open,
        onPress: () => setOpen(true),
        panelId,
        haspopup: 'dialog',
        triggerRef,
        activateOn,
      })}
      <OverlayPortal container={container} scope={triggerRef.current}>
        <Presence>
          {open && (
            <SheetShell
              key="sheet"
              timings={timings}
              animate={{ [axis]: ['100%', 0], timing: { ...timings.open, release: true } }}
              exit={{ [axis]: ['100%'], scale: SHEET_REST_SCALE, timing: timings.close }}
              side={side}
              panelId={panelId}
              dismissible={dismissible}
              container={container}
              requestClose={close}
              htmlProps={htmlProps}
            >
              {children}
            </SheetShell>
          )}
        </Presence>
      </OverlayPortal>
    </Fragment>
  );
}
