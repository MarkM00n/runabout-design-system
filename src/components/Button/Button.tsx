import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'link';
export type ButtonSize = 'large' | 'small';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const baseStyles = clsx(
  'inline-flex items-center justify-center gap-01',
  'font-tt-norms font-normal select-none',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  'disabled:cursor-not-allowed disabled:pointer-events-none',
);

// Heights use arbitrary px values rather than Tailwind's h-12/h-8 scale —
// those are rem-based and the host app's root font-size (18px, see index.css)
// would scale them off their nominal 48px/32px.
const sizeStyles: Record<ButtonSize, string> = {
  large: 'h-[48px] px-03 rounded-2xl text-h6',
  small: 'h-[32px] px-02 rounded-xl text-label',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-action-primary text-text-primary',
    'hover:bg-action-primary-hover',
    'focus-visible:ring-border-focus',
    'disabled:opacity-40 disabled:bg-action-primary disabled:text-text-primary',
  ),
  secondary: clsx(
    'bg-transparent text-text-inverse border border-border-default',
    'hover:bg-action-secondary-hover hover:border-text-inverse',
    'focus-visible:border-border-focus focus-visible:ring-border-focus',
    'disabled:opacity-60 disabled:bg-surface-primary disabled:text-text-primary disabled:border-text-inverse',
  ),
  accent: clsx(
    'bg-action-highlight text-text-primary',
    'hover:bg-action-highlight-hover',
    // Figma binds Accent's Focused border to border-default (cream), not border-focus
    'focus-visible:ring-border-default',
    'disabled:opacity-40 disabled:bg-surface-primary disabled:text-text-primary disabled:border disabled:border-text-inverse',
  ),
  link: clsx(
    'bg-transparent text-action-highlight px-0',
    'hover:text-action-highlight-hover',
    // No distinct Focused token and no Disabled variant exist for Link in Figma —
    // ring/opacity below are an accessibility-driven addition, not Figma-sourced.
    'focus-visible:ring-border-focus',
    'disabled:opacity-40',
  ),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'large', type = 'button', className, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
