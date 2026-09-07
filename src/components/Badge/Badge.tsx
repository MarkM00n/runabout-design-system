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

// Source: Figma Badge (248:437). Two different colour strategies in one
// component set, and the split is deliberate:
//
// - `neutral` is an OUTLINED badge as of 2026-09-07 (it used to be a solid
//   dark chip). Transparent fill, border-strong outline, text-primary label
//   — all three mode-variant, so a neutral badge inherits whatever surface
//   it sits on and stays legible on all four without any mode of its own.
// - The three status variants are solid state-* fills paired with
//   text-on-state. Those four tokens are mode-INVARIANT in Figma: a "success"
//   chip is the same green on cream as on terracotta, because a status
//   colour that shifted per surface would stop reading as a status colour.
//   Measured: 6.92:1 success, 6.97:1 warning, 6.28:1 error against
//   text-on-state.
//
// Badge never sets its own data-mode. It has a background but is not a
// surface — the status fills don't need one (invariant), and neutral
// specifically has to inherit to work.
const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-action-secondary border border-border-strong text-text-primary',
  success: 'bg-state-success text-text-on-state',
  warning: 'bg-state-warning text-text-on-state',
  error: 'bg-state-error text-text-on-state',
};

/**
 * Status label only — never wire onClick or interactive behaviour onto it,
 * per the component's own Figma description ("Use for state, not actions").
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
