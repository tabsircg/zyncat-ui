'use client';

import './modal.css';

import { Fragment, useId, useRef, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { resolveMotionTiming } from '../../../motion/motion-timing';
import { Presence } from '../../../motion/presence';
import { popIn, popOut } from '../../../motion/presets';
import type { DisableableAnimation } from '../../../motion/timing';
import { UIMotion } from '../../../tokens/motion-tokens';
import { useControllable } from '../../internal/hooks/use-controllable';
import { ovCloneTrigger, OverlayPortal } from '../../internal/overlay/layer';
import { ModalShell, OV_TAKEOVER_TIMING } from '../../internal/overlay/modal';
import type { ActivateOn } from '../../internal/utils/activation';

export interface ModalProps {
  /** Controlled open state. Omit to stay uncontrolled. */
  open?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  /** Fires whenever the open state changes. Pair with `open` for controlled use. */
  onOpenChange?: (open: boolean) => void;

  /** Cloned to open the modal. */
  trigger?: ReactElement | null;
  /** Whether the trigger fires on `pointerdown` (snappier) or waits for `click`. @default 'click' */
  activateOn?: ActivateOn;

  /** Scrim/Esc dismissal. Default true. */
  dismissible?: boolean;

  /** Mount inside this element instead of the viewport - it must be positioned (`position: relative` or similar).
   *  Scrim, scroll lock and inert scope to it; the rest of the page stays interactive. */
  container?: HTMLElement | null;

  /** Base id for the panel; drives the trigger's `aria-controls`. Auto-generated when omitted. */
  id?: string;
  /** Standard attributes (className, style, data-*, ...) forwarded to the panel - this is where your paint goes.
   *  Centered by default; `width: 100%; height: 100%` makes it full-bleed. */
  htmlProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  /** Standard attributes forwarded to the layer behind the panel - set `--bg-overlay` here to retint the scrim. */
  layerProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  /** Open/close timing - motion tokens only, or `null` to disable. @default open 'slow'/'entrance', close 'base'/'standard' */
  animation?: DisableableAnimation;
  /** The ENTIRE surface - paint AND semantics (`role="dialog"`, a label). Nothing is painted for you. */
  children: ReactNode;
}

export function Modal({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  trigger = null,
  activateOn,
  dismissible = true,
  container = null,
  id,
  htmlProps,
  layerProps,
  animation,
  children,
}: ModalProps) {
  const [open, setOpen] = useControllable(controlledOpen, defaultOpen, onOpenChange);
  const triggerRef = useRef<HTMLElement>(null);
  const autoId = useId();
  const panelId = id || 'modal-' + autoId;
  const close = () => setOpen(false);
  const timings = resolveMotionTiming(animation, OV_TAKEOVER_TIMING, container ?? triggerRef.current);

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
            <ModalShell
              key="modal"
              timings={timings}
              animate={popIn(UIMotion.scale.panel, timings.open)}
              exit={popOut(UIMotion.scale.panel, timings.close)}
              layerClass="zc-overlay-layer--modal"
              panelClass="zc-overlay-panel--modal"
              panelId={panelId}
              dismissible={dismissible}
              container={container}
              requestClose={close}
              panelProps={htmlProps}
              layerProps={layerProps}
            >
              {children}
            </ModalShell>
          )}
        </Presence>
      </OverlayPortal>
    </Fragment>
  );
}
