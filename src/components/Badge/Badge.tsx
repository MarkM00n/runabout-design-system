import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error';
export type BadgeSize = 'medium' | 'small';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

// Source: Figma `Badge` component set. Short status label — per Figma's own
// usage description, colour never carries meaning alone, so children is
// required rather than defaulted.
const baseStyles = clsx(
  'inline-flex items-center justify-center rounded-full',
  'font-manrope font-normal text-label text-text-inverse',
  'truncate',
);

const sizeStyles: Record<BadgeSize, string> = {
  medium: 'px-02 py-01',
  small: 'px-01 py-00',
};

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-inverse',
  success: 'bg-state-success',
  warning: 'bg-state-warning',
  error: 'bg-state-error',
};

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
