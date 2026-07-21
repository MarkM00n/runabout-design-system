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
  'font-manrope font-normal select-none',
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

// Figma's Button/Icon "Arrow" (node 265:550, Iconography library) — a
// trailing arrow every Button variant now shows unconditionally. Embedded
// as a static path rather than an image export so its colour can follow
// currentColor like every other token-driven value in this system, instead
// of baking one flattened raster/vector per state.
const iconSizeStyles: Record<ButtonSize, string> = {
  large: 'size-[24px]',
  small: 'size-[16px]',
};

const ArrowIcon = ({ size }: { size: ButtonSize }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={clsx('shrink-0', iconSizeStyles[size])}
  >
    <path d="M13.2673 4.20926C12.9674 3.92357 12.4926 3.93511 12.2069 4.23504C11.9213 4.53497 11.9328 5.0097 12.2327 5.29539L18.4841 11.25H3.75C3.33579 11.25 3 11.5858 3 12C3 12.4142 3.33579 12.75 3.75 12.75H18.4842L12.2327 18.7047C11.9328 18.9904 11.9213 19.4651 12.2069 19.7651C12.4926 20.065 12.9674 20.0765 13.2673 19.7908L20.6862 12.7241C20.8551 12.5632 20.9551 12.358 20.9861 12.1446C20.9952 12.0978 21 12.0495 21 12C21 11.9504 20.9952 11.902 20.986 11.8551C20.955 11.6419 20.855 11.4368 20.6862 11.276L13.2673 4.20926Z" />
  </svg>
);

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-action-primary text-text-on-action',
    'hover:bg-action-primary-hover',
    'focus-visible:ring-border-focus',
    'disabled:opacity-40 disabled:bg-action-primary disabled:text-text-primary',
  ),
  secondary: clsx(
    'bg-transparent text-text-inverse border border-border-default',
    'hover:bg-action-secondary-hover hover:border-text-inverse',
    'focus-visible:border-border-focus focus-visible:ring-border-focus',
    // Figma's Disabled variant binds no border colour at all here (unlike
    // every other state) — kept at text-inverse rather than guessing a new
    // value, since that's what the border already was and nothing in the
    // source indicates it should change.
    'disabled:opacity-60 disabled:bg-surface-primary disabled:text-text-primary disabled:border-text-inverse',
  ),
  accent: clsx(
    'bg-action-highlight text-text-on-highlight',
    'hover:bg-action-highlight-hover',
    // Accent's Focused ring uses its own dedicated token, not border-focus —
    // border-focus (Blue/100) measures only 1.47:1 against action-highlight,
    // short of WCAG 1.4.11's 3:1 non-text minimum. border-focus-on-highlight
    // (Blue/25) clears it at 3.96:1. See tokens.css for the full story.
    'focus-visible:ring-border-focus-on-highlight',
    'disabled:opacity-40 disabled:bg-surface-primary disabled:text-text-primary disabled:border disabled:border-text-inverse',
  ),
  link: clsx(
    'bg-transparent text-text-button',
    'hover:text-text-button-inverse hover:underline',
    'focus-visible:ring-border-focus focus-visible:text-text-button-inverse focus-visible:underline',
    'disabled:opacity-40 disabled:text-state-disabled',
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
      <ArrowIcon size={size} />
    </button>
  ),
);

Button.displayName = 'Button';
