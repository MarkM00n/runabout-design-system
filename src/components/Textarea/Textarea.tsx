import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export type TextareaSize = 'large' | 'small';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: TextareaSize;
}

// Source: Figma Input/TextBox (141:392). Same colour, border and state
// pattern as Input and Select — transparent action-secondary fill,
// border-strong at 1px in every state including Disabled, hover tinting the
// fill only, focus replacing the border with an offset ring. See Input.tsx
// for the full reasoning on each; the only differences here are padding on
// all four sides (Input pads horizontally only) and a fixed starting height
// matching Figma's 120px/80px instances.
//
// `resize-y` is a deliberate addition for standard textarea UX, not a Figma
// binding — Figma has no concept of resize behaviour.
const baseStyles = clsx(
  'w-full box-border resize-y',
  'font-manrope font-normal text-text-primary placeholder:text-text-secondary',
  'bg-action-secondary border border-border-strong',
  'transition-colors duration-150 ease-out',
  'hover:bg-action-secondary-hover',
  'focus-visible:border-transparent',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:resize-none disabled:opacity-disabled',
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
