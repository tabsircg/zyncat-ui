'use client';

import './date-picker.css';

import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { Motion } from '../../../motion/element';
import { GlidePill, useGlide } from '../../../motion/glide';
import { UIMotion } from '../../../tokens/motion-tokens';
import { Icon } from '../../internal/icon/Icon';
import { activationProps, type ActivateOn } from '../../internal/utils/activation';
import { Button } from '../../primitives/button/Button';
import { add, col, DOW, grid, MONTHS, pad, parse, today, toKey, tzLabel, within } from './date-utils';
import { MonthJump } from './month-jump';
import { useDayFocus } from './use-day-focus';

const CAP_FLIP = { timing: UIMotion.t.settle };

/** A date range as wall-clock 'YYYY-MM-DD' endpoints, inclusive. */
export interface DateRange {
  /** Range start, inclusive - `'YYYY-MM-DD'`. */
  start: string;
  /** Range end, inclusive - `'YYYY-MM-DD'`. Never before `start`. */
  end: string;
}

interface DrpPreset {
  id: string;
  label: string;
  start: string;
  end: string;
}

function drpDisplay(key: string, withYear: boolean): string {
  const d = parse(key);
  const mon = MONTHS[d.getMonth()].slice(0, 3);
  return mon + ' ' + pad(d.getDate()) + (withYear ? ', ' + d.getFullYear() : '');
}
export function drpRangeText(start: string, end: string): string {
  const sameYear = parse(start).getFullYear() === parse(end).getFullYear();
  const curYear = new Date().getFullYear();
  const startYr = !sameYear || parse(start).getFullYear() !== curYear;
  const endYr = parse(end).getFullYear() !== curYear;
  return drpDisplay(start, startYr) + ' - ' + drpDisplay(end, endYr);
}
const drpDays = (start: string, end: string): number => Math.round((+parse(end) - +parse(start)) / 86400000) + 1;

function drpPresets(): DrpPreset[] {
  const t = today();
  const now = new Date();
  const firstThis = toKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const firstPrev = toKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastPrev = toKey(new Date(now.getFullYear(), now.getMonth(), 0));
  const jan1 = toKey(new Date(now.getFullYear(), 0, 1));
  return [
    { id: 'today', label: 'Today', start: t, end: t },
    { id: 'yest', label: 'Yesterday', start: add(t, -1), end: add(t, -1) },
    { id: '7d', label: 'Last 7 days', start: add(t, -6), end: t },
    { id: '30d', label: 'Last 30 days', start: add(t, -29), end: t },
    { id: 'mtd', label: 'This month', start: firstThis, end: t },
    { id: 'lastm', label: 'Last month', start: firstPrev, end: lastPrev },
    { id: '90d', label: 'Last 90 days', start: add(t, -89), end: t },
    { id: 'ytd', label: 'Year to date', start: jan1, end: t },
  ];
}

interface DrpPanelProps {
  value: DateRange | null;
  commit: (value: DateRange) => void;
  close: () => void;
  min?: string;
  max?: string;
  timezone?: string;
  label?: string;
  months: number;
  layout: 'popover' | 'sheet';
  activateOn?: ActivateOn;
}

