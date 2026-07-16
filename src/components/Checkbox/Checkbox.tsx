import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export type CheckboxSize = 'large' | 'small';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: CheckboxSize;
  label: string;
}

// Source: Figma `Input/Checkbox` component set. The real <input> is visually
// hidden (sr-only) but stays in the DOM and keyboard/focus-operable — the
// box and checkmark are decorative siblings driven off it via `peer-*`
// selectors, which is how you get a custom-styled checkbox without losing
// native semantics/accessibility. Figma's Disabled variant recolors both the
// checkmark and the label to text-muted (not just the box), which the
// disabled: modifiers below preserve.
// Arbitrary px, not Tailwind's h-6/w-6 scale — rem-based utilities scale off
// this app's 18px root font-size (see tokens.css), which would render this
// at 27px instead of 24px.
const boxStyles: Record<CheckboxSize, string> = {
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
          'inline-flex items-center cursor-pointer select-none',
          'has-[:disabled]:cursor-not-allowed',
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
            'border border-border-default bg-surface-primary',
            'transition-colors duration-150 ease-out',
            'peer-hover:bg-state-hover peer-hover:border-[1.5px] peer-hover:border-border-subtle',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent peer-focus-visible:ring-border-focus peer-focus-visible:border-2 peer-focus-visible:border-border-focus',
            'peer-disabled:bg-surface-primary peer-disabled:border-state-disabled',
            boxStyles[size],
          )}
        >
          {/* This svg is nested inside the box span, not a direct sibling of
              the input, so Tailwind's sibling-based `peer-*` can't reach it —
              using explicit ancestor-`:has()` arbitrary variants instead,
              scoped per-instance via normal DOM ancestry through the nearest
              <label>. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 14 11"
            fill="none"
            className="h-[65%] w-[65%] opacity-0 text-text-highlight [label:has(:checked)_&]:opacity-100 [label:has(:disabled)_&]:text-text-muted"
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
            'font-tt-norms font-normal text-text-inverse peer-disabled:text-text-muted',
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
