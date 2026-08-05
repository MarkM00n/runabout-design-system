import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error';
export type BadgeSize = 'small' | 'medium';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const baseStyles = clsx(
  'inline-flex items-center justify-center rounded-sm',
  'font-manrope font-normal text-label truncate',
);

const sizeStyles: Record<BadgeSize, string> = {
  medium: 'px-02 py-01',
  small: 'px-01 py-00',
};

// text-on-state (not text-primary) deliberately — it's the one token in the
// 2026-08-05 mode architecture that's constant regardless of ambient page
// mode, matching Badge's own fills (surface-inverse/state-success/warning/
// error), which are themselves pinned to their On Light values rather than
// adapting to a surrounding data-mode. See design-system-rules.md §7's
// "Component-internal pairings" note. Badge deliberately does not set its
// own data-mode for this reason — doing so would also shift its own fill
// colour for the mode-variant state-* tokens, not just its text.
const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-inverse text-text-on-state',
  success: 'bg-state-success text-text-on-state',
  warning: 'bg-state-warning text-text-on-state',
  error: 'bg-state-error text-text-on-state',
};

/**
 * Source: Figma Badge component set (Design System, JpFA7KtVlSOrM9fIYYgOsn,
 * node 248:437). Status label only — never wire onClick/interactive
 * behaviour onto it, per the component's own Figma description ("Use for
 * state, not actions").
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'medium', className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
