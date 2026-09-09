import './spinner.css';

import type { CSSProperties } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { cx } from '../../internal/utils/cx';

export type SpinnerSize = 'inherit' | 'sm' | 'md' | 'lg';
export type SpinnerThickness = 'thin' | 'regular' | 'bold';
export type SpinnerVariant = 'arc' | 'dots' | 'pulse';

const PART_COUNT: Record<SpinnerVariant, number> = { arc: 0, pulse: 0, dots: 3 };

export interface SpinnerProps {
  /** Diameter. `inherit` tracks the parent's font size at 1em, so a spinner beside a label
   *  always matches it; for any other size set `style={{ fontSize }}`. @default 'inherit' */
  size?: SpinnerSize;
  /** Stroke weight, scaled to the diameter so it holds up at every size. @default 'regular' */
  thickness?: SpinnerThickness;
  /** Which loader to draw. @default 'arc' */
  variant?: SpinnerVariant;
  /** What assistive tech announces. Pass `null` when something nearby already announces the
   *  wait - a button's `aria-busy`, an enclosing `role="status"` - and the spinner turns
   *  decorative rather than announcing it twice. @default 'Loading' */
  label?: string | null;
  /** Hold invisible for a beat before fading in, so work that finishes quickly never flashes
   *  a spinner. @default false */
  delay?: boolean;
  /** Extra class(es) merged onto the root. */
  className?: string;
  /** Inline styles merged onto the root. */
  style?: CSSProperties;
}

export function Spinner({
  size = 'inherit',
  thickness = 'regular',
  variant = 'arc',
  label = 'Loading',
  delay = false,
  className,
  style,
  ...rest
}: SpinnerProps & DataAttributes) {
  const decorative = label === null;

  return (
    <span
      className={cx(
        'zc-spin',
        `zc-spin--${variant}`,
        size !== 'inherit' && `zc-spin--${size}`,
        thickness !== 'regular' && `zc-spin--${thickness}`,
        delay && 'zc-spin--delayed',
        className,
      )}
      style={style}
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      <span className="zc-spin__figure">
        {Array.from({ length: PART_COUNT[variant] }, (_, i) => (
          <span key={i} className="zc-spin__part" style={{ '--_spinner-i': i } as CSSProperties} />
        ))}
      </span>
    </span>
  );
}
