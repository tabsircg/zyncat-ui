'use client';

import './motion-devtools.css';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { startDrag } from '../../engine';
import { cx } from '../internal/utils/cx';
import { Button } from '../primitives/button/Button';
import { Checkbox } from '../primitives/checkbox/Checkbox';
import { Collapse } from '../primitives/collapse/Collapse';
import { motionSlowmo, shouldBeActive, type SlowmoState } from './slowmo-engine';

export type MotionDevtoolsPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MotionDevtoolsProps {
  /** Which corner of the viewport the panel rests in. Dragging moves it off. @default 'bottom-right' */
  placement?: MotionDevtoolsPlacement;
  /** Distance from the viewport edges at rest, in px. @default 16 */
  offset?: number;
  /** Quick-select slow-down factors (1 = real time). Also the ladder the slower/faster
   *  shortcuts step through. @default [1, 2, 4, 8, 16] */
  presets?: number[];
  /** Upper bound of the fine slider. @default 16 */
  maxFactor?: number;
  /** Slow-down factor to start at. @default 1 */
  defaultFactor?: number;
  /** Scale setTimeout/setInterval too, so duration-coupled JS cleanups don't truncate
   *  slowed CSS. Exposed as a live toggle in the panel. @default true */
  scaleTimers?: boolean;
  /** Bind the global Alt-chord shortcuts. The panel lists them under Shortcuts. @default true */
  hotkeys?: boolean;
  /** Let the panel be dragged anywhere in the viewport by its header. @default true */
  draggable?: boolean;
  /** Remember the chosen factor and dragged position across reloads (localStorage). @default true */
  persist?: boolean;
  /** Start with the full panel open rather than collapsed to its header. @default false */
  defaultOpen?: boolean;
  /** Extra class on the panel root, e.g. a host token scope. */
  className?: string;
}

type ChordId = 'freeze' | 'slower' | 'faster' | 'realtime' | 'panel';

interface Chord {
  id: ChordId;
  code: string;
  label: string;
  keys: string[];
}

const CHORDS: Chord[] = [
  { id: 'freeze', code: 'KeyP', label: 'Freeze / resume', keys: ['P'] },
  { id: 'slower', code: 'Comma', label: 'Slower', keys: [','] },
  { id: 'faster', code: 'Period', label: 'Faster', keys: ['.'] },
  { id: 'realtime', code: 'Digit0', label: 'Real time', keys: ['0'] },
  { id: 'panel', code: 'KeyM', label: 'Show / hide', keys: ['M'] },
];

