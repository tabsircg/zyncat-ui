import './button.css';

import { cx } from '../../internal/utils/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonStyleProps {
  /** Visual weight / intent. Omit for base chrome only - sizing, focus ring, layout -
   *  with no skin, for a local re-skin through `className`. */
  variant?: ButtonVariant;
  /** Control height. sm 28px - md 32px (default) - lg 37px. @default 'md' */
  size?: ButtonSize;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Extra class(es) merged onto the result. */
  className?: string;
}

export function buttonClass({ variant, size = 'md', fullWidth, className }: ButtonStyleProps = {}): string {
  return cx(
    'zc-btn',
    variant && `zc-btn--${variant}`,
    size !== 'md' && `zc-btn--${size}`,
    fullWidth && 'zc-btn--block',
    className,
  );
}
