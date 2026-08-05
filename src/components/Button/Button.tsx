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

// Disabled = Default appearance at reduced opacity (opacity-disabled, 38%),
// never a separate colour swap — design-system-rules.md §2, 2026-08-05
// architecture. Every variant below relies on this: no disabled:bg-*/
// disabled:text-*/disabled:border-* override remains anywhere, since the
// Default classes above them already carry through unchanged, just faded.
// This also fixes a real bug the old swap pattern had: action-primary
// inverted (light fill -> dark fill) in the same 2026-08-05 sync, and the
// old `disabled:bg-action-primary disabled:text-text-primary` pairing
// would have rendered dark text on action-primary's new dark fill —
// illegible. Fading the real Default combination sidesteps that entirely.
const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-action-primary text-text-on-action',
    'hover:bg-action-primary-hover',
    'focus-visible:ring-border-focus',
    'disabled:opacity-disabled',
  ),
  secondary: clsx(
    'bg-transparent text-text-primary border border-border-default',
    'hover:bg-action-secondary-hover hover:border-text-primary',
    'focus-visible:border-border-focus focus-visible:ring-border-focus',
    'disabled:opacity-disabled',
  ),
  accent: clsx(
    'bg-action-highlight text-text-on-highlight',
    'hover:bg-action-highlight-hover',
    // Accent's Focused ring uses its own dedicated token, not border-focus —
    // border-focus (Blue/500 on Light) measures only ~1.5:1 against
    // accent's action-highlight fill, short of WCAG 1.4.11's 3:1 non-text
    // minimum. border-focus-on-highlight (mode-invariant, Blue/900) clears
    // it. See tokens.css for the full story.
    'focus-visible:ring-border-focus-on-highlight',
    'disabled:opacity-disabled',
  ),
  link: clsx(
    'bg-transparent text-text-button',
    // Confirmed live in Figma (2026-08-05): Default/Hover/Focused/Disabled
    // all bind the label to the same text-button token now — there's no
    // separate brighter hover/focus color anymore (the old text-button-
    // inverse token this used to use is retired). The underline alone
    // carries hover/focus feedback, matching the component's own Figma
    // description.
    'hover:underline',
    'focus-visible:ring-border-focus focus-visible:underline',
    'disabled:opacity-disabled',
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
      // Secondary has no fill of its own (bg-transparent) — it assumes an
      // externally dark backdrop, same as before the 2026-08-05 sync, just
      // token-driven now instead of a hardcoded text-inverse value. Scoping
      // data-mode="dark" to Secondary specifically (not the other variants,
      // which render normally against whatever the page's own mode is)
      // reproduces that fixed appearance regardless of the surrounding
      // page's actual mode.
      data-mode={variant === 'secondary' ? 'dark' : undefined}
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
      <ArrowIcon size={size} />
    </button>
  ),
);

Button.displayName = 'Button';
