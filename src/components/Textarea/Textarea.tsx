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
const baseStyles = clsx(
  'w-full box-border resize-y',
  'font-manrope font-normal text-text-primary placeholder:text-text-muted',
  'bg-surface-primary border border-border-default',
  'transition-colors duration-150 ease-out',
  'hover:bg-state-hover hover:border-[1.5px] hover:border-border-subtle',
  'focus:outline-none focus:border-2 focus:border-border-focus',
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-border-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:resize-none',
  'disabled:bg-surface-primary disabled:border-state-disabled disabled:placeholder:text-text-muted',
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
