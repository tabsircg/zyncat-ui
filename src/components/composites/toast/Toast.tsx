'use client';

import './toast.css';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import type { DataAttributes } from '../../../dom-props';
import { animate, startDrag, type Layer, type Playback } from '../../../engine';
import { Motion } from '../../../motion/element';
import { Presence } from '../../../motion/presence';
import { popOut } from '../../../motion/presets';
import { UIMotion } from '../../../tokens/motion-tokens';
import { fireGlint } from '../../internal/glass/glint';
import { hostRegistry, useElectedHost } from '../../internal/hooks/use-host-election';
import { Icon, type IconName } from '../../internal/icon/Icon';
import { cx } from '../../internal/utils/cx';
import { tokenPx } from '../../internal/utils/token-px';
import { Button } from '../../primitives/button/Button';
import { Spinner } from '../../primitives/spinner/Spinner';
import { DEFAULT_TOASTER_CONFIG, UIToast, type ToasterConfig, type ToastRecord, type ToastTone } from './toast-store';

const SM = UIMotion;
const store = UIToast;
const toasterReg = hostRegistry('toast.host@1');

const COLLAPSE_GRACE = 140;
const SWIPE_X = 64;
const SWIPE_V = 480;
const SWIPE_FLING_X = 420;

let GAP = 0;
function stackGap() {
  if (!GAP) GAP = tokenPx('--space-3') || 12;
  return GAP;
}

const TONE_ICON: Partial<Record<ToastTone, IconName>> = {
  success: 'check-circle',
  danger: 'warning-circle',
  warning: 'warning',
  info: 'info',
};

function useToneGesture(tone: ToastTone, ref: RefObject<HTMLElement>) {
  useEffect(() => {
    if (tone === 'success') return fireGlint(ref.current);
    if (tone === 'danger' && ref.current) {
      const fall = animate(ref.current, {
        x: [0, -7, 5, -2, 0],
        timing: { duration: SM.dur.slow, ease: SM.ease.standard, delay: SM.dur.base, fill: 'none' },
        composite: 'add',
      });
      return () => fall.stop();
    }
  }, [tone]);
}

const GLYPH_POP: Layer[] = [
  { scale: [0.5, 1], timing: SM.t.settle },
  { opacity: [0, 1], timing: SM.t.enter },
];
const TEXT_FADE: Layer[] = [{ opacity: [0, 1], timing: SM.t.enter }];
const COUNT_POP: Layer[] = [{ scale: [0.6, 1], timing: SM.t.settle }];

