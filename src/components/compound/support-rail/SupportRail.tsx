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
import type { Layer } from '../../../engine';
import { Motion } from '../../../motion/element';
import { Presence } from '../../../motion/presence';
import { usePresence } from '../../../motion/presence-context';
import type { SupportRailStyle } from '../../../tokens/component-styles.generated';
import { UIMotion } from '../../../tokens/motion-tokens';
import { useControllable } from '../../internal/hooks/use-controllable';
import { Icon } from '../../internal/icon/Icon';
import { useReturnFocus } from '../../internal/overlay/focus';
import { useOutsidePress, useOverlayEntry } from '../../internal/overlay/layer';
import type { SupportAction } from '../../internal/support/types';
import { cx } from '../../internal/utils/cx';
import { Button } from '../../primitives/button/Button';

export type { SupportAction };

const CONTENT_FADE_IN_DELAY_RATIO = 0.55;
const NEUTRAL_RATIO = 1;
const STAGGER_STEPS_MAX = 8;

const COLLAPSE_X_PROPERTY = '--_support-rail-collapse-x';
const COLLAPSE_Y_PROPERTY = '--_support-rail-collapse-y';
const INDEX_PROPERTY = '--_support-rail-index';

const contentFadeIn = (): Layer => ({
  opacity: [0, 1],
  timing: { duration: UIMotion.dur.slow, ease: 'linear', delay: UIMotion.dur.base * CONTENT_FADE_IN_DELAY_RATIO },
});
const contentFadeOut = (): Layer => ({ opacity: [0], timing: { duration: UIMotion.dur.fast, ease: 'linear' } });

function collapseRatio(needleSpan: number, panelSpan: number): number {
  return panelSpan > 0 ? needleSpan / panelSpan : NEUTRAL_RATIO;
}

function holdFoldingBox(panel: HTMLElement, open: boolean): void {
  if (open) panel.style.height = '';
  else if (panel.offsetHeight) panel.style.height = panel.offsetHeight + 'px';
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
  panelRef,
  needleRef,
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
  panelRef: RefObject<HTMLElement>;
  needleRef: RefObject<HTMLElement>;
  requestClose: () => void;
  onSelect?: (id: string, action: SupportAction) => void;
}) {
  const bodyRef = useRef<HTMLElement>(null);
  const { isPresent } = usePresence();
  const entry = useOverlayEntry({ nodeRef: panelRef, dismissible: isPresent, requestClose });

  useOutsidePress({ entry, refs: [panelRef, needleRef], enabled: isPresent, onPress: requestClose });
  useReturnFocus(panelRef);

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
  /** Container edge the rail pins to. Flips the tab, the collapse origin and the panel's border. @default 'right' */
  side?: 'right' | 'left';
  /** Controlled open state. Omit to stay uncontrolled. */
  open?: boolean;
  /** Initial state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Fires whenever the open state changes. Pair with `open` for controlled use. */
  onOpenChange?: (open: boolean) => void;
  /** Fires when a row commits - gets its `id` and the full action. The rail stays open; render what happens next in `children`. */
  onSelect?: (id: string, action: SupportAction) => void;
  /** What sits inside the edge tab - an icon, a word, an avatar. The rail owns the tab itself: its
   *  edge, its ARIA and its fold. Defaults to a chat glyph; `title` names it either way. */
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
  trigger,
  children,
  footer,
  className = '',
  style,
  htmlProps,
}: SupportRailProps) {
  const [open, setOpen] = useControllable(controlledOpen, defaultOpen, onOpenChange);
  const rootRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const autoId = useId();
  const panelId = 'support-rail-' + autoId;
  const titleId = panelId + '-title';
  const requestClose = () => setOpen(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const needle = needleRef.current;
    const panel = panelRef.current;
    if (!root || !needle || !panel) return undefined;
    const remeasure = () => {
      root.style.setProperty(COLLAPSE_X_PROPERTY, String(collapseRatio(needle.offsetWidth, panel.offsetWidth)));
      const panelHeight = panel.offsetHeight || root.offsetHeight;
      root.style.setProperty(COLLAPSE_Y_PROPERTY, String(collapseRatio(needle.offsetHeight, panelHeight)));
    };
    remeasure();
    const sizes = new ResizeObserver(remeasure);
    sizes.observe(panel);
    sizes.observe(needle);
    return () => sizes.disconnect();
  }, [side]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel) holdFoldingBox(panel, open);
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
      <button
        type="button"
        ref={needleRef as RefObject<HTMLButtonElement>}
        className="zc-support-rail__needle"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label={title}
        onClick={() => setOpen(!open)}
      >
        {trigger ?? <Icon name="chat" />}
      </button>

      <div ref={panelRef as RefObject<HTMLDivElement>} className="zc-support-rail__panel">
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
              panelRef={panelRef}
              needleRef={needleRef}
              requestClose={requestClose}
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
