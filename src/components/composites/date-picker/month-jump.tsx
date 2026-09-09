'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { animate } from '../../../engine';
import { GlidePill, useGlide } from '../../../motion/glide';
import { slideIn } from '../../../motion/presets';
import { UIMotion } from '../../../tokens/motion-tokens';
import { Icon } from '../../internal/icon/Icon';
import { activationProps, type ActivateOn } from '../../internal/utils/activation';
import { cx } from '../../internal/utils/cx';
import { Popover } from '../popover/Popover';
import { MONTHS, parse, toKey } from './date-utils';

const YEARS_PER_PAGE = 3;
const MONTH_COLUMNS = 3;
const UNBOUNDED_YEAR_REACH = 100;
const GRID_PARTS = '.zc-dtp__dow, .zc-dtp__days';

function gridBox(trigger: HTMLElement | null): DOMRect | null {
  const cal = trigger && trigger.closest('.zc-dtp__cal');
  const parts = cal && cal.querySelectorAll(GRID_PARTS);
  if (!parts || parts.length === 0) return null;
  const head = parts[0].getBoundingClientRect();
  const tail = parts[parts.length - 1].getBoundingClientRect();
  return new DOMRect(head.left, head.top, Math.max(head.width, tail.width), tail.bottom - head.top);
}

interface MonthJumpProps {
  y: number;
  m: number;
  min?: string;
  max?: string;
  onPick: (y: number, m: number) => void;
  activateOn?: ActivateOn;
}

export function MonthJump({ y, m, min, max, onPick, activateOn }: MonthJumpProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(y - 1);
  const [year, setYear] = useState(y);
  const [cursor, setCursor] = useState(m);

  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const monthGlide = useGlide(monthsRef);
  const yearGlide = useGlide(stripRef);

  const minYear = min ? parse(min).getFullYear() : y - UNBOUNDED_YEAR_REACH;
  const maxYear = max ? parse(max).getFullYear() : y + UNBOUNDED_YEAR_REACH;

  const monthEnabled = (yy: number, mm: number): boolean => {
    const first = toKey(new Date(yy, mm, 1));
    const last = toKey(new Date(yy, mm + 1, 0));
    return (!min || last >= min) && (!max || first <= max);
  };

  function toggle(next: boolean) {
    if (next) {
      const grid = gridBox(triggerRef.current);
      setBox(grid ? { width: grid.width, height: grid.height } : null);
      setPage(y - 1);
      setYear(y);
      setCursor(m);
    }
    setOpen(next);
  }

  useEffect(() => {
    if (!open) return;
    monthsRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }, [open, cursor]);

  function turn(dir: number) {
    const next = page + dir * YEARS_PER_PAGE;
    if (next + YEARS_PER_PAGE - 1 < minYear || next > maxYear) return;
    setPage(next);
    yearGlide.leave();
    const el = stripRef.current;
    if (el) animate(el, slideIn(dir * UIMotion.dist.md, UIMotion.t.enter));
  }

  function moveCursor(delta: number) {
    const next = cursor + delta;
    if (next < 0 || next > MONTHS.length - 1) return;
    setCursor(next);
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const k = e.key;
    if (k === 'ArrowLeft') moveCursor(-1);
    else if (k === 'ArrowRight') moveCursor(1);
    else if (k === 'ArrowUp') moveCursor(-MONTH_COLUMNS);
    else if (k === 'ArrowDown') moveCursor(MONTH_COLUMNS);
    else return;
    e.preventDefault();
  }

  function pick(mm: number) {
    onPick(year, mm);
    setOpen(false);
  }

  const years: number[] = [];
  for (let i = 0; i < YEARS_PER_PAGE; i++) years.push(page + i);

  return (
    <Popover
      open={open}
      onOpenChange={toggle}
      side="bottom"
      align="center"
      arrow
      activateOn={activateOn}
      htmlProps={box ? { style: box } : undefined}
      trigger={
        <button
          type="button"
          ref={triggerRef}
          className="zc-dtp__jump"
          aria-label={'Change month - ' + MONTHS[m] + ' ' + y}
        >
          <span className="zc-dtp__month" aria-live="polite">
            {MONTHS[m]} <span className="zc-dtp__year">{y}</span>
          </span>
          <Icon name="caret-down" size="sm" className="zc-dtp__jumpCaret" />
        </button>
      }
    >
      <div className="zc-dtp__jumpPanel" role="group" aria-label="Jump to month" onKeyDown={onKeyDown}>
        <div className="zc-dtp__jumpYears">
          <button
            type="button"
            className="zc-dtp__nav"
            aria-label="Earlier years"
            disabled={page <= minYear}
            {...activationProps<HTMLButtonElement>(() => turn(-1), { on: activateOn })}
          >
            <Icon name="caret-left" size="sm" />
          </button>
          <div className="zc-dtp__jumpStrip" ref={stripRef} onPointerLeave={yearGlide.leave}>
            {years.map((yy) => (
              <button
                key={yy}
                type="button"
                className={cx('zc-dtp__jumpOpt', 'zc-dtp__jumpYear', yy === year && 'zc-is-active')}
                disabled={yy < minYear || yy > maxYear}
                aria-pressed={yy === year}
                onPointerEnter={(e) => yearGlide.enter(e.currentTarget)}
                {...activationProps<HTMLButtonElement>(() => setYear(yy), { on: activateOn })}
              >
                {yy}
              </button>
            ))}
            <GlidePill className="zc-dtp__jumpGlide" glide={yearGlide} />
          </div>
          <button
            type="button"
            className="zc-dtp__nav"
            aria-label="Later years"
            disabled={page + YEARS_PER_PAGE - 1 >= maxYear}
            {...activationProps<HTMLButtonElement>(() => turn(1), { on: activateOn })}
          >
            <Icon name="caret-right" size="sm" />
          </button>
        </div>

        <div className="zc-dtp__jumpMonths" ref={monthsRef} onPointerLeave={monthGlide.leave}>
          {MONTHS.map((name, mm) => (
            <button
              key={name}
              type="button"
              className={cx('zc-dtp__jumpOpt', year === y && mm === m && 'zc-is-active')}
              disabled={!monthEnabled(year, mm)}
              tabIndex={mm === cursor ? 0 : -1}
              aria-pressed={year === y && mm === m}
              aria-label={name + ' ' + year}
              onPointerEnter={(e) => monthGlide.enter(e.currentTarget)}
              {...activationProps<HTMLButtonElement>(() => pick(mm), { on: activateOn })}
            >
              {name.slice(0, 3)}
            </button>
          ))}
          <GlidePill className="zc-dtp__jumpGlide" glide={monthGlide} />
        </div>
      </div>
    </Popover>
  );
}
