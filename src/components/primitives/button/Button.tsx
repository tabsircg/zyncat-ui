'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode, Ref } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { usePressFeedback } from '../../internal/hooks/use-press-feedback';
import { cx } from '../../internal/utils/cx';
import { Spinner } from '../spinner/Spinner';
import { buttonClass, type ButtonSize, type ButtonVariant } from './button-style';

export { buttonClass } from './button-style';
export type { ButtonSize, ButtonStyleProps, ButtonVariant } from './button-style';

interface ButtonOwnProps {
  /** Visual weight / intent. @default 'primary' */
  variant?: ButtonVariant;
  /** Forwarded to the underlying <button> (React 19 ref-as-prop). */
  ref?: Ref<HTMLButtonElement>;
  /** Control height. sm 28px - md 32px (default) - lg 37px. @default 'md' */
  size?: ButtonSize;
  /** `submit` / `reset` / `button`. @default 'button' */
  type?: 'button' | 'submit' | 'reset';
  /** Disable the control (also implied by `loading`). */
  disabled?: boolean;
  /** Loading - swaps the label for a spinner and makes the button inert. The label stays
   *  mounted but invisible, so the button holds its width. */
  loading?: boolean;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Extra class(es) merged onto the button. */
  className?: string;
  /** Inline styles merged onto the button. */
  style?: CSSProperties;
  /** Button label. */
  children?: ReactNode;
}

type ButtonRestProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & DataAttributes;

const chain =
  <E,>(theirs: ((event: E) => void) | undefined, mine: (event: E) => void) =>
  (event: E) => {
    mine(event);
    theirs?.(event);
  };

export interface ButtonProps extends ButtonOwnProps, ButtonRestProps {
  /** Standard <button> attributes (onClick, name, form, aria-*, data-*, ...) forwarded verbatim.
   *  Bare `<button>` attributes also pass through directly; `htmlProps` wins on conflict. */
  htmlProps?: ButtonRestProps;
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  style,
  children,
  ref,
  htmlProps,
  ...rest
}: ButtonProps) {
  const inert = disabled || loading;
  const press = usePressFeedback(inert);
  const cls = cx(buttonClass({ variant, size, fullWidth, className }), loading && 'zc-is-loading');
  const merged = { ...rest, ...htmlProps };

  return (
    <button
      type={type}
      ref={ref}
      className={cls}
      style={style}
      disabled={inert}
      aria-busy={loading || undefined}
      {...merged}
      data-pressed={press.pressed ? 'true' : undefined}
      onPointerDown={chain(merged.onPointerDown, press.onPointerDown)}
      onPointerLeave={chain(merged.onPointerLeave, press.onPointerLeave)}
    >
      <span className="zc-btn__label">{children}</span>
      {loading ? <Spinner label={null} className="zc-btn__spinner" /> : null}
    </button>
  );
}
