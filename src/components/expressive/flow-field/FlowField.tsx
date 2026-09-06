'use client';

import './flow-field.css';

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { loop } from '../../../engine';
import type { FlowFieldStyle } from '../../../tokens/component-styles.generated';
import { UIMotion } from '../../../tokens/motion-tokens';
import { cx } from '../../internal/utils/cx';

const RAMP_STEPS = 12;
const MAX_NEEDLES = 1600;
const MAX_DEVICE_PIXEL_RATIO = 2;
const MAX_STEP = 3;
const SPACING_MIN = 12;
const SPACING_MAX = 72;
const RADIUS_MIN = 40;
const RADIUS_MAX = 640;

const TAU = Math.PI * 2;
const FIELD_PHASE_RATE = 0.00042;
const FIELD_PHASE_PERIOD = Math.PI * 20;
const FIELD_SCALE_X = 0.011;
const FIELD_SCALE_Y = 0.014;
const FIELD_DRIFT_X = 1.7;
const FIELD_DRIFT_Y = 1.2;
const FIELD_AMPLITUDE = 1.15;

const STEER_FALLOFF = 0.7;
const GRIP_ATTACK = 0.5;
const GRIP_RELEASE = 0.12;
const TURN_RATE_MIN = 0.055;
const TURN_RATE_SPREAD = 0.06;
const LENGTH_REST = 7;
const LENGTH_GAIN = 11;
const LENGTH_EASE = 0.09;
const WIDTH_REST = 1.1;
const WIDTH_GAIN = 1.2;
const ALPHA_REST = 0.42;
const ALPHA_GAIN = 0.58;

const THEME_ATTRIBUTES: MutationObserverInit = { attributeFilter: ['class', 'style', 'data-theme', 'data-polarity'] };

const JITTER_X = 12.9898;
const JITTER_Y = 78.233;
const JITTER_MAGNITUDE = 43758.5453;

const RAMP_PROPERTIES = Array.from({ length: RAMP_STEPS }, (_, step) => `var(--flow-field-ramp-${step})`);
const BUCKET_ALPHA = Array.from(
  { length: RAMP_STEPS },
  (_, step) => ALPHA_REST + (ALPHA_GAIN * step) / (RAMP_STEPS - 1),
);
const BUCKET_WIDTH = Array.from(
  { length: RAMP_STEPS },
  (_, step) => WIDTH_REST + (WIDTH_GAIN * step) / (RAMP_STEPS - 1),
);

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
const wrapAngle = (a: number) => a - TAU * Math.round(a / TAU);

const cellJitter = (column: number, row: number) => {
  const seed = Math.sin(column * JITTER_X + row * JITTER_Y) * JITTER_MAGNITUDE;
  return seed - Math.floor(seed);
};

const targetAngle = (x: number, y: number, phase: number) =>
  (Math.sin(x * FIELD_SCALE_X + phase * FIELD_DRIFT_X) + Math.cos(y * FIELD_SCALE_Y - phase * FIELD_DRIFT_Y)) *
  FIELD_AMPLITUDE;

interface Needle {
  x: number;
  y: number;
  angle: number;
  length: number;
  turn: number;
  bucket: number;
}

interface Field {
  needles: Needle[];
  counts: Uint16Array;
  width: number;
  height: number;
  spacing: number;
  pointerX: number;
  pointerY: number;
  steering: boolean;
  grip: number;
  phase: number;
  stale: boolean;
}

function buildNeedles(field: Field) {
  const gap = Math.max(field.spacing, Math.sqrt((field.width * field.height) / MAX_NEEDLES));
  const columns = Math.min(MAX_NEEDLES, Math.max(1, Math.floor(field.width / gap)));
  const rows = Math.min(Math.floor(MAX_NEEDLES / columns), Math.max(1, Math.floor(field.height / gap)));
  const originX = (field.width - (columns - 1) * gap) / 2;
  const originY = (field.height - (rows - 1) * gap) / 2;

  field.needles.length = 0;
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const x = originX + column * gap;
      const y = originY + row * gap;
      field.needles.push({
        x,
        y,
        angle: wrapAngle(targetAngle(x, y, field.phase)),
        length: LENGTH_REST,
        turn: TURN_RATE_MIN + cellJitter(column, row) * TURN_RATE_SPREAD,
        bucket: 0,
      });
    }
  field.counts.fill(0);
  field.counts[0] = field.needles.length;
}

function advance(field: Field, radius: number, step: number, dt: number) {
  field.phase = (field.phase + dt * FIELD_PHASE_RATE) % FIELD_PHASE_PERIOD;
  field.grip = clamp(
    field.grip + ((field.steering ? 1 : 0) - field.grip) * (field.steering ? GRIP_ATTACK : GRIP_RELEASE) * step,
    0,
    1,
  );
  field.counts.fill(0);

  const steering = field.grip > 0;
  for (let i = 0; i < field.needles.length; i++) {
    const needle = field.needles[i];
    let target = targetAngle(needle.x, needle.y, field.phase);
    let pull = 0;
    if (steering) {
      const dx = needle.x - field.pointerX;
      const dy = needle.y - field.pointerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      pull = distance < radius ? (1 - distance / radius) * field.grip : 0;
      if (pull > 0) target += wrapAngle(Math.atan2(dy, dx) - target) * Math.pow(pull, STEER_FALLOFF);
    }
    needle.angle = wrapAngle(needle.angle + wrapAngle(target - needle.angle) * needle.turn * step);
    needle.length += (LENGTH_REST + LENGTH_GAIN * pull - needle.length) * LENGTH_EASE * step;
    const bucket = Math.round(pull * (RAMP_STEPS - 1));
    needle.bucket = bucket;
    field.counts[bucket]++;
  }
}

