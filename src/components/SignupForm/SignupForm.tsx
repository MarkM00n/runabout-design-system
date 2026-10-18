import type { FormEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

import { Button } from '../Button';
import { Input } from '../Input';
import { isPlausibleEmail } from './email';

// Source: Figma Sign-up form (1490:546, page 02. Components), State =
// Default / Submitting / Success / Error. Promoted from the Vines & Vinyl
// landing page's page-local block (PR #106), whose behaviour it keeps.
//
// No surface of its own, so no data-mode: it inherits whatever it sits on,
// which is what its Figma description asks for. Every colour is a mode-
// resolved token except the status dots, below.
//
// Behaviour, from the Figma description:
//   - Validated here before anything is sent, with isPlausibleEmail
//     (./email.ts) — the same rule the Vines & Vinyl /api/subscribe function
//     applies server-side. The form is noValidate so the browser's own bubble
//     never shows instead of the Error state.
//   - Submitting: the button is disabled (Button's own Disabled treatment,
//     opacity-disabled at its root — Figma swaps in Button State=Disabled)
//     and reads "Joining…". The field goes read-only rather than disabled, so
//     it keeps its full-strength appearance, as Figma's Submitting draws it.
//   - Success replaces the lead-in and form in place with a light notice
//     card (its own data-mode="light"). Its default copy is
//     for a single opt-in list ("You’re on the list." / a welcome email is on
//     its way), as Figma's State=Success reads; a list that makes people
//     confirm by email should pass successHeading/successBody telling them
//     to. Focus moves to its heading. Error keeps the field's
//     value and puts focus back in it.
//   - A hidden honeypot field catches form-filling bots without a CAPTCHA:
//     if it's filled, the form shows Success and sends nothing.
//   - The whole block is aria-live="polite", so the error message, the
//     Submitting label and the success copy are announced as they appear.
//   - Focus moves only after a real submit, never on first render, so an
//     instance that opens in Success or Error doesn't scroll to the form.
//
// Error has two messages. Figma draws the validation one. A failed submit
// (onSubmit rejected: network, 4xx, 5xx) is the same state with retry copy,
// and is not the field's fault, so it doesn't set aria-invalid.
//
// Status dots: state/success and state/error fills under text/on-state, as
// Figma binds them. The message beside the dot carries the meaning, in
// text-primary, so the dot is supplementary (status colours as fills only —
// rules §7). On some surfaces — On Brand especially, ~1.1–1.2:1 — the dot
// itself is barely distinguishable from the ground; that's reported to
// design, and nothing depends on seeing it. Dot sizes and radii aren't bound
// in Figma, so they're literal.
//
// Layout: Figma draws the desktop width, a 591px Email capture row (400px
// field + gap + 175px button; a hugging frame, so a literal). Here the row
// wraps from content, not a breakpoint: the field's huge grow factor keeps
// the button at its natural width while they share a row; once the row can't
// hold the field's 240px basis plus the button, each takes its own line and
// fills it — the stacked layout the description mentions for mobile.

export type SignupFormState = 'default' | 'submitting' | 'success' | 'error';
export type SignupFormErrorKind = 'invalid' | 'failed';

export interface SignupFormProps {
  /** Sends the address. Resolve on success; reject (throw) on any failure
   *  and the form shows the `failed` error. The component never talks to a
   *  provider itself. */
  onSubmit: (email: string) => Promise<unknown>;
  /** Line above the field. Also the form's accessible name. */
  leadIn?: ReactNode;
  /** Accessible name of the email field (there's no visible label; the
   *  lead-in names the form). */
  inputLabel?: string;
  placeholder?: string;
  submitLabel?: ReactNode;
  submittingLabel?: ReactNode;
  successHeading?: ReactNode;
  successBody?: ReactNode;
  /** Message per error kind. Overrides merge with the defaults. */
  errorMessages?: Partial<Record<SignupFormErrorKind, ReactNode>>;
  /** State to open in. For stories and snapshots; real use starts at
   *  `default`. Opening in a state never moves focus. */
  initialState?: SignupFormState;
  /** Which message to show when opening in `error`. */
  initialError?: SignupFormErrorKind;
  className?: string;
}

const DEFAULT_ERROR_MESSAGES: Record<SignupFormErrorKind, ReactNode> = {
  invalid: "That email doesn't look right — check it and try again.",
  failed: 'Something went wrong — try again in a moment.',
};


// Appearing content fades in over duration-standard; with reduced motion it
// just appears. @starting-style, so no keyframes are needed.
const appear =
  'transition-opacity duration-[var(--duration-standard)] ease-standard starting:opacity-0 motion-reduce:transition-none';

const StatusDot = ({ tone, glyph, size }: { tone: 'success' | 'error'; glyph: string; size: 20 | 28 }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'flex shrink-0 items-center justify-center rounded-full font-manrope text-label-strong font-semibold text-text-on-state',
      tone === 'success' ? 'bg-state-success' : 'bg-state-error',
      size === 28 ? 'h-[28px] w-[28px]' : 'h-[20px] w-[20px]',
    )}
  >
    {glyph}
  </span>
);

