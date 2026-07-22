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
  'inline-flex items-center justify-center rounded-full',
  'font-manrope font-normal text-label truncate',
);

const sizeStyles: Record<BadgeSize, string> = {
  medium: 'px-02 py-01',
  small: 'px-01 py-00',
};

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-inverse text-text-inverse',
  success: 'bg-state-success text-text-inverse',
  warning: 'bg-state-warning text-text-inverse',
  error: 'bg-state-error text-text-inverse',
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
