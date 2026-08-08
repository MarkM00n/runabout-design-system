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
// native semantics/accessibility.
//
// Box fill is action-secondary (transparent) / action-secondary-hover (a
// 10%-alpha tint baked into the token itself) — confirmed live against
// Figma 2026-08-08, same family as Input/Select/Textarea. Box border is
// border-strong at 1px (Default/Focused), 1.5px on Hover — Checkbox is the
// one Input-family control that DOES thicken its border on hover, verified
// directly, not shared with the field-based controls. Disabled binds
// border-default, not border-strong.
//
// Checkmark and label stay text-highlight/text-primary in every state,
// including Disabled — confirmed directly against Figma's Disabled+Checked
// variant. The old assumption that Disabled recolors the checkmark/label to
// text-muted was true pre-2026-08-05; that fill-swap pattern is retired in
// favor of opacity-disabled (38%) on the whole control, which is what
// actually differs now.
//
// Focus is an offset outline on the box itself (border-focus, 2px, offset
// 2px) — matches the box's own border weight/color exactly, unchanged, per
// the same offset-ring pattern Input/Select/Textarea use via their focus
// ring overlay.
//
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
          // items-start, not items-center — real gap, found 2026-08-08 via
          // a prototype using a genuinely long label for the first time.
          // items-center mathematically centers the box against the
          // label's FULL height (verified: box center landed exactly on
          // the midpoint of a 2-line block), which is correct per the flex
          // spec but reads as top-heavy/unbalanced once a label wraps — the
          // box ends up beside line 1 with line 2 floating underneath it.
          // items-start aligns the box with the first line's cap-height
          // instead, the conventional checkbox treatment for wrapping
          // labels. Every existing Checkbox story/doc uses a short,
          // single-line label, where the two produce a visually identical
          // result (line-height 24.3px vs. box height 24px, a ~0.15px
          // difference) — this never had a case to expose the gap before.
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
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-focus',
            'peer-disabled:border-border-default',
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
            className="h-[65%] w-[65%] opacity-0 text-text-highlight [label:has(:checked)_&]:opacity-100"
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
            // text-primary throughout, including Disabled — confirmed
            // directly against Figma, label doesn't recolor when disabled,
            // opacity-disabled (applied on the outer <label>) does that work.
            // Checkbox is mode-aware like every other Input-family control:
            // it resolves correctly under whatever data-mode its container
            // sets, including none (On Light default).
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
