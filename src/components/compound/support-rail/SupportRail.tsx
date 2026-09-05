'use client';

import './support-rail.css';

import {
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';

import type { DataAttributes } from '../../../dom-props';
import { animate, type Layer } from '../../../engine';
import { Motion } from '../../../motion/element';
import { resolveMotionTiming } from '../../../motion/motion-timing';
import { Presence } from '../../../motion/presence';
import { usePresence } from '../../../motion/presence-context';
import type { DisableableAnimation } from '../../../motion/timing';
import type { SupportRailStyle } from '../../../tokens/component-styles.generated';
import { UIMotion, type MotionTransition } from '../../../tokens/motion-tokens';
import { useControllable } from '../../internal/hooks/use-controllable';
import { Icon } from '../../internal/icon/Icon';
import { useReturnFocus } from '../../internal/overlay/focus';
import { useOutsidePress, useOverlayEntry } from '../../internal/overlay/layer';
import type { SupportAction } from '../../internal/support/types';
import { cx } from '../../internal/utils/cx';
import { Button } from '../../primitives/button/Button';

export type { SupportAction };

const RAIL_TIMING = {
  open: { duration: 'slower', ease: 'spring' },
  close: { duration: 'slow', ease: 'exit' },
} as const;

const CONTENT_FADE_IN_DELAY_RATIO = 0.55;
const STAGGER_STEPS_MAX = 8;

const INDEX_PROPERTY = '--_support-rail-index';
const MORPHING_ATTRIBUTE = 'data-morphing';

interface ShellBox {
  width: number;
  height: number;
  radius: string;
}

const contentFadeIn = (): Layer => ({
  opacity: [0, 1],
  timing: { duration: UIMotion.dur.slow, ease: 'linear', delay: UIMotion.dur.base * CONTENT_FADE_IN_DELAY_RATIO },
});
const contentFadeOut = (): Layer => ({ opacity: [0], timing: { duration: UIMotion.dur.fast, ease: 'linear' } });

function measureShell(shell: HTMLElement): ShellBox {
  return { width: shell.offsetWidth, height: shell.offsetHeight, radius: getComputedStyle(shell).borderRadius };
}

function morphShell(shell: HTMLElement, from: ShellBox, to: ShellBox, transition: MotionTransition) {
  return animate(shell, {
    width: [from.width, to.width],
    height: [from.height, to.height],
    radius: [from.radius, to.radius],
    timing: { ...transition, fill: 'none' },
  });
}

function fadeTab(tab: HTMLElement, open: boolean, transition: MotionTransition) {
  const timing = open
    ? { duration: UIMotion.dur.fast, ease: 'linear' as const }
    : {
        duration: UIMotion.dur.fast,
        ease: 'linear' as const,
        delay: Math.max(0, transition.duration - UIMotion.dur.fast),
      };
  animate(tab, { opacity: open ? [1, 0] : [0, 1], timing });
}

function indexStyle(index: number): CSSProperties {
  return { [INDEX_PROPERTY]: Math.min(index, STAGGER_STEPS_MAX) } as CSSProperties;
}

function SupportRailBody({
  actions,
  title,
  status,
  footer,
  children,
  panelId,
  titleId,
  shellRef,
  requestClose,
  onSelect,
}: {
  actions: SupportAction[];
  title: string;
  status?: string;
  footer?: ReactNode;
  children?: ReactNode;
  panelId: string;
  titleId: string;
  shellRef: RefObject<HTMLElement>;
  requestClose: () => void;
  onSelect?: (id: string, action: SupportAction) => void;
}) {
  const bodyRef = useRef<HTMLElement>(null);
  const { isPresent } = usePresence();
  const entry = useOverlayEntry({ nodeRef: shellRef, dismissible: isPresent, requestClose });

  useOutsidePress({ entry, refs: [shellRef], enabled: isPresent, onPress: requestClose });
  useReturnFocus(shellRef);

  useLayoutEffect(() => {
    bodyRef.current?.focus({ preventScroll: true });
  }, []);

  const commit = (action: SupportAction) => {
    action.onSelect?.();
    onSelect?.(action.id, action);
  };

  return (
    <Motion
      as="div"
      ref={bodyRef}
      animate={contentFadeIn()}
      exit={contentFadeOut()}
      className="zc-support-rail__body"
      id={panelId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="zc-support-rail__header">
        <div className="zc-support-rail__heading">
          <div className="zc-support-rail__title" id={titleId}>
            {title}
          </div>
          {status && <div className="zc-support-rail__status">{status}</div>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="zc-support-rail__close"
          aria-label="Close"
          onClick={requestClose}
        >
          <Icon name="x" size="sm" />
        </Button>
      </div>

      <div className="zc-support-rail__scroll">
        <ul className="zc-support-rail__list">
          {actions.map((action, index) => (
            <li key={action.id}>
              <button
                type="button"
                className="zc-support-rail__row"
                style={indexStyle(index)}
                onClick={() => commit(action)}
              >
                <span className="zc-support-rail__row-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="zc-support-rail__row-text">
                  <span className="zc-support-rail__row-label">{action.label}</span>
                  {action.description && <span className="zc-support-rail__row-note">{action.description}</span>}
                </span>
                {action.meta && <span className="zc-support-rail__row-meta">{action.meta}</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="zc-support-rail__extra" style={indexStyle(actions.length)}>
          {children}
        </div>
      </div>

      {footer && (
        <div className="zc-support-rail__footer" style={indexStyle(actions.length + 1)}>
          {footer}
        </div>
      )}
    </Motion>
  );
}

export interface SupportRailOwnProps {
  /** The rows, in order. Each renders a button carrying its label, optional description and optional meta. @default [] */
  actions: SupportAction[];
  /** Panel heading, and the panel's accessible name. @default 'Talk to us' */
  title?: string;
  /** Small mono line under the heading - opening hours, queue depth, a shift note. */
  status?: string;
  /** Container edge the rail pins to. Flips the tab, the morph origin and the panel's border. @default 'right' */
  side?: 'right' | 'left';
  /** Controlled open state. Omit to stay uncontrolled. */
  open?: boolean;
  /** Initial state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Fires whenever the open state changes. Pair with `open` for controlled use. */
  onOpenChange?: (open: boolean) => void;
  /** Fires when a row commits - gets its `id` and the full action. The rail stays open; render what happens next in `children`. */
  onSelect?: (id: string, action: SupportAction) => void;
  /** Retune the morph, per direction. `null` turns it off and the rail snaps. */
  animation?: DisableableAnimation;
  /** What sits inside the edge tab - an icon, a word, an avatar. The rail owns the tab itself: its
   *  edge, its ARIA and its morph. Defaults to a chat glyph; `title` names it either way. */
  trigger?: ReactNode;
  /** Arbitrary content under the rows, inside the same scroll region. */
  children?: ReactNode;
  /** Pinned bottom strip - on-shift avatars, an SLA line, a link out. */
  footer?: ReactNode;
  /** Extra class(es) merged onto the rail root. */
  className?: string;
  /** Inline styles merged onto the rail root - the place to retune the `--support-rail-*` properties. */
  style?: SupportRailStyle;
}

export interface SupportRailProps extends SupportRailOwnProps {
  /** Standard <div> attributes (aria-*, data-*, id, ...) forwarded to the rail root. */
  htmlProps?: Omit<HTMLAttributes<HTMLDivElement>, keyof SupportRailOwnProps> & DataAttributes;
}

export function SupportRail({
  actions = [],
  title = 'Talk to us',
  status,
  side = 'right',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  animation,
  trigger,
  children,
  footer,
  className = '',
  style,
  htmlProps,
}: SupportRailProps) {
  const [open, setOpen] = useControllable(controlledOpen, defaultOpen, onOpenChange);
  const rootRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const fromBox = useRef<ShellBox | null>(null);
  const autoId = useId();
  const panelId = 'support-rail-' + autoId;
  const titleId = panelId + '-title';
  const timings = resolveMotionTiming(animation, RAIL_TIMING);

  const toggle = (next: boolean) => {
    const shell = shellRef.current;
    if (shell) fromBox.current = measureShell(shell);
    setOpen(next);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    const shell = shellRef.current;
    const tab = tabRef.current;
    const from = fromBox.current;
    fromBox.current = null;
    if (!root || !shell || !tab || !from) return undefined;

    const transition = open ? timings.open : timings.close;
    const morph = morphShell(shell, from, measureShell(shell), transition);
    fadeTab(tab, open, transition);
    if (!morph) return undefined;

    root.setAttribute(MORPHING_ATTRIBUTE, '');
    let live = true;
    morph.finished.then(() => {
      if (live) root.removeAttribute(MORPHING_ATTRIBUTE);
    });
    return () => {
      live = false;
      root.removeAttribute(MORPHING_ATTRIBUTE);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cx('zc-support-rail', className)}
      style={style}
      data-side={side}
      data-open={open}
      {...htmlProps}
    >
      <div ref={shellRef as RefObject<HTMLDivElement>} className="zc-support-rail__shell">
        <Button
          variant="unstyled"
          ref={tabRef}
          className="zc-support-rail__tab"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          aria-label={title}
          onClick={() => toggle(true)}
        >
          {trigger ?? <Icon name="chat" />}
        </Button>

        <Presence>
          {open && (
            <SupportRailBody
              key="body"
              actions={actions}
              title={title}
              status={status}
              footer={footer}
              panelId={panelId}
              titleId={titleId}
              shellRef={shellRef}
              requestClose={() => toggle(false)}
              onSelect={onSelect}
            >
              {children}
            </SupportRailBody>
          )}
        </Presence>
      </div>
    </div>
  );
}
