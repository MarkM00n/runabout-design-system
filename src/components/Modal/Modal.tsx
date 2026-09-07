import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

import { ButtonClose } from '../ButtonClose';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  /** Short line under the title. Figma: Manrope/Caption, text-primary. */
  description?: string;
  /** Figma's `Content` slot. */
  children: ReactNode;
  /** Figma's `Footer` slot — the action buttons. Rendered below a divider,
   * right-aligned, with a 16px gap. */
  footer?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}

/**
 * Source: Figma `Modal` (144:459).
 *
 * The one component that fills with `surface-card` rather than
 * `surface-section`, and it pins itself to On Cream. Both facts are the same
 * fact: `surface-card` is Surface/50 in every mode — it does not vary — and
 * `text-primary` only clears AA against that near-white fill in the On Cream
 * column (13.65:1 there, 1.10:1 in the other three). So a modal dropped onto
 * an olive or dark page would render pale ink on near-white without the
 * pinned mode. Figma pins the master identically; this is deliberate, not a
 * mode that was forgotten.
 *
 * Rendered as a real dialog: `role="dialog"` + `aria-modal` + a label
 * association to the title, since Figma's static frame can't express any of
 * that. Focus trapping, scroll locking and backdrop rendering are the
 * caller's job — this is the panel, not a dialog manager.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    { title, description, children, footer, onClose, closeLabel = 'Close', className, id, ...props },
    ref,
  ) => {
    const titleId = `${id ?? 'modal'}-title`;

    return (
      <div
        ref={ref}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-mode="cream"
        className={clsx(
          'flex flex-col w-[480px] max-w-full p-05 gap-04 rounded-xl bg-surface-card',
          className,
        )}
        {...props}
      >
        <div className="flex flex-col gap-02">
          <div className="flex items-start justify-between gap-02">
            <h2 id={titleId} className="font-recoleta font-normal tracking-normal text-h4 text-text-primary m-0">
              {title}
            </h2>
            {onClose ? <ButtonClose label={closeLabel} onClick={onClose} /> : null}
          </div>
          {description ? (
            <p className="font-manrope text-caption text-text-primary m-0">{description}</p>
          ) : null}
        </div>

        {/* Figma draws these as 1px frames stroked with border-default; a
            border-top on a zero-height rule is the same thing without an
            empty box in the accessibility tree. role="presentation" isn't
            needed — a bare <div> carries no role to begin with. */}
        <div aria-hidden="true" className="h-px w-full bg-border-default" />

        <div className="flex flex-col gap-03">{children}</div>

        {footer ? (
          <>
            <div aria-hidden="true" className="h-px w-full bg-border-default" />
            <div className="flex items-center justify-end gap-02">{footer}</div>
          </>
        ) : null}
      </div>
    );
  },
);

Modal.displayName = 'Modal';
