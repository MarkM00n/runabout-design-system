import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export type CheckboxSize = 'large' | 'small';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: CheckboxSize;
  label: string;
}

// Source: Figma Input/Checkbox (141:449). The real <input> is visually hidden
// (sr-only) but stays in the DOM and keyboard-operable — the box and
// checkmark are decorative siblings driven off it via `peer-*`, which is how
// you get a custom-styled checkbox without losing native semantics.
//
// Box fill is action-secondary (transparent) / action-secondary-hover on
// hover. Border is border-strong at 1px, thickening to 1.5px on hover —
// Checkbox is the one Input-family control that does change border weight on
// hover, verified directly rather than assumed from its siblings (rules §4).
//
// The checkmark binds text-link (Figma: text/link on the ✓ glyph), which
// absorbed the retired text-highlight. The label is text-primary in every
// state including Disabled — the control dims as a whole, the label doesn't
// recolour.
//
// Disabled applies opacity-disabled ONCE, on the outer label — the rule in
// rules §2, and now also what Figma does. Its four Disabled variants used to
// bind opacity/disabled on the variant root AND again on the `box` child,
// which multiplied to ~14% on the box while its own label sat at 38%. Found
// during the 2026-09-07 sync and fixed in Figma in the same change (nodes
// 141:415 / 141:418 / 141:443 / 141:446 unbound and restored to 100%,
// leaving the binding on each variant root). Verified after: the box and its
// label now render at identical ink weight.
const boxStyles: Record<CheckboxSize, string> = {
  // Arbitrary px, not Tailwind's size-6 scale — rem-based utilities scale off
  // this app's 18px root font-size and would render 24px as 27px.
  large: 'h-[24px] w-[24px] rounded-sm',
  small: 'h-[18px] w-[18px] rounded-sm',
};

const labelTextStyles: Record<CheckboxSize, string> = {
  large: 'text-h6',
  small: 'text-paragraph-small',
};

const gapStyles: Record<CheckboxSize, string> = {
  large: 'gap-01',
  small: 'gap-00',
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ size = 'large', label, className, id, ...props }, ref) => {
    const generatedId = id ?? `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
      <label
        htmlFor={generatedId}
        className={clsx(
          // items-start, not items-center — found 2026-08-08 with a genuinely
          // long label. items-center centres the box against the label's FULL
          // height, correct per the flex spec but top-heavy once a label
          // wraps: the box lands beside line 1 with line 2 floating under it.
          // items-start aligns it to the first line's cap-height instead.
          'inline-flex items-start cursor-pointer select-none',
          'has-[:disabled]:cursor-not-allowed has-[:disabled]:pointer-events-none has-[:disabled]:opacity-disabled',
          gapStyles[size],
          className,
        )}
      >
        <input
          ref={ref}
          id={generatedId}
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className={clsx(
            'relative inline-flex flex-none items-center justify-center box-border',
            'border border-border-strong bg-action-secondary',
            'transition-colors duration-150 ease-out',
            'peer-hover:bg-action-secondary-hover peer-hover:border-[1.5px]',
            // Figma's focus-ring is 32x32 around the 24px box with a
            // radius-md corner — a 2px outline offset 2px, same recipe as
            // every other control (rules §2).
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-state-focus',
            boxStyles[size],
          )}
        >
          {/* This svg is nested inside the box span rather than being a
              direct sibling of the input, so Tailwind's sibling-based peer-*
              can't reach it — an explicit ancestor :has() variant scoped
              through the nearest <label> does the job instead. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 14 11"
            fill="none"
            className="h-[65%] w-[65%] opacity-0 text-text-link [label:has(:checked)_&]:opacity-100"
          >
            <path
              d="M1 5.5L5 9.5L13 1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span
          className={clsx(
            // text-primary throughout, Disabled included — the label doesn't
            // recolour; opacity-disabled on the outer <label> does that work.
            // Like every other Input-family control, Checkbox inherits its
            // surface and never declares a mode of its own.
            'font-manrope font-normal text-text-primary',
            labelTextStyles[size],
          )}
        >
          {label}
        </span>
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