export const SignupForm = ({
  onSubmit,
  leadIn = 'Join the list and be first to grab an early bird — strictly limited.',
  inputLabel = 'Email address',
  placeholder = 'you@email.com',
  submitLabel = 'Join the list',
  submittingLabel = 'Joining…',
  successHeading = 'You’re on the list.',
  successBody = 'A welcome email is on its way. We’ll be in touch the moment early birds go live.',
  errorMessages,
  initialState = 'default',
  initialError = 'invalid',
  className,
}: SignupFormProps) => {
  const promptId = useId();
  const errorId = useId();
  const [state, setState] = useState<SignupFormState>(initialState);
  const [errorKind, setErrorKind] = useState<SignupFormErrorKind>(initialError);
  const [focusRequest, setFocusRequest] = useState<{ target: 'field' | 'heading' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);

  // After the render that shows the new state, so the field's
  // aria-describedby already points at the message when focus lands. A new
  // object per request, so a second identical failure still refocuses.
  useEffect(() => {
    if (!focusRequest) return;
    (focusRequest.target === 'heading' ? headingRef : inputRef).current?.focus();
  }, [focusRequest]);

  const fail = (kind: SignupFormErrorKind) => {
    setErrorKind(kind);
    setState('error');
    setFocusRequest({ target: 'field' });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'submitting') return;
    const email = inputRef.current?.value.trim() ?? '';
    if (!isPlausibleEmail(email)) {
      fail('invalid');
      return;
    }
    setState('submitting');
    try {
      // Honeypot: people never see or reach this field, form-filling bots
      // tend to fill it. A filled trap gets the normal Success state but
      // nothing is sent, so a bot learns nothing.
      if (!trapRef.current?.value) await onSubmit(email);
      setState('success');
      setFocusRequest({ target: 'heading' });
    } catch {
      fail('failed');
    }
  };

  const isError = state === 'error';
  const message = { ...DEFAULT_ERROR_MESSAGES, ...errorMessages }[errorKind];

  return (
    <div aria-live="polite" className={clsx('flex w-full flex-col items-center gap-02', className)}>
      {state === 'success' ? (
        // Figma's Success "Notice": a light card the full width of the form —
        // it has a background, so it owns its mode (data-mode="light") and
        // reads the same on any surface the form sits on. surface-section
        // fill, radius-2xl, spacing-03/04 padding; 28px dot beside a text
        // column that fills the rest, top-aligned.
        <div
          data-mode="light"
          className={clsx('flex w-full max-w-[591px] items-start gap-02 rounded-2xl bg-surface-section px-04 py-03 text-left', appear)}
        >
          <StatusDot tone="success" glyph="✓" size={28} />
          <div className="flex min-w-0 flex-1 flex-col gap-01">
            {/* Figma "Manrope/Paragraph Large Bold" = paragraph-large + bold. */}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="m-0 font-manrope text-paragraph-large font-bold text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus"
            >
              {successHeading}
            </h2>
            <p className="m-0 font-manrope text-paragraph-small text-text-secondary">{successBody}</p>
          </div>
        </div>
      ) : (
        <>
          <p id={promptId} className="m-0 text-center font-manrope text-paragraph-large font-bold text-text-primary">
            {leadIn}
          </p>
          <form
            aria-labelledby={promptId}
            aria-busy={state === 'submitting'}
            noValidate
            className="flex w-full max-w-[591px] flex-wrap gap-02"
            onSubmit={handleSubmit}
          >
            <div className="flex-[999_1_240px]">
              <Input
                ref={inputRef}
                type="email"
                name="email"
                size="large"
                placeholder={placeholder}
                aria-label={inputLabel}
                autoComplete="email"
                required
                readOnly={state === 'submitting'}
                // Invalid only when the address is: a failed submit isn't the
                // field's fault, so it gets the message but not the flag.
                aria-invalid={(isError && errorKind === 'invalid') || undefined}
                aria-describedby={isError ? errorId : undefined}
              />
            </div>
            {/* Honeypot (see handleSubmit). Off-screen rather than display:none
                so bots still see it; hidden from assistive tech and the tab
                order, and autofill is off so password managers skip it. */}
            <input
              ref={trapRef}
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
            />
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={state === 'submitting'}
              className="flex-[1_0_auto]"
            >
              {state === 'submitting' ? submittingLabel : submitLabel}
            </Button>
          </form>
          {isError ? (
            // Figma's Error message row: 20px dot and a Label message,
            // centred under the field.
            <p id={errorId} className={clsx('m-0 flex items-center gap-01 text-left', appear)}>
              <StatusDot tone="error" glyph="!" size={20} />
              <span className="font-manrope text-label text-text-primary">{message}</span>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};
