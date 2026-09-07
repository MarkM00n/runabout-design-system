import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'link';
export type ButtonSize = 'large' | 'small';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Figma's `Icon` boolean property — the trailing arrow. On by default,
   * matching every Default variant in the Figma set. */
  icon?: boolean;
}

// Source: Figma Button/Primary (70:42), Button/Secondary (70:83),
// Button/Accent (59:1985), Button/Link (70:124).
//
// Focus is an offset outer ring (rules §2): 2px outline, offset 2px, colour
// from state-focus. Deliberately NOT `ring-*` — Figma models it as a
// separate focus-ring frame sitting 2px clear of the control's own bounds,
// which is what `outline` + `outline-offset` reproduces without touching
// layout. And deliberately no `outline-none` anywhere on the element: any
// outline-none, even scoped to focus:, pins Tailwind v4's shared
// --tw-outline-style to "none" for good and focus-visible:outline can never
// set it back (rules §2, real incident PR #70).
//
// That 2px gap is also why no variant needs a darker ring any more. The old
// border-focus-on-highlight token existed because an inset ring sat directly
// on Button accent's amber fill at 1.97:1. Measured 2026-09-07 against the
// current geometry: the ring's adjacent colour on both sides is the surface,
// not the fill, giving 4.40:1 on cream, 6.08:1 olive, 8.92:1 dark and
// 3.67:1 terracotta — all clear of SC 1.4.11's 3:1, accent included. Every
// variant now uses the one state-focus token.
const baseStyles = clsx(
  'inline-flex items-center justify-center gap-01',
  'font-manrope font-normal select-none',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-disabled',
);

// Heights use arbitrary px values rather than Tailwind's h-12/h-8 scale —
// those are rem-based and the host app's root font-size (18px, see index.css)
// would scale them off their nominal 48px/32px. Radius steps down with size
// here (radius-2xl -> radius-xl), unlike the Input family, which stays
// radius-2xl at both sizes — don't assume the sibling rule (rules §4).
const sizeStyles: Record<ButtonSize, string> = {
  large: 'h-[48px] px-03 rounded-2xl text-h6',
  small: 'h-[32px] px-02 rounded-xl text-label',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  large: 'size-[24px]',
  small: 'size-[16px]',
};

// Figma's Button/Icon "Arrow" (Iconography library) — embedded as a static
// path rather than an image export so its colour follows currentColor like
// every other token-driven value here, instead of baking one flattened
// asset per state.
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

// Disabled = Default appearance at opacity-disabled (38%), never a colour
// swap — rules §2. Applied once on the root in baseStyles above; no variant
// carries a disabled:bg-*/text-*/border-* override, because the Default
// classes already carry through unchanged, just faded.
//
// Every variant here inherits its surface rather than declaring a mode.
// Secondary in particular no longer sets data-mode="dark" on itself: under
// the 2026-09-07 architecture its border (border-strong) and label
// (text-primary) resolve from whatever surface it sits on, which is exactly
// what the old self-scoping was faking. Pinning it to dark now would render
// a near-white outline on a cream page.
const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-action-primary text-text-on-action',
    'hover:bg-action-primary-hover',
  ),
  secondary: clsx(
    'bg-action-secondary text-text-primary border border-border-strong',
    // Hover tints the fill only — Figma keeps the border at border-strong,
    // 1px, in every state including Hover and Disabled.
    'hover:bg-action-secondary-hover',
  ),
  accent: clsx(
    'bg-action-highlight text-text-on-highlight',
    'hover:bg-action-highlight-hover',
  ),
  link: clsx(
    'bg-action-secondary text-text-link',
    // Figma binds Default/Hover/Focused/Disabled to the same text-link
    // token — there is no brighter hover colour. The underline alone
    // carries hover and focus feedback, matching the component's own
    // Figma description.
    'hover:underline focus-visible:underline',
  ),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'large',
      icon = true,
      type = 'button',
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
      {icon ? <ArrowIcon size={size} /> : null}
    </button>
  ),
);

Button.displayName = 'Button';
