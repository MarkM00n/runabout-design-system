import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export type InputSize = 'large' | 'small';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
}

// Source: Figma Input/Text (141:375). Figma's mockup shows a single static
// "Enter text..." string rather than a real value-vs-placeholder
// distinction, so the Default/Hover/Disabled colour (text-secondary) maps
// onto the real ::placeholder pseudo-element and the Focused variant's
// colour (text-primary) onto the input's own typed-value colour — the two
// concepts one static mockup can't show at once.
//
// The field fill is action-secondary: genuinely transparent (Alpha/White-0),
// not white. It's a bordered "ghost" control that lets its surface show
// through, which is why it needs no mode of its own and why contrast has to
// be computed against the composited result, never against the fill token.
//
// Border is border-strong at 1px in EVERY state, Disabled included —
// re-verified against Figma 2026-09-07. This corrects a real drift: the code
// previously swapped to border-default when disabled, which Figma has never
// done under this architecture. Disabled is the Default appearance at
// opacity-disabled, nothing else.
//
// Focus replaces the border entirely with an offset ring: Figma's Focused
// variant draws no border on the field at all, just the focus-ring frame 2px
// clear of it. No outline-none anywhere — see rules §2 for why even a
// focus-scoped one would permanently kill the outline.
const baseStyles = clsx(
  'w-full box-border',
  'font-manrope font-normal text-text-primary placeholder:text-text-secondary',
  'bg-action-secondary border border-border-strong',
  'transition-colors duration-150 ease-out',
  'hover:bg-action-secondary-hover',
  'focus-visible:border-transparent',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-disabled',
);

const sizeStyles: Record<InputSize, string> = {
  // Figma binds radius-2xl at BOTH sizes — unlike Button, whose radius steps
  // down to radius-xl at small. Don't assume the sibling rule (rules §4).
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
