'use client';

import { Fragment, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { Motion } from '../../../motion/element';
import { Presence } from '../../../motion/presence';
import { popIn, popOut } from '../../../motion/presets';
import { motionFor } from '../../../tokens/motion-tokens';
import { inheritedThemeAttrs } from '../../internal/overlay/layer';
import { tokenPx } from '../../internal/utils/token-px';
import { store, TOOLTIP_DOM_ID, type ActivePayload, type Placement } from './tooltip-store';

const tipLayout = (scope?: Element | null) => ({ size: 'morph' as const, timing: motionFor(scope).t.layout });

interface Size {
  w: number;
  h: number;
}
interface TargetBox extends Size {
  x: number;
  y: number;
  placement: Placement;
}
interface RenderedBox extends TargetBox {
  bodyW: number;
}

function targetBox(size: Size, t: DOMRect, want: Placement, scope?: Element | null): TargetBox {
  const vw = window.innerWidth,
    vh = window.innerHeight,
    TIP_GAP = tokenPx('--space-2', 8, scope) || 8,
    M = TIP_GAP;
  let p = want;
  if (p === 'top' && t.top - size.h - TIP_GAP < M) p = 'bottom';
  else if (p === 'bottom' && t.bottom + size.h + TIP_GAP > vh - M) p = 'top';
  else if (p === 'left' && t.left - size.w - TIP_GAP < M) p = 'right';
  else if (p === 'right' && t.right + size.w + TIP_GAP > vw - M) p = 'left';
  let x, y;
  if (p === 'top') {
    x = t.left + t.width / 2 - size.w / 2;
    y = t.top - size.h - TIP_GAP;
  } else if (p === 'bottom') {
    x = t.left + t.width / 2 - size.w / 2;
    y = t.bottom + TIP_GAP;
  } else if (p === 'left') {
    x = t.left - size.w - TIP_GAP;
    y = t.top + t.height / 2 - size.h / 2;
  } else {
    x = t.right + TIP_GAP;
    y = t.top + t.height / 2 - size.h / 2;
  }
  return {
    x: Math.round(Math.min(Math.max(x, M), vw - size.w - M)),
    y: Math.round(Math.min(Math.max(y, M), vh - size.h - M)),
    w: size.w,
    h: size.h,
    placement: p,
  };
}

const surface = () => document.getElementById(TOOLTIP_DOM_ID);

const fromEdge = (p: Placement, scope?: Element | null) => {
  const { sm } = motionFor(scope).dist;
  return { x: p === 'left' ? sm : p === 'right' ? -sm : 0, y: p === 'top' ? sm : p === 'bottom' ? -sm : 0 };
};

function Body({ a, width }: { a: ActivePayload; width?: number }) {
  return (
    <span className="zc-tooltip__body" style={width ? { width } : undefined}>
      {a.shortcut ? (
        <span className="zc-tooltip__row">
          <span>{a.content}</span>
          <kbd className="zc-tooltip__shortcut">{a.shortcut}</kbd>
        </span>
      ) : (
        a.content
      )}
    </span>
  );
}

function TipSurface({ a, box }: { a: ActivePayload; box: RenderedBox }) {
  const motion = motionFor(a.anchor());
  const edge = fromEdge(box.placement, a.anchor());
  return (
    <Motion
      layout
      layoutTransition={tipLayout(a.anchor())}
      className="zc-tooltip"
      {...inheritedThemeAttrs(a.anchor())}
      id={TOOLTIP_DOM_ID}
      role="tooltip"
      data-placement={box.placement}
      style={{ translate: `${box.x}px ${box.y}px`, width: box.w, height: box.h }}
      animate={[
        { x: [edge.x, 0], y: [edge.y, 0], timing: { ...motion.t.layout, fill: 'none' }, composite: 'add' },
        popIn(motion.scale.floating, motion.t.enter),
      ]}
      exit={[
        { x: [0, edge.x], y: [0, edge.y], timing: motion.t.exit, composite: 'add' },
        popOut(motion.scale.floating, motion.t.exit),
      ]}
    >
      <Motion as="span" key={a.id} animate={{ opacity: [0, 1], timing: motion.t.enter }}>
        <Body a={a} width={box.bodyW} />
      </Motion>
    </Motion>
  );
}

export function TooltipHost() {
  const active = useSyncExternalStore(store.subscribe, store.get);
  const measureRef = useRef<HTMLDivElement>(null);
  const drift = useRef({ x: 0, y: 0 });
  const anchored = useRef({ x: 0, y: 0 });
  const [shown, setShown] = useState<{ a: ActivePayload; box: RenderedBox } | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setShown(null);
      return undefined;
    }

    const place = () => {
      const anchor = active.anchor();
      const measure = measureRef.current;
      if (!anchor || !measure) return;
      const bubble = measure.getBoundingClientRect();
      const body = (measure.firstChild as HTMLElement).getBoundingClientRect();
      const from = anchor.getBoundingClientRect();
      if (!from.width && !from.height) return;
      if (!surface()) drift.current = { x: 0, y: 0 };
      anchored.current = { x: from.left, y: from.top };
      const to = targetBox({ w: Math.ceil(bubble.width), h: Math.ceil(bubble.height) }, from, active.placement, anchor);
      setShown({
        a: active,
        box: { ...to, x: to.x - drift.current.x, y: to.y - drift.current.y, bodyW: Math.ceil(body.width) },
      });
    };

    const track = () => {
      const el = surface();
      const anchor = active.anchor();
      if (!el || !anchor) return;
      const now = anchor.getBoundingClientRect();
      if (!now.width && !now.height) return;
      const at = {
        x: drift.current.x + now.left - anchored.current.x,
        y: drift.current.y + now.top - anchored.current.y,
      };
      drift.current = at;
      anchored.current = { x: now.left, y: now.top };
      el.style.transform = at.x || at.y ? `translate(${at.x}px, ${at.y}px)` : '';
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.dismiss();
    };

    place();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', track, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', track, true);
      window.removeEventListener('resize', place);
    };
  }, [active]);

  const orphaned = !!shown && !shown.a.anchor();

  return createPortal(
    <Fragment>
      {active && (
        <div className="zc-tooltip zc-tooltip--measure" ref={measureRef} aria-hidden="true">
          <Body a={active} />
        </div>
      )}
      <Presence>{active && shown && !orphaned && <TipSurface key="tip" a={shown.a} box={shown.box} />}</Presence>
    </Fragment>,
    document.body,
  );
}
