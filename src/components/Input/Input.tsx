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
const baseStyles = clsx(
  'w-full box-border',
  'font-manrope font-normal text-text-primary placeholder:text-text-muted',
  'bg-surface-primary border border-border-default',
  'transition-colors duration-150 ease-out',
  // Figma's Hover variant increases stroke weight from 1px to 1.5px, not just color
  'hover:bg-state-hover hover:border-[1.5px] hover:border-border-subtle',
  'focus:outline-none focus:border-2 focus:border-border-focus',
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-border-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none',
  'disabled:bg-surface-primary disabled:border-state-disabled disabled:placeholder:text-text-muted',
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