export function DrpPanel({
  value,
  commit,
  close,
  min,
  max,
  timezone,
  label,
  months,
  layout,
  activateOn,
}: DrpPanelProps) {
  const seedKey = (value && value.start) || today();
  const seed = parse(seedKey);
  const [view, setView] = useState<{ y: number; m: number }>({ y: seed.getFullYear(), m: seed.getMonth() });

  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string>(seedKey);

  const daysRef = useRef<HTMLDivElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);
  const viewIdx = view.y * 12 + view.m;
  const armFocus = useDayFocus(daysRef, focusKey, viewIdx);

  const uid = useId();
  const gridGlide = useGlide(daysRef);
  const presetGlide = useGlide(presetsRef);
  const capLoId = 'drp-cap-lo-' + uid;
  const capHiId = 'drp-cap-hi-' + uid;

  const inBounds = (key: string): boolean => within(key, min, max);

  let lo: string | null = null,
    hi: string | null = null,
    provisional = false;
  if (anchor) {
    const other = hoverKey || anchor;
    lo = anchor < other ? anchor : other;
    hi = anchor < other ? other : anchor;
    provisional = true;
  } else if (value && value.start && value.end) {
    lo = value.start;
    hi = value.end;
  }

  function pickDay(key: string) {
    if (!inBounds(key)) return;
    if (!anchor) {
      setAnchor(key);
      setHoverKey(key);
    } else {
      const start = anchor < key ? anchor : key;
      const end = anchor < key ? key : anchor;
      setAnchor(null);
      setHoverKey(null);
      commit({ start: start, end: end });
    }
  }

  function applyPreset(p: DrpPreset) {
    setAnchor(null);
    setHoverKey(null);
    const d = parse(p.start);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setFocusKey(p.start);
    commit({ start: p.start, end: p.end });
  }

  function nav(dir: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const prevViewIdxRef = useRef(viewIdx);
  const jumpedRef = useRef(false);
  const navDir =
    prevViewIdxRef.current === viewIdx || jumpedRef.current ? 0 : viewIdx > prevViewIdxRef.current ? 1 : -1;
  useEffect(() => {
    prevViewIdxRef.current = viewIdx;
    jumpedRef.current = false;
  }, [viewIdx]);

  function jumpToMonth(y: number, m: number, offset: number) {
    jumpedRef.current = true;
    const base = new Date(y, m - offset, 1);
    setView({ y: base.getFullYear(), m: base.getMonth() });
  }

  function moveFocus(deltaDays: number, deltaMonths = 0) {
    const d = parse(focusKey);
    if (deltaMonths) d.setMonth(d.getMonth() + deltaMonths);
    if (deltaDays) d.setDate(d.getDate() + deltaDays);
    const key = toKey(d);
    armFocus();
    setFocusKey(key);
    if (anchor) setHoverKey(key);
    const idx = d.getFullYear() * 12 + d.getMonth();
    const last = viewIdx + (months - 1);
    if (idx < viewIdx) setView({ y: d.getFullYear(), m: d.getMonth() });
    else if (idx > last) {
      const back = new Date(d.getFullYear(), d.getMonth() - (months - 1), 1);
      setView({ y: back.getFullYear(), m: back.getMonth() });
    }
  }
  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const k = e.key;
    if (k === 'ArrowLeft') moveFocus(-1);
    else if (k === 'ArrowRight') moveFocus(1);
    else if (k === 'ArrowUp') moveFocus(-7);
    else if (k === 'ArrowDown') moveFocus(7);
    else if (k === 'PageUp') moveFocus(0, -1);
    else if (k === 'PageDown') moveFocus(0, 1);
    else if (k === 'Enter' || k === ' ') pickDay(focusKey);
    else if (k === 'Escape' && anchor) {
      setAnchor(null);
      setHoverKey(null);
    } else return;
    e.preventDefault();
  }

  const todayKey = today();
  function renderDay(d: Date, viewMonth: number) {
    const key = toKey(d);
    const out = d.getMonth() !== viewMonth;
    const disabled = !inBounds(key);
    const dayCol = col(d);

    const isLo = lo && key === lo;
    const isHi = hi && key === hi;
    const single = lo && hi && lo === hi;
    const inRange = lo && hi && key >= lo && key <= hi;
    const loGhost = provisional && isLo && lo !== anchor;
    const hiGhost = provisional && isHi && !single && hi !== anchor;

    const band = inRange && !single;
    const extL = band && !isLo && dayCol !== 0;
    const extR = band && !isHi && dayCol !== 6;

    const capHere = months === 1 || !out;
    const loCap = isLo && capHere;
    const hiCap = isHi && !single && capHere;

    const cls = ['zc-dtp__day'];
    if (out) cls.push('zc-is-out');
    if (inRange) cls.push('zc-is-in-range');
    if ((loGhost || hiGhost) && capHere) cls.push('zc-is-cap-ghost');
    else if (loCap || hiCap) cls.push('zc-is-cap');

    const bandCls = ['zc-drp__band'];
    if (extL) bandCls.push('zc-drp__band--extL');
    if (extR) bandCls.push('zc-drp__band--extR');
    if (!extL) bandCls.push('zc-drp__band--roundL');
    if (!extR) bandCls.push('zc-drp__band--roundR');

    return (
      <button
        key={key}
        type="button"
        role="gridcell"
        data-key={key}
        className={cls.join(' ')}
        disabled={disabled}
        tabIndex={key === focusKey ? 0 : -1}
        aria-label={MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()}
        aria-selected={isLo || isHi || undefined}
        {...activationProps<HTMLButtonElement>(() => pickDay(key), { on: activateOn })}
        onPointerEnter={(e) => {
          setHoverKey(key);
          if (!anchor && !disabled) gridGlide.enter(e.currentTarget);
          else gridGlide.leave();
        }}
      >
        {band ? <span className={bandCls.join(' ')} aria-hidden="true"></span> : null}
        {loCap ? (
          <Motion
            as="span"
            layoutId={capLoId}
            layoutTransition={CAP_FLIP}
            className={'zc-drp__cap' + (loGhost ? ' zc-drp__cap--ghost' : '')}
            aria-hidden="true"
          />
        ) : null}
        {hiCap ? (
          <Motion
            as="span"
            layoutId={capHiId}
            layoutTransition={CAP_FLIP}
            className={'zc-drp__cap' + (hiGhost ? ' zc-drp__cap--ghost' : '')}
            aria-hidden="true"
          />
        ) : null}
        <span className="zc-dtp__num">{d.getDate()}</span>
        {key === todayKey ? <span className="zc-dtp__dot" aria-hidden="true"></span> : null}
      </button>
    );
  }

  function renderMonth(offset: number, withPrev: boolean, withNext: boolean) {
    const base = new Date(view.y, view.m + offset, 1);
    const y = base.getFullYear(),
      m = base.getMonth();
    const cells = grid(y, m);
    const prevEnd = toKey(new Date(y, m, 0));
    const nextStart = toKey(new Date(y, m + 1, 1));
    return (
      <div className="zc-dtp__cal" key={offset}>
        <div className="zc-drp__mhead">
          {withPrev ? (
            <button
              type="button"
              className="zc-dtp__nav"
              aria-label="Previous month"
              disabled={min && prevEnd < min}
              {...activationProps<HTMLButtonElement>(() => nav(-1), { on: activateOn })}
            >
              <Icon name="caret-left" size="sm" />
            </button>
          ) : null}
          <MonthJump
            y={y}
            m={m}
            min={min}
            max={max}
            activateOn={activateOn}
            onPick={(py, pm) => jumpToMonth(py, pm, offset)}
          />
          {withNext ? (
            <button
              type="button"
              className="zc-dtp__nav"
              aria-label="Next month"
              disabled={max && nextStart > max}
              {...activationProps<HTMLButtonElement>(() => nav(1), { on: activateOn })}
            >
              <Icon name="caret-right" size="sm" />
            </button>
          ) : null}
        </div>
        <div className="zc-dtp__dow" aria-hidden="true">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          className="zc-dtp__days"
          role="grid"
          aria-label={MONTHS[m] + ' ' + y}
          key={'days-' + viewIdx + '-' + offset}
          data-enter={navDir || undefined}
        >
          {cells.map((d) => renderDay(d, m))}
        </div>
      </div>
    );
  }

  const presets = drpPresets();
  function presetActive(p: DrpPreset): boolean {
    return value && value.start === p.start && value.end === p.end;
  }

  return (
    <div
      className={'zc-drp' + (layout === 'sheet' ? ' zc-drp--sheet' : '')}
      role="dialog"
      aria-label={label || 'Pick a date range'}
    >
      <div className="zc-drp__body">
        <div
          className="zc-drp__presets"
          role="group"
          aria-label="Quick ranges"
          ref={presetsRef}
          onPointerLeave={presetGlide.leave}
        >
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={'zc-drp__preset' + (presetActive(p) ? ' zc-is-active' : '')}
              onPointerEnter={(e) => presetGlide.enter(e.currentTarget)}
              {...activationProps<HTMLButtonElement>(() => applyPreset(p), { on: activateOn })}
            >
              {p.label}
            </button>
          ))}
          <GlidePill className="zc-drp__presetGlide" glide={presetGlide} />
        </div>
        <div
          className="zc-drp__months"
          ref={daysRef}
          onKeyDown={onGridKeyDown}
          onPointerLeave={() => {
            if (anchor) setHoverKey(anchor);
            gridGlide.leave();
          }}
        >
          {months === 2 ? [renderMonth(0, true, false), renderMonth(1, false, true)] : renderMonth(0, true, true)}
          <GlidePill className="zc-dtp__hover" glide={gridGlide} />
        </div>
      </div>
      <div className="zc-drp__foot">
        <span className={'zc-drp__readout' + (lo && hi ? '' : ' zc-is-empty')}>
          {lo && hi ? (
            <Fragment>
              {drpRangeText(lo, hi)}{' '}
              <span className="zc-drp__count">
                - {drpDays(lo, hi)} {drpDays(lo, hi) === 1 ? 'day' : 'days'}
              </span>
            </Fragment>
          ) : anchor ? (
            'Pick the end date'
          ) : (
            'Pick a start date'
          )}
        </span>
        {timezone ? <span className="zc-drp__tz">{tzLabel(timezone)}</span> : null}
        <span className="zc-drp__footSpacer"></span>
        <Button variant="primary" size="sm" onClick={close}>
          Done
        </Button>
      </div>
    </div>
  );
}
