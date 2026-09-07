import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

export type SelectSize = 'large' | 'small';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize;
}

// Source: Figma Input/Dropdown (141:358). Same shape as Input/Text with a
// chevron added — implemented as a wrapper plus an appearance-none select
// rather than literal flex children, since <select> can't contain arbitrary
// layout children the way Figma's frame does.
//
// Known gap vs Figma: a native <select> has no ::placeholder equivalent, so
// Input's Default-vs-Focused colour split isn't reproducible here without
// giving up the native listbox. Text is text-primary throughout; pass a
// disabled, selected placeholder <option> for the "no selection" state.
//
// Colours, border and state behaviour are identical to Input — see
// Input.tsx's comment for the full reasoning, including why border-strong
// stays bound in the Disabled state.
const baseStyles = clsx(
  'w-full box-border appearance-none',
  'font-manrope font-normal text-text-primary',
  'bg-action-secondary border border-border-strong',
  'transition-colors duration-150 ease-out',
  'hover:bg-action-secondary-hover',
  'focus-visible:border-transparent',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus',
  'disabled:cursor-not-allowed disabled:pointer-events-none',
);

const sizeStyles: Record<SelectSize, string> = {
  // Right padding reserves room for the chevron (icon width + gap + the
  // normal edge padding), since it's an absolutely-positioned overlay rather
  // than the true flex sibling Figma models.
  large: 'h-[48px] pl-03 pr-[48px] rounded-2xl text-h6',
  small: 'h-[32px] pl-02 pr-[32px] rounded-2xl text-paragraph-small',
};

// Arbitrary px, not Tailwind's h-4/w-4 scale — rem-based utilities scale off
// this app's 18px root font-size. Figma: 16px at large, 12px at small.
const chevronPosition: Record<SelectSize, string> = {
  large: 'right-03 h-[16px] w-[16px]',
  small: 'right-02 h-[12px] w-[12px]',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'large', className, children, ...props }, ref) => (
    // has-[select:disabled], not has-[:disabled] — real bug, confirmed live
    // 2026-08-08: :has(:disabled) matches ANY disabled descendant, including
    // a perfectly normal `<option disabled>` placeholder, which is the
    // standard convention for this control. That silently rendered every
    // such Select at opacity-disabled regardless of its own state. Scoping
    // the :has() to the select element itself fixes it.
    <div className="relative inline-block w-full has-[select:disabled]:opacity-disabled">
      <select
        ref={ref}
        className={clsx(baseStyles, sizeStyles[size], className)}
        {...props}
      >
        {children}
      </select>
      {/* text-text-primary, not the retired icon-primary: the icon-* group
          was removed in the 2026-09-07 sync and icons bind the matching
          text-* token. Figma binds this vector to text/primary directly. */}
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