function ToastItem({
  t,
  depth,
  offset,
  hidden,
  behind,
  frameHeight,
  isTop,
  onHeight,
}: {
  t: ToastRecord;
  depth: number;
  offset: number;
  hidden: boolean;
  behind: boolean;
  frameHeight: number | null;
  isTop: boolean;
  onHeight: (id: string, h: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const settled = useRef(false);
  const swipeBack = useRef<Playback | null>(null);
  const swipeX = useRef(0);
  const restY = useRef(0);
  useToneGesture(t.tone, ref);

  useLayoutEffect(() => {
    if (ref.current && ref.current.firstElementChild)
      onHeight(t.id, (ref.current.firstElementChild as HTMLElement).offsetHeight);
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.pointerEvents = hidden ? 'none' : 'auto';
    const y = isTop ? offset : -offset;
    const scale = 1 - depth * 0.05;
    restY.current = y;
    if (settled.current) {
      animate(
        el,
        { x: [swipeX.current], y: [y], scale: [scale], height: [frameHeight ?? 'auto'], timing: SM.t.settle },
        { opacity: [hidden ? 0 : 1], timing: SM.t.enter },
      );
      return;
    }
    settled.current = true;
    animate(
      el,
      { y: [isTop ? -SM.dist.lg : SM.dist.lg, y], scale: [SM.scale.floating, scale], timing: SM.t.settle },
      { opacity: [0, hidden ? 0 : 1], timing: SM.t.enter },
    );
  }, [offset, depth, hidden, frameHeight, isTop]);

  const onPointerDown = (e: ReactPointerEvent) => {
    const el = ref.current;
    if (!t.dismissible || e.button !== 0 || !el) return;
    swipeBack.current?.stop();
    swipeBack.current = null;
    const place = (x: number) => {
      swipeX.current = x;
      animate(el, { x: [x], y: [restY.current], timing: { duration: 0 } });
    };
    place(swipeX.current);
    startDrag(e, {
      onMove: (info) => {
        const dx = info.offset.x;
        place(dx > 0 ? dx * 0.9 : dx * 0.04);
      },
      onEnd: (info) => {
        if (info.offset.x > SWIPE_X || info.velocity.x > SWIPE_V) {
          swipeX.current = SWIPE_FLING_X;
          animate(el, { x: [SWIPE_FLING_X], y: [restY.current], timing: SM.t.exit }).finished.then(() =>
            store.dismiss(t.id),
          );
          return;
        }
        swipeX.current = 0;
        swipeBack.current = animate(el, { x: [0], y: [restY.current], timing: SM.t.settle });
      },
    });
  };

  return (
    <Motion
      as="li"
      ref={ref}
      exit={popOut(SM.scale.floating, SM.t.exit)}
      className="zc-toast zc-glass"
      data-tone={t.tone}
      data-behind={behind ? '' : undefined}
      role={t.tone === 'danger' ? 'alert' : 'status'}
      aria-atomic="true"
      onPointerDown={onPointerDown}
      onKeyDown={(e: ReactKeyboardEvent) => {
        if (e.key === 'Escape' && t.dismissible) store.dismiss(t.id);
      }}
    >
      {t.node ? <div className="zc-toast__custom">{t.node as ReactNode}</div> : <ToastBody t={t} />}
    </Motion>
  );
}

function ToastBody({ t }: { t: ToastRecord }) {
  return (
    <div className="zc-toast__inner">
      {(t.tone !== 'default' || isFinite(t.duration)) && (
        <span className="zc-toast__icon">
          {t.tone !== 'default' && (
            <Motion as="span" className="zc-toast__icon-glyph" animate={GLYPH_POP} deps={[t.tone]}>
              {t.tone === 'loading' ? (
                <Spinner label={null} className="zc-toast__spinner" />
              ) : (
                <Icon name={TONE_ICON[t.tone] || 'info'} weight="fill" />
              )}
            </Motion>
          )}
          {isFinite(t.duration) && (
            <svg key={'ring-' + t.timerKey} className="zc-toast__ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle className="zc-toast__ring-track" cx="18" cy="18" r="16.5"></circle>
              <circle
                className="zc-toast__ring-arc"
                cx="18"
                cy="18"
                r="16.5"
                pathLength={1}
                style={{ animationDuration: t.duration + 'ms' }}
              ></circle>
            </svg>
          )}
        </span>
      )}
      <Motion className="zc-toast__text" animate={TEXT_FADE} deps={[String(t.message) + '-' + String(t.description)]}>
        <p className="zc-toast__message">{t.message}</p>
        {t.description != null && <p className="zc-toast__desc">{t.description}</p>}
      </Motion>
      {t.count > 1 && (
        <Motion as="span" className="zc-toast__count" animate={COUNT_POP} deps={[t.count]}>
          ×{t.count}
        </Motion>
      )}
      {t.action && (
        <Button
          variant="secondary"
          size="sm"
          className="zc-toast__action"
          onClick={() => {
            if (t.action.onClick) t.action.onClick();
            store.dismiss(t.id);
          }}
        >
          {t.action.label}
        </Button>
      )}
      {t.dismissible && (
        <button type="button" className="zc-toast__close" aria-label="Dismiss" onClick={() => store.dismiss(t.id)}>
          <Icon name="close" size="sm" />
        </button>
      )}
    </div>
  );
}

function ToastHost({ config, htmlProps }: { config: ToasterConfig; htmlProps?: HTMLAttributes<HTMLOListElement> }) {
  const { toasts, paused, expanded: hoverExpanded } = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | 0>(0);
  const hovering = useRef(false);

  useEffect(() => setReady(true), []);

  const onHeight = (id: string, h: number) => setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));

  const onHold = () => {
    hovering.current = true;
    clearTimeout(collapseTimer.current);
    store.setExpanded(true);
    store.pause();
  };
  const onRelease = (graced: boolean) => {
    hovering.current = false;
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(
      () => {
        store.setExpanded(false);
        store.resume();
      },
      graced ? COLLAPSE_GRACE : 0,
    );
  };

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) store.pause();
      else if (!hovering.current) store.resume();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      hovering.current = false;
      clearTimeout(collapseTimer.current);
      store.setExpanded(false);
      store.resume();
    }
  }, [toasts.length]);

  if (!ready) return null;

  const isTop = config.position.startsWith('top');
  const visible = config.visibleToasts;
  const rendered = visible * 2;
  const gap = config.gap || stackGap();
  const expanded = config.expand || hoverExpanded;

  const slice = toasts.slice(-rendered);
  const n = slice.length;
  const frontH = n ? heights[slice[n - 1].id] || 0 : 0;

  return createPortal(
    <ol
      {...htmlProps}
      className={cx('zc-toast-viewport', paused && 'zc-is-paused', htmlProps?.className)}
      data-position={config.position}
      style={
        config.offset
          ? ({ ...htmlProps?.style, '--toast-offset': `${config.offset}px` } as CSSProperties)
          : htmlProps?.style
      }
      aria-label="Notifications"
      onPointerOver={(e: ReactPointerEvent<HTMLOListElement>) => {
        if (e.pointerType !== 'touch') onHold();
      }}
      onPointerOut={(e: ReactPointerEvent<HTMLOListElement>) => {
        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) onRelease(true);
      }}
      onFocus={onHold}
      onBlur={(e: ReactFocusEvent<HTMLOListElement>) => {
        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) onRelease(false);
      }}
    >
      <Presence>
        {slice.map((t, i) => {
          const depth = n - 1 - i;
          let offset = depth * gap;
          if (expanded) {
            offset = 0;
            for (let j = i + 1; j < n; j++) offset += (heights[slice[j].id] || 0) + gap;
          }
          return (
            <ToastItem
              key={t.id}
              t={t}
              depth={expanded ? 0 : depth}
              offset={offset}
              hidden={!expanded && depth >= visible}
              behind={!expanded && depth > 0}
              frameHeight={!expanded && depth > 0 && frontH ? frontH : null}
              isTop={isTop}
              onHeight={onHeight}
            />
          );
        })}
      </Presence>
    </ol>,
    document.body,
  );
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(o) as (keyof T)[]).forEach((k) => {
    if (o[k] !== undefined) out[k] = o[k];
  });
  return out;
}

export interface ToasterProps extends Partial<ToasterConfig> {
  /** Standard <ol> attributes (className, style, data-*, ...) forwarded to the toast viewport. */
  htmlProps?: HTMLAttributes<HTMLOListElement> & DataAttributes;
}

export function Toaster({ htmlProps, ...props }: ToasterProps): ReactElement | null {
  const config: ToasterConfig = { ...DEFAULT_TOASTER_CONFIG, ...stripUndefined(props) };
  const isHost = useElectedHost(toasterReg, 'toaster');

  useEffect(() => {
    if (!isHost) return undefined;
    store.config = config;
    store.mounted = true;
    if (config.expand) store.setExpanded(true);
    return () => {
      store.mounted = false;
    };
  }, [isHost, config.position, config.duration, config.visibleToasts, config.gap, config.offset, config.expand]);

  if (!isHost) return null;
  return <ToastHost config={config} htmlProps={htmlProps} />;
}

export { toast } from './toast-store';
