import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

// Source: Figma Tab (288:609), States Default/Hover/Active/Disabled/Focus.
//
// Two bindings changed in the 2026-09-07 sync and both were previously
// approximations, not exact matches:
// - Label is Manrope/Paragraph Small (15px), not Manrope/Label (13px). The
//   old text-label was carried over from Button and never checked against
//   Tab's own text style.
// - The active indicator binds border/strong, not the retired
//   icon-interactive. It reads as the same ink as the label, which is the
//   point: the indicator is an emphasised rule, not an accent colour.
//
// Focus is an offset outline, radius-md on the ring (Figma's focus-ring is
// 102x51 around a 94x43 tab — 2px stroke, 2px clear of the control). No
// outline-none anywhere, for the reason rules §2 spells out.
const baseStyles = clsx(
  'group inline-flex flex-col items-start gap-01 px-02 pt-01 pb-0 rounded-sm',
  'font-manrope font-normal text-paragraph-small text-text-primary truncate',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus',
  'disabled:opacity-disabled disabled:cursor-not-allowed disabled:pointer-events-none',
);

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ selected = false, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      className={clsx(baseStyles, className)}
      {...props}
    >
      <span className="truncate">{children}</span>
      <span
        aria-hidden="true"
        className={clsx(
          // 2px, radius-xs — arbitrary px because Tailwind's h-0.5 is
          // rem-based and would render 2.25px at this app's 18px root.
          'block h-[2px] w-full shrink-0 rounded-xs',
          'group-hover:bg-border-strong',
          selected && !disabled ? 'bg-border-strong' : 'bg-transparent',
        )}
      />
    </button>
  ),
);

Tab.displayName = 'Tab';