const STORAGE_KEY = 'zyncat-ui:motion-devtools';
const DRAG_SLOP_PX = 4;
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
]);

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const clampRange = (min: number, max: number, v: number) => (v < min ? min : v > max ? max : v);
const altLabel = () => (/mac|iphone|ipad|ipod/i.test(navigator.userAgent) ? '⌥' : 'Alt');

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={'zc-mdt__chevron' + (open ? ' zc-mdt__chevron--open' : '')}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GaugeGlyph() {
  return (
    <svg className="zc-mdt__glyph" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4a8 8 0 0 1 8 8 8 8 0 0 1-.6 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 4a8 8 0 0 0-8 8 8 8 0 0 0 .6 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path d="M12 12l4-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg className="zc-mdt__glyph" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5v14M15 5v14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function MotionDevtools({
  placement = 'bottom-right',
  offset = 16,
  presets = [1, 2, 4, 8, 16],
  maxFactor = 16,
  defaultFactor = 1,
  scaleTimers = true,
  hotkeys = true,
  draggable = true,
  persist = true,
  defaultOpen = false,
  className,
}: MotionDevtoolsProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [showKeys, setShowKeys] = useState(false);
  const [snap, setSnap] = useState<SlowmoState>(() => motionSlowmo.get());
  const [timers, setTimers] = useState(scaleTimers);

  const rootRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const pressRef = useRef({ x: 0, y: 0 });
  const runChordRef = useRef<(id: ChordId) => void>(() => {});

  const writePos = useCallback(() => {
    const el = rootRef.current;
    if (el) el.style.translate = `${posRef.current.x}px ${posRef.current.y}px`;
  }, []);

  const clampIntoView = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    writePos();
    const rect = el.getBoundingClientRect();
    const restLeft = rect.left - posRef.current.x;
    const restTop = rect.top - posRef.current.y;
    posRef.current = {
      x: clampRange(-restLeft, window.innerWidth - rect.width - restLeft, posRef.current.x),
      y: clampRange(-restTop, window.innerHeight - rect.height - restTop, posRef.current.y),
    };
    writePos();
  }, [writePos]);

  const savePrefs = useCallback(() => {
    if (!persist) return;
    const { factor, paused } = motionSlowmo.get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ factor, paused, ...posRef.current }));
    } catch {}
  }, [persist]);

  const setFactor = (factor: number) => motionSlowmo.set({ factor, paused: false });

  const stepFactor = (direction: 1 | -1) => {
    const ladder = [...new Set(presets)].sort((a, b) => a - b);
    const current = motionSlowmo.get().factor;
    const next = direction > 0 ? ladder.find((p) => p > current) : ladder.findLast((p) => p < current);
    if (next !== undefined) setFactor(next);
  };

  const onHeadPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    pressRef.current = { x: e.clientX, y: e.clientY };
    const el = rootRef.current;
    if (!draggable || e.button !== 0 || !el) return;
    const start = { ...posRef.current };
    let moved = false;
    startDrag(e, {
      onMove: (info) => {
        if (!moved && Math.hypot(info.offset.x, info.offset.y) < DRAG_SLOP_PX) return;
        moved = true;
        el.dataset.dragging = '';
        posRef.current = { x: start.x + info.offset.x, y: start.y + info.offset.y };
        clampIntoView();
      },
      onEnd: () => {
        if (!moved) return;
        delete el.dataset.dragging;
        savePrefs();
      },
    });
  };

  const isDragRelease = (e: ReactMouseEvent<HTMLButtonElement>) =>
    e.detail !== 0 && Math.hypot(e.clientX - pressRef.current.x, e.clientY - pressRef.current.y) >= DRAG_SLOP_PX;

  useEffect(() => motionSlowmo.subscribe(setSnap), []);

  useEffect(() => {
    setMounted(true);
    let stored: { factor?: number; paused?: boolean; x?: number; y?: number } = {};
    if (persist) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch {}
    }
    posRef.current = { x: stored.x ?? 0, y: stored.y ?? 0 };
    const factor = stored.factor ?? defaultFactor;
    const paused = stored.paused ?? false;
    motionSlowmo.set({ factor, paused });
    if (shouldBeActive(factor, paused)) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    motionSlowmo.configure({ scaleTimers: timers });
  }, [timers]);

  useEffect(() => {
    if (mounted) savePrefs();
  }, [snap.factor, snap.paused, mounted, savePrefs]);

  useEffect(() => {
    const el = rootRef.current;
    if (!mounted || !el) return;
    const observer = new ResizeObserver(clampIntoView);
    observer.observe(el);
    window.addEventListener('resize', clampIntoView);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', clampIntoView);
    };
  }, [mounted, clampIntoView]);

  useEffect(() => {
    runChordRef.current = (id: ChordId) => {
      const live = motionSlowmo.get();
      switch (id) {
        case 'freeze':
          return motionSlowmo.set({ paused: !live.paused });
        case 'slower':
          return stepFactor(1);
        case 'faster':
          return stepFactor(-1);
        case 'realtime':
          return motionSlowmo.reset();
        case 'panel':
          return setOpen((o) => !o);
      }
    };
  });

  useEffect(() => {
    if (!hotkeys) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTextEntry(e.target)) return;
      const chord = CHORDS.find((c) => c.code === e.code);
      if (!chord) return;
      e.preventDefault();
      e.stopPropagation();
      runChordRef.current(chord.id);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [hotkeys]);

  if (!mounted) return null;

  const active = shouldBeActive(snap.factor, snap.paused);
  const fill = `${((Math.min(snap.factor, maxFactor) - 1) / Math.max(1, maxFactor - 1)) * 100}%`;
  const alt = altLabel();

  const readout = snap.paused
    ? { value: 'Paused', unit: 'frozen' }
    : snap.factor === 1
      ? { value: 'Normal', unit: 'real-time' }
      : { value: `${fmt(snap.factor)}×`, unit: 'slower' };

  const rootClass = cx(
    'zc-mdt',
    `zc-mdt--${placement}`,
    active && 'zc-mdt--active',
    snap.paused && 'zc-mdt--paused',
    draggable && 'zc-mdt--draggable',
    className,
  );

  return createPortal(
    <div ref={rootRef} className={rootClass} style={{ '--mdt-offset': `${offset}px` } as CSSProperties}>
      <div className={'zc-mdt__panel' + (open ? ' zc-is-open' : '')} role="group" aria-label="Motion devtools">
        <button
          className="zc-mdt__head"
          onPointerDown={onHeadPointerDown}
          onClick={(e) => {
            if (!isDragRelease(e)) setOpen((o) => !o);
          }}
          aria-expanded={open}
          title={draggable ? 'Motion devtools - drag to move' : 'Motion devtools'}
          aria-label={open ? 'Collapse motion devtools' : 'Expand motion devtools'}
        >
          {snap.paused ? <PauseGlyph /> : <GaugeGlyph />}
          <span className="zc-mdt__spacer" />
          <span className="zc-mdt__badge">{`${fmt(snap.factor)}×`}</span>
          <Chevron open={open} />
        </button>

        <Collapse open={open} fade>
          <div className="zc-mdt__body">
            <span className="zc-mdt__title">Motion</span>
            <div className="zc-mdt__readout">
              <span className="zc-mdt__value">{readout.value}</span>
              <span className="zc-mdt__unit">{readout.unit}</span>
            </div>

            <input
              className="zc-mdt__slider"
              type="range"
              min={1}
              max={maxFactor}
              step={0.5}
              value={Math.min(snap.factor, maxFactor)}
              onChange={(e) => setFactor(Number(e.target.value))}
              style={{ '--mdt-fill': fill } as CSSProperties}
              aria-label="Slow-down factor"
            />

            <div className="zc-mdt__chips">
              {presets.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={!snap.paused && snap.factor === p ? 'primary' : 'secondary'}
                  onClick={() => setFactor(p)}
                >
                  {p}×
                </Button>
              ))}
            </div>

            <div className="zc-mdt__row">
              <Button
                size="sm"
                variant={snap.paused ? 'primary' : 'secondary'}
                onClick={() => motionSlowmo.set({ paused: !snap.paused })}
              >
                {snap.paused ? 'Resume' : 'Freeze'}
              </Button>
              <Button size="sm" variant="ghost" disabled={!active} onClick={() => motionSlowmo.reset()}>
                Reset
              </Button>
            </div>

            <div className="zc-mdt__opt">
              <Checkbox size="sm" checked={timers} onChange={(e) => setTimers(e.target.checked)} label="Scale timers" />

              <button className="zc-mdt__more" onClick={() => setShowKeys((k) => !k)} aria-expanded={showKeys}>
                <span>Shortcuts</span>
                <Chevron open={showKeys} />
              </button>

              <Collapse open={showKeys} fade>
                <dl className="zc-mdt__keys">
                  {CHORDS.map((chord) => (
                    <div className="zc-mdt__keyrow" key={chord.id}>
                      <dt>{chord.label}</dt>
                      <dd>
                        <kbd className="zc-mdt__key">{alt}</kbd>
                        {chord.keys.map((key) => (
                          <kbd className="zc-mdt__key" key={key}>
                            {key}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="zc-mdt__hint">
                  Timer scaling keeps duration-based cleanups from cutting slowed animations short.
                </p>
              </Collapse>
            </div>
          </div>
        </Collapse>
      </div>
    </div>,
    document.body,
  );
}

export { motionSlowmo, type SlowmoState } from './slowmo-engine';
export default MotionDevtools;
