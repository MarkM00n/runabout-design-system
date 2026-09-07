import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonCloseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name. Required by the component's own Figma description
   * ("Must carry an accessible label") — an icon-only control has no text
   * for a screen reader to announce otherwise. */
  label?: string;
}

/**
 * Source: Figma `Button/Close` (146:475). Icon-only dismiss control for
 * modals, banners and overlays.
 *
 * Figma draws a 32x32 control. Its own description asks for "minimum 44x44px
 * touch target regardless of visual size", so the visual box stays 32px and
 * the target grows to 44px via a transparent inset pseudo-element — the
 * footprint in layout is unchanged, matching Figma, while the tappable area
 * clears the stated house rule. Note 32x32 already clears the actual AA bar
 * (SC 2.5.8, 24x24); 44px is SC 2.5.5, which is AAA and not what this system
 * tests against — this is the component's own documented preference, not a
 * WCAG AA requirement.
 */
export const ButtonClose = forwardRef<HTMLButtonElement, ButtonCloseProps>(
  ({ label = 'Close', type = 'button', className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={clsx(
        'relative inline-flex items-center justify-center shrink-0',
        'h-[32px] w-[32px] rounded-2xl',
        'bg-action-secondary text-text-primary',
        'transition-colors duration-150 ease-out',
        'hover:bg-action-secondary-hover',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus',
        'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-disabled',
        // 44x44 touch target centred on the 32x32 visual box, without
        // changing the box's own size or the layout around it.
        'before:absolute before:left-1/2 before:top-1/2 before:h-[44px] before:w-[44px]',
        'before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""]',
        className,
      )}
      {...props}
    >
      {/* 16px glyph inside Figma's 24px icon frame. currentColor so it
          follows text-primary through whatever surface the modal sets. */}
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-[16px] w-[16px]">
        <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  ),
);

ButtonClose.displayName = 'ButtonClose';
