import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

export type SelectSize = 'large' | 'small';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize;
}

// Source: Figma `Input/Dropdown` component set. Same shape as `Input` (Text)
// with a chevron icon added — implemented as a wrapper + appearance-none
// select rather than literal flex children, since <select> can't contain
// arbitrary layout children the way Figma's frame does.
//
// Known gap vs. Figma: native <select> has no ::placeholder equivalent, so
// the Default/Hover/Disabled "text-muted" vs. Focused "text-primary" color
// split that Input reconstructs isn't replicable here without a non-native
// listbox. Text color is text-primary throughout — pass a disabled, selected
// placeholder <option> for the "no selection" UX instead.
const baseStyles = clsx(
  'w-full box-border appearance-none',
  'font-manrope font-normal text-text-primary',
  'bg-surface-primary border border-border-default',
  'transition-colors duration-150 ease-out',
  'hover:bg-state-hover hover:border-[1.5px] hover:border-border-subtle',
  'focus:outline-none focus:border-2 focus:border-border-focus',
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-border-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none',
  'disabled:bg-surface-primary disabled:border-state-disabled disabled:text-text-muted',
);

const sizeStyles: Record<SelectSize, string> = {
  // Right padding reserves space for the chevron (icon width + gap + the
  // normal edge padding) since it's an absolutely-positioned overlay, not a
  // true flex sibling the way Figma models it.
  large: 'h-[48px] pl-03 pr-[48px] rounded-2xl text-h6',
  small: 'h-[32px] pl-02 pr-[32px] rounded-2xl text-paragraph-small',
};

// Arbitrary px, not Tailwind's h-4/w-4 scale — see the height note above.
const chevronPosition: Record<SelectSize, string> = {
  large: 'right-03 h-[16px] w-[16px]',
  small: 'right-02 h-[12px] w-[12px]',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'large', className, children, ...props }, ref) => (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        className={clsx(baseStyles, sizeStyles[size], className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 8 4"
        fill="none"
        className={clsx(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-text-primary',
          chevronPosition[size],
        )}
      >
        <path d="M1 1L4 3.5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ),
);

Select.displayName = 'Select';
