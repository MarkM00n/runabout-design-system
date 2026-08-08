import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export type TextareaSize = 'large' | 'small';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: TextareaSize;
}

// Source: Figma `Input/TextBox` component set. Same color/border/state
// pattern as Input and Select, but with padding on all four sides (Input
// only pads horizontally) and a fixed starting height matching Figma's
// 120px/80px instances. Figma has no concept of resize behavior; `resize-y`
// is a deliberate addition for standard textarea UX, not a Figma binding.
//
// Field fill is action-secondary (transparent) / action-secondary-hover (a
// 10%-alpha tint baked into the token itself) — confirmed live against
// Figma 2026-08-08, same verified spec as Input/Select. Border is
// border-strong except Disabled, which binds border-default. Hover does
// not change border weight or color, only the fill tint.
//
// Focus is an offset outline (border-focus, 2px, offset 2px) — the field
// carries no border at all in Figma's Focused variant. Disabled is the
// Default appearance at opacity-disabled (38%), not separate colors.
const baseStyles = clsx(
  'w-full box-border resize-y',
  'font-manrope font-normal text-text-primary placeholder:text-text-muted',
  'bg-action-secondary border border-border-strong',
  'transition-colors duration-150 ease-out',
  'hover:bg-action-secondary-hover',
  // No outline-none here — see Input.tsx's comment on this exact class:
  // Tailwind v4's outline utilities share one custom property
  // (--tw-outline-style), so any outline-none permanently pins it to
  // "none" and focus-visible:outline can never set it back.
  'focus-visible:border-transparent',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:resize-none disabled:opacity-disabled disabled:border-border-default',
);

const sizeStyles: Record<TextareaSize, string> = {
  large: 'h-[120px] p-03 rounded-2xl text-h6',
  small: 'h-[80px] p-02 rounded-2xl text-paragraph-small',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ size = 'large', className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx(baseStyles, sizeStyles[size], className)}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
