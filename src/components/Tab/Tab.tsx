import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

// Code-side token names are pre-mode-architecture (CLAUDE.md's disclosed
// gap, pending sync) — mapped here to their closest current equivalent by
// role, not name:
// - text/primary  -> text-primary  (exact hex match, #2f2c28)
// - border/focus  -> border-focus  (same role; live Figma value has since
//   drifted to a different blue than the code token, expected until sync)
// - icon/interactive -> text-highlight (#88570a) — confirmed against a
//   live screenshot: the indicator renders as a dark muted amber, not
//   action-highlight's bright orange (#df8e10).
const baseStyles = clsx(
  'group inline-flex flex-col items-start gap-01 px-02 pt-01 pb-0 rounded-sm',
  'font-manrope font-normal text-label text-text-primary truncate',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
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
          'block h-[2px] w-full shrink-0 rounded-xs',
          'group-hover:bg-text-highlight',
          selected && !disabled ? 'bg-text-highlight' : 'bg-transparent',
        )}
      />
    </button>
  ),
);

Tab.displayName = 'Tab';
