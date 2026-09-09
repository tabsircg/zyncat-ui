'use client';

import './date-picker.css';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { animate } from '../../../engine';
import { Motion } from '../../../motion/element';
import { GlidePill, useGlide } from '../../../motion/glide';
import { slideIn } from '../../../motion/presets';
import { UIMotion } from '../../../tokens/motion-tokens';
import { Icon } from '../../internal/icon/Icon';
import { activationProps, type ActivateOn } from '../../internal/utils/activation';
import { cx } from '../../internal/utils/cx';
import { Button } from '../../primitives/button/Button';
import { col, DOW, grid, MONTHS, parse, today, toKey, tzLabel, within } from './date-utils';
import { MonthJump } from './month-jump';
import { useDayFocus } from './use-day-focus';

const PILL_FLIP = { timing: UIMotion.t.settle };

interface DtpPanelProps {
  val: string | null;
  commit: (key: string) => void;
  close: () => void;
  min?: string;
  max?: string;
  timezone?: string;
  label?: string;
  slot?: ReactNode;
  activateOn?: ActivateOn;
}

export function DtpPanel({ val, commit, min, max, timezone, label, close, slot, activateOn }: DtpPanelProps) {
  const seed = val ? parse(val) : new Date();
  const [view, setView] = useState<{ y: number; m: number }>({ y: seed.getFullYear(), m: seed.getMonth() });
  const [focusKey, setFocusKey] = useState<string>(val || today());

  const daysRef = useRef<HTMLDivElement>(null);
  const prevViewRef = useRef<number | null>(null);
  const uid = useId();
  const pillId = 'dtp-pill-' + uid;

  const glide = useGlide(daysRef);

  const inRange = (key: string): boolean => within(key, min, max);

  function pickDay(key: string) {
    if (!inRange(key)) return;
    armFocus();
    setFocusKey(key);
    const d = parse(key);
    goToMonth(d.getFullYear(), d.getMonth());
    commit(key);
  }

  function goToMonth(y: number, m: number) {
    setView((v) => (v.y === y && v.m === m ? v : { y: y, m: m }));
  }
  const jumpedRef = useRef(false);
  function jumpToMonth(y: number, m: number) {
    jumpedRef.current = true;
    goToMonth(y, m);
  }
  function nav(dir: number) {
    const d = new Date(view.y, view.m + dir, 1);
    goToMonth(d.getFullYear(), d.getMonth());
  }
  const now = new Date();
  const viewIsCurrent = view.y === now.getFullYear() && view.m === now.getMonth();
  function goToToday() {
    const key = today();
    const d = parse(key);
    armFocus();
    setFocusKey(key);
    goToMonth(d.getFullYear(), d.getMonth());
  }
  const viewIdx = view.y * 12 + view.m;
  const armFocus = useDayFocus(daysRef, focusKey, viewIdx, '[tabindex="0"]:not(:disabled)');
  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = viewIdx;
    const el = daysRef.current;
    const jumped = jumpedRef.current;
    jumpedRef.current = false;
    if (prev == null || prev === viewIdx || !el || jumped) return;
    const dir = viewIdx > prev ? 1 : -1;
    animate(el, slideIn(dir * UIMotion.dist.md, UIMotion.t.enter));
  }, [viewIdx]);

  function moveFocus(deltaDays: number, deltaMonths: number) {
    const d = parse(focusKey);
    if (deltaMonths) d.setMonth(d.getMonth() + deltaMonths);
    if (deltaDays) d.setDate(d.getDate() + deltaDays);
    const key = toKey(d);
    armFocus();
    setFocusKey(key);
    goToMonth(d.getFullYear(), d.getMonth());
  }
  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const k = e.key;
    if (k === 'ArrowLeft') moveFocus(-1, 0);
    else if (k === 'ArrowRight') moveFocus(1, 0);
    else if (k === 'ArrowUp') moveFocus(-7, 0);
    else if (k === 'ArrowDown') moveFocus(7, 0);
    else if (k === 'PageUp') moveFocus(0, -1);
    else if (k === 'PageDown') moveFocus(0, 1);
    else if (k === 'Home') moveFocus(-col(parse(focusKey)), 0);
    else if (k === 'End') moveFocus(6 - col(parse(focusKey)), 0);
    else if (k === 'Enter' || k === ' ') pickDay(focusKey);
    else return;
    e.preventDefault();
  }

  const days = grid(view.y, view.m);
  const todayKey = today();
  const selKey = val || null;
  const gridKeys = days.map(toKey);
  const tabKey =
    gridKeys.indexOf(focusKey) >= 0
      ? focusKey
      : selKey && gridKeys.indexOf(selKey) >= 0
        ? selKey
        : gridKeys.indexOf(todayKey) >= 0
          ? todayKey
          : toKey(new Date(view.y, view.m, 1));

  const prevEnd = toKey(new Date(view.y, view.m, 0));
  const nextStart = toKey(new Date(view.y, view.m + 1, 1));
  const canPrev = !min || prevEnd >= min;
  const canNext = !max || nextStart <= max;

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) weeks.push(days.slice(w * 7, w * 7 + 7));

  return (
    <div className="zc-dtp" role="dialog" aria-label={label || 'Pick a date'}>
      <div className="zc-dtp__cal">
        <div className="zc-dtp__head">
          <MonthJump y={view.y} m={view.m} min={min} max={max} activateOn={activateOn} onPick={jumpToMonth} />
          <div className="zc-dtp__navs">
            <button
              type="button"
              className="zc-dtp__nav"
              aria-label="Previous month"
              disabled={!canPrev}
              {...activationProps<HTMLButtonElement>(() => nav(-1), { on: activateOn })}
            >
              <Icon name="caret-left" size="sm" />
            </button>
            <button
              type="button"
              className="zc-dtp__nav"
              aria-label="Go to today"
              disabled={viewIsCurrent}
              {...activationProps<HTMLButtonElement>(goToToday, { on: activateOn })}
            >
              <Icon name="calendar-dot" size="sm" />
            </button>
            <button
              type="button"
              className="zc-dtp__nav"
              aria-label="Next month"
              disabled={!canNext}
              {...activationProps<HTMLButtonElement>(() => nav(1), { on: activateOn })}
            >
              <Icon name="caret-right" size="sm" />
            </button>
          </div>
        </div>
        <div className="zc-dtp__dow" aria-hidden="true">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          className="zc-dtp__days"
          ref={daysRef}
          role="grid"
          aria-label="Calendar"
          onKeyDown={onGridKeyDown}
          onPointerLeave={glide.leave}
        >
          {weeks.map((week, wi) => (
            <div key={wi} role="row" className="zc-dtp__row">
              {week.map((d) => {
                const key = toKey(d);
                const out = d.getMonth() !== view.m;
                const sel = key === selKey;
                const cls = cx(
                  'zc-dtp__day',
                  out && 'zc-is-out',
                  sel && 'zc-is-selected',
                  key === todayKey && 'zc-is-today',
                );
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    data-key={key}
                    className={cls}
                    disabled={!inRange(key)}
                    tabIndex={key === tabKey ? 0 : -1}
                    aria-selected={sel || undefined}
                    aria-label={MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()}
                    {...activationProps<HTMLButtonElement>(() => pickDay(key), { on: activateOn })}
                    onPointerEnter={(e) => glide.enter(e.currentTarget)}
                  >
                    {sel ? (
                      <Motion
                        as="span"
                        layoutId={pillId}
                        layoutTransition={PILL_FLIP}
                        className="zc-dtp__pill"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="zc-dtp__num">{d.getDate()}</span>
                    {key === todayKey ? <span className="zc-dtp__dot" aria-hidden="true"></span> : null}
                  </button>
                );
              })}
            </div>
          ))}
          <GlidePill className="zc-dtp__hover" glide={glide} />
        </div>
      </div>

      {slot || null}

      <div className="zc-dtp__foot">
        {timezone ? <span className="zc-dtp__tz">{tzLabel(timezone, selKey)}</span> : null}
        <span className="zc-dtp__footSpacer"></span>
        <Button variant="primary" size="sm" onClick={close}>
          Done
        </Button>
      </div>
    </div>
  );
}