function settle(field: Field) {
  field.grip = 0;
  field.steering = false;
  for (let i = 0; i < field.needles.length; i++) {
    const needle = field.needles[i];
    needle.angle = wrapAngle(targetAngle(needle.x, needle.y, field.phase));
    needle.length = LENGTH_REST;
    needle.bucket = 0;
  }
  field.counts.fill(0);
  field.counts[0] = field.needles.length;
}

function paint(ctx: CanvasRenderingContext2D, field: Field, ramp: string[]) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.lineCap = 'round';

  for (let bucket = 0; bucket < RAMP_STEPS; bucket++) {
    if (!field.counts[bucket]) continue;
    ctx.beginPath();
    for (let i = 0; i < field.needles.length; i++) {
      const needle = field.needles[i];
      if (needle.bucket !== bucket) continue;
      const half = needle.length * 0.5;
      const reach = Math.cos(needle.angle) * half;
      const rise = Math.sin(needle.angle) * half;
      ctx.moveTo(needle.x - reach, needle.y - rise);
      ctx.lineTo(needle.x + reach, needle.y + rise);
    }
    ctx.strokeStyle = ramp[bucket];
    ctx.globalAlpha = BUCKET_ALPHA[bucket];
    ctx.lineWidth = BUCKET_WIDTH[bucket];
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function resolveRamp(probe: HTMLElement, ramp: string[]) {
  for (let step = 0; step < RAMP_STEPS; step++) {
    probe.style.color = RAMP_PROPERTIES[step];
    ramp[step] = getComputedStyle(probe).color;
  }
  probe.style.removeProperty('color');
}

export interface FlowFieldOwnProps {
  /** Content layered over the field. It stays in the accessibility tree; only the canvas is aria-hidden. */
  children?: ReactNode;
  /** Multiplies the simulation rate; sampled live on every frame. @default 1 */
  speed?: number;
  /** Distance in pixels between neighbouring needles, clamped to 12-72. Widened automatically on large surfaces so the field never exceeds 1600 needles. @default 26 */
  spacing?: number;
  /** Radius in pixels of the pointer's steering influence, clamped to 40-640. @default 210 */
  radius?: number;
  /** Extra class(es) merged onto the root. */
  className?: string;
  /** Inline styles merged onto the root. */
  style?: FlowFieldStyle;
}

export interface FlowFieldProps extends FlowFieldOwnProps {
  /** Standard <div> attributes (aria-*, data-*, title, ...) forwarded to the root. */
  htmlProps?: Omit<HTMLAttributes<HTMLDivElement>, keyof FlowFieldOwnProps> & DataAttributes;
}

export function FlowField({
  children,
  speed = 1,
  spacing = 26,
  radius = 210,
  className = '',
  style,
  htmlProps,
}: FlowFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef(0);
  const settings = useRef({ speed, radius });

  useEffect(() => {
    settings.current = { speed, radius };
  }, [speed, radius]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const probe = probeRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !probe || !ctx) return;

    const field: Field = {
      needles: [],
      counts: new Uint16Array(RAMP_STEPS),
      width: 0,
      height: 0,
      spacing: clamp(spacing, SPACING_MIN, SPACING_MAX),
      pointerX: 0,
      pointerY: 0,
      steering: false,
      grip: 0,
      phase: phaseRef.current,
      stale: false,
    };

    const reduced = UIMotion.reduced;
    const ramp: string[] = [];
    resolveRamp(probe, ramp);

    const render = () => paint(ctx, field, ramp);

    const fit = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const ratio = Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1);
      field.width = box.width;
      field.height = box.height;
      canvas.width = Math.round(box.width * ratio);
      canvas.height = Math.round(box.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildNeedles(field);
    };

    const settleNow = () => {
      settle(field);
      render();
    };

    fit();
    render();

    const resizes = new ResizeObserver(() => {
      fit();
      if (reduced) settleNow();
    });
    resizes.observe(root);

    const themes = new MutationObserver(() => {
      if (!reduced) {
        field.stale = true;
        return;
      }
      resolveRamp(probe, ramp);
      render();
    });
    themes.observe(document.documentElement, THEME_ATTRIBUTES);
    themes.observe(root, THEME_ATTRIBUTES);

    const controller = new AbortController();
    if (!reduced) {
      const signal = controller.signal;
      root.addEventListener(
        'pointermove',
        (event: PointerEvent) => {
          const box = canvas.getBoundingClientRect();
          field.pointerX = event.clientX - box.left;
          field.pointerY = event.clientY - box.top;
          field.steering = true;
        },
        { signal },
      );
      const release = () => {
        field.steering = false;
      };
      root.addEventListener('pointerleave', release, { signal });
      root.addEventListener('pointercancel', release, { signal });
    }

    const playback = loop(
      (k, dt) => {
        if (field.stale) {
          field.stale = false;
          resolveRamp(probe, ramp);
        }
        advance(field, clamp(settings.current.radius, RADIUS_MIN, RADIUS_MAX), Math.min(MAX_STEP, k), dt);
        render();
      },
      { el: root, speed: () => settings.current.speed, snap: settleNow },
    );

    return () => {
      phaseRef.current = field.phase;
      playback.stop();
      resizes.disconnect();
      themes.disconnect();
      controller.abort();
    };
  }, [spacing]);

  return (
    <div ref={rootRef} className={cx('zc-flow-field', className)} style={style} {...htmlProps}>
      <canvas ref={canvasRef} className="zc-flow-field__canvas" aria-hidden="true" />
      <span ref={probeRef} className="zc-flow-field__probe" aria-hidden="true" />
      {children ? <div className="zc-flow-field__content">{children}</div> : null}
    </div>
  );
}
