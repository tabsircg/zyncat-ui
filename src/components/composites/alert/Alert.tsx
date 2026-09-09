'use client';

import './alert.css';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import type { DataAttributes } from '../../../dom-props';
import { Motion } from '../../../motion/element';
import { resolveMotionTiming } from '../../../motion/motion-timing';
import { Presence } from '../../../motion/presence';
import { popOut } from '../../../motion/presets';
import type { DisableableAnimation } from '../../../motion/timing';
import { UIMotion } from '../../../tokens/motion-tokens';
import { useControllable } from '../../internal/hooks/use-controllable';
import { Icon, type IconName } from '../../internal/icon/Icon';
import { IconSlot } from '../../internal/icon/IconSlot';
import { cx } from '../../internal/utils/cx';
import { buttonClass } from '../../primitives/button/button-style';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertAction {
  /** Sentence-case label, e.g. "Update billing". */
  label: string;
  onClick?: () => void;
}

interface AlertOwnProps {
  /** Status of the message; info/success are polite, warning/danger assertive. Default 'info'. */
  tone?: AlertTone;
  /** The message - sentence case, ideally one line. */
  title: ReactNode;
  /** Optional description; stays neutral - tone marks the message, not the prose. */
  children?: ReactNode;
  /** One action max, rendered as the system secondary small button. */
  action?: AlertAction;
  /** Renders the always-visible close button. Uncontrolled unless `open` is given. */
  dismissible?: boolean;
  /** Fires on dismiss. With `open` set, the parent owns hiding the alert. */
  onDismiss?: () => void;
  /** Controlled visibility; omit for uncontrolled. The exit fades and scales down, then releases the slot. */
  open?: boolean;
  /** App-level strip: square corners, hairline below only. Paint modifier. */
  banner?: boolean;
  /** Override the tone glyph; pass null to render no glyph. */
  icon?: ReactNode | null;
  /** Extra class(es) merged onto the alert. */
  className?: string;
  /** Inline styles merged onto the alert. */
  style?: CSSProperties;
  /** Enter/exit timing - motion tokens only, or `null` to disable (enter and exit snap).
   *  @default entrance height 'slow'/'entrance' + opacity 'base'/'entrance'; exit scale + opacity 'fast'/'exit' */
  animation?: DisableableAnimation;
}

export interface AlertProps extends AlertOwnProps {
  /** Standard <div> attributes (aria-*, data-*, ...) forwarded to the alert. */
  htmlProps?: Omit<HTMLAttributes<HTMLDivElement>, keyof AlertOwnProps> & DataAttributes;
}

const ALERT_HEIGHT_TIMING = {
  open: { duration: 'slow', ease: 'entrance' },
  close: { duration: 'slow', ease: 'entrance' },
} as const;
const ALERT_OPACITY_TIMING = {
  open: { duration: 'base', ease: 'entrance' },
  close: { duration: 'fast', ease: 'exit' },
} as const;

const TONE_GLYPH: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  danger: 'warning-circle',
};
const TONE_ROLE: Record<AlertTone, string> = { info: 'status', success: 'status', warning: 'alert', danger: 'alert' };

export function Alert({
  tone = 'info',
  title,
  children = null,
  action = null,
  dismissible = false,
  onDismiss,
  open,
  banner = false,
  icon,
  className = '',
  style,
  htmlProps,
  animation,
}: AlertProps) {
  const [isOpen, setOpen] = useControllable(open, true, onDismiss);
  const dismiss = () => setOpen(false);

  const h = resolveMotionTiming(animation, ALERT_HEIGHT_TIMING);
  const o = resolveMotionTiming(animation, ALERT_OPACITY_TIMING);

  const cls = cx('zc-alert', banner && 'zc-alert--banner', className);

  return (
    <Presence initial={false}>
      {isOpen && (
        <Motion
          key="alert-shell"
          className="zc-alert-shell"
          animate={[
            { height: [0, 'auto'], timing: h.open },
            { opacity: [0, 1], timing: o.open },
          ]}
          exit={[popOut(UIMotion.scale.floating, o.close)]}
        >
          <div className={cls} style={style} data-tone={tone} role={TONE_ROLE[tone] || 'status'} {...htmlProps}>
            {icon === null ? null : (
              <span className="zc-alert__icon" aria-hidden="true">
                {icon !== undefined ? (
                  <IconSlot size="md">{icon}</IconSlot>
                ) : (
                  <Icon name={TONE_GLYPH[tone] || 'info'} size="md" />
                )}
              </span>
            )}
            <div className="zc-alert__body">
              <p className="zc-alert__title">{title}</p>
              {children != null && <p className="zc-alert__desc">{children}</p>}
            </div>
            {action && (
              <button
                type="button"
                className={buttonClass({ size: 'sm', className: 'zc-alert__action' })}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )}
            {dismissible && (
              <button type="button" className="zc-alert__close" aria-label="Dismiss" onClick={dismiss}>
                <Icon name="close" size="sm" />
              </button>
            )}
          </div>
        </Motion>
      )}
    </Presence>
  );
}
