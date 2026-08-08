import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export type InputSize = 'large' | 'small';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
}

// Source: Figma `Input/Text` component set. Figma's mockup shows a static
// "Enter text..." example rather than a real vs. placeholder distinction, so
// this maps the Default/Hover/Disabled text color (text-muted) onto the real
// ::placeholder pseudo-element, and the Focused variant's color (text-primary)
// onto the input's own typed-value color — the two concepts Figma's static
// mockup can't represent simultaneously.
//
// Field fill is action-secondary (transparent) / action-secondary-hover (a
// 10%-alpha tint baked into the token itself) — confirmed live against
// Figma 2026-08-08: it's a bordered "ghost" control with no solid
// background, not a solid white field. Border is border-strong at every
// state except Disabled, which verifiably binds border-default in Figma —
// a real, consistent difference, not a one-off. Hover does NOT change
// border weight or color, only the fill tint (contradicts this file's
// previous assumption).
//
// Focus is an offset outline (border-focus, 2px, offset 2px), not an inset
// border change — the field carries no border at all in Figma's Focused
// variant, replaced entirely by the ring. Disabled is the Default
// appearance at opacity-disabled (38%), not separate colors.
const baseStyles = clsx(
  'w-full box-border',
  'font-manrope font-normal text-text-primary placeholder:text-text-muted',
  'bg-action-secondary border border-border-strong',
  'transition-colors duration-150 ease-out',
  'hover:bg-action-secondary-hover',
  // No outline-none here, on purpose — Tailwind v4 composes its outline
  // utilities through a single shared custom property (--tw-outline-style),
  // so ANY outline-none on the element (even focus:-scoped) pins that
  // property to "none" and focus-visible:outline can never set it back,
  // regardless of source order or specificity. Confirmed live: outline
  // width/color computed correctly, outline-style stayed stuck at "none"
  // until outline-none was removed entirely. Tab.tsx already gets this
  // right — it never had an outline-none in the first place, it doesn't
  // need one, and now neither does this.
  'focus-visible:border-transparent',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-disabled disabled:border-border-default',
);

const sizeStyles: Record<InputSize, string> = {
  // Figma binds radius-2xl (pill) at both sizes — unlike Button, Input's
  // radius does not scale down with size.
  large: 'h-[48px] px-03 rounded-2xl text-h6',
  small: 'h-[32px] px-02 rounded-2xl text-paragraph-small',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'large', type = 'text', className, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={clsx(baseStyles, sizeStyles[size], className)}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
