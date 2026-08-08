import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Checkbox } from '../components/Checkbox';
import { Textarea } from '../components/Textarea';
import { Button } from '../components/Button';

// PROTOTYPE — src/prototypes/, not part of the shipped design system. See
// src/prototypes/README.md / docs/design-system-rules.md §9.
//
// Built without a Figma reference, deliberately: the point is to see what
// the system produces on its own from existing components + tokens, and
// to surface what's genuinely missing along the way. Two things below are
// real gaps, not oversights:
//
// 1. No invalid/error variant exists on Input/Select/Textarea yet. Their
//    Figma descriptions *mention* one ("Error state: state-error message
//    below the field, error border...") but no Error variant was ever
//    actually built, in Figma or in code. This prototype invents the
//    treatment in userland via each component's existing `className`
//    prop — border-state-error is a real, already-registered token
//    (state-* is explicitly sanctioned for boundary/status borders per
//    design-system-rules.md's namespace convention), so this isn't a
//    system gap, just a first real usage of an existing token in a role
//    nothing has needed yet.
// 2. The success confirmation's panel tint IS a real gap — there is no
//    pale/success-tinted surface token in the system (surface-* only has
//    primary/secondary/tertiary/inverse/feature/scrim/card/subtle, none
//    success-toned; state-success itself is a saturated badge-chip fill,
//    not a soft panel background). Flagged inline below with a raw hex,
//    on purpose, so `npm run design-sync`'s Prototypes report catches it.

export type TicketType = 'general' | 'vip' | 'driver';

interface FormValues {
  name: string;
  email: string;
  ticketType: TicketType | '';
  mailingList: boolean;
  dietary: string;
}

const EMPTY_VALUES: FormValues = {
  name: '',
  email: '',
  ticketType: '',
  mailingList: false,
  dietary: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequiredField = 'name' | 'email' | 'ticketType';
type FieldErrors = Partial<Record<RequiredField, string>>;

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.ticketType) errors.ticketType = 'Select a ticket type.';
  return errors;
}

// Overrides border-border-strong with border-state-error when invalid.
// Tailwind v4 resolves two same-property utility classes by *compiled*
// stylesheet order, not source order in the className string — the exact
// footgun that shipped a broken focus ring in PR #70 (see
// design-system-rules.md §2's outline-none note). Using the `!` important
// modifier here makes the override unconditionally win instead of relying
// on Tailwind's internal build order between border-state-error and
// border-border-strong.
const invalidFieldClass = '!border-state-error';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="font-manrope text-label font-semibold text-text-primary">
      {children}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="font-manrope text-caption text-state-error">
      {message}
    </p>
  );
}

export interface VinesAndVinylSignUpProps {
  /** Pre-seeds every required field as touched (and empty), so the error
   * state renders on mount without needing interaction. Only exists for
   * the ErrorState story below — not a prop a consuming app would pass. */
  startTouched?: boolean;
}

// Exported separately from VinesAndVinylSignUp (the full standalone page,
// below) so the combined landing+sign-up prototype can embed just the
// form itself — including its own data-mode="light" scope, load-bearing
// for the same reason noted below — inside a *different* page's Hero,
// without also pulling in this page's own "RUNABOUT EVENTS PRESENTS /
// Vines & Vinyl" chrome, which that other page already has its own copy
// of. Pure extraction: VinesAndVinylSignUp's own rendered output is
// unchanged, it just composes this instead of inlining it.
export const SignUpFormCard = ({ startTouched = false }: VinesAndVinylSignUpProps) => {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Record<RequiredField, boolean>>({
    name: startTouched,
    email: startTouched,
    ticketType: startTouched,
  });
  const [submitted, setSubmitted] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const ticketId = useId();
  const dietaryId = useId();

  // Computed every render off current values — this is what gates the
  // submit button, deliberately NOT gated by `touched`. Button-gating and
  // error-*display* are different concerns: the button needs to know "is
  // this valid right now" continuously, but a field's error text should
  // only appear once the person has actually left that field (validate on
  // blur, not on every keystroke). Once a field HAS been touched, its
  // error text does update live as the value changes — that's the
  // standard "blur to trigger, then live-clear as you fix it" pattern,
  // not a re-litigation of "not on every keystroke" (which is about the
  // first, untouched pass through a field).
  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  const handleBlur = (field: RequiredField) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitted(true);
  };

  const content = submitted ? (
    <div
      role="status"
      className="flex flex-col items-center gap-03 rounded-2xl p-06 text-center"
      // No pale/success-tinted surface token exists in the system (see
      // file header note #2) — every surface-* token is either neutral or
      // a specific brand surface, and state-success is a saturated
      // badge-chip fill, not a soft panel tint. Raw value, flagged on
      // purpose so design-sync's Prototypes report records the gap.
      style={{ backgroundColor: '#f0faf3' }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[48px] w-[48px] text-state-success">
        <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 12.5L10.5 16L17 8.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h2 className="font-recoleta text-h3 text-text-primary">You&rsquo;re on the list!</h2>
      <p className="font-manrope text-paragraph-small text-text-muted">
        We&rsquo;ll email <span className="text-text-primary">{values.email}</span> with tickets and the maker
        lineup before anyone else hears.
      </p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-04">
      <div className="flex flex-col gap-01">
        <h2 className="font-recoleta text-h3 text-text-primary">Join the list</h2>
        <p className="font-manrope text-paragraph-small text-text-muted">
          150 tickets, tastings included. First access goes to the list.
        </p>
      </div>

      <div className="flex flex-col gap-01">
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <Input
          id={nameId}
          size="large"
          placeholder="Your name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          onBlur={handleBlur('name')}
          aria-invalid={touched.name && Boolean(errors.name)}
          aria-describedby={touched.name && errors.name ? `${nameId}-error` : undefined}
          className={touched.name && errors.name ? invalidFieldClass : undefined}
        />
        {touched.name && <FieldError id={`${nameId}-error`} message={errors.name} />}
      </div>

      <div className="flex flex-col gap-01">
        <FieldLabel htmlFor={emailId}>Email</FieldLabel>
        <Input
          id={emailId}
          type="email"
          size="large"
          placeholder="you@email.com"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          onBlur={handleBlur('email')}
          aria-invalid={touched.email && Boolean(errors.email)}
          aria-describedby={touched.email && errors.email ? `${emailId}-error` : undefined}
          className={touched.email && errors.email ? invalidFieldClass : undefined}
        />
        {touched.email && <FieldError id={`${emailId}-error`} message={errors.email} />}
      </div>

      <div className="flex flex-col gap-01">
        <FieldLabel htmlFor={ticketId}>Ticket type</FieldLabel>
        <Select
          id={ticketId}
          size="large"
          value={values.ticketType}
          onChange={(e) => setValues((v) => ({ ...v, ticketType: e.target.value as TicketType }))}
          onBlur={handleBlur('ticketType')}
          aria-invalid={touched.ticketType && Boolean(errors.ticketType)}
          aria-describedby={touched.ticketType && errors.ticketType ? `${ticketId}-error` : undefined}
          className={touched.ticketType && errors.ticketType ? invalidFieldClass : undefined}
        >
          <option value="" disabled hidden>
            Select an option...
          </option>
          <option value="general">General admission</option>
          <option value="vip">VIP — early entry + extra tasting</option>
          <option value="driver">Designated driver — free</option>
        </Select>
        {touched.ticketType && <FieldError id={`${ticketId}-error`} message={errors.ticketType} />}
      </div>

      <Checkbox
        size="large"
        label="Keep me on the mailing list for future events"
        checked={values.mailingList}
        onChange={(e) => setValues((v) => ({ ...v, mailingList: e.target.checked }))}
      />

      <div className="flex flex-col gap-01">
        <FieldLabel htmlFor={dietaryId}>Dietary requirements (optional)</FieldLabel>
        <Textarea
          id={dietaryId}
          size="large"
          placeholder="Let us know about any allergies or dietary needs..."
          value={values.dietary}
          onChange={(e) => setValues((v) => ({ ...v, dietary: e.target.value }))}
        />
      </div>

      <Button type="submit" variant="primary" size="large" disabled={!isValid} className="w-full justify-center">
        Join the list
      </Button>
    </form>
  );

  // Light because the form fields (bordered "ghost" controls, see PR
  // #70/#71/#72's incident history) need an explicit On Light scope to
  // read correctly regardless of whatever mode the page around this card
  // happens to be in — the same pattern src/examples/VinesAndVinylLanding.tsx's
  // Hero Input needed once its stale data-mode="light" override was fixed
  // to sit at the right level: on the card, not hand-tuned per field.
  return (
    <div data-mode="light" className="w-full max-w-[480px] rounded-2xl bg-surface-primary p-06">
      {content}
    </div>
  );
};

// The full standalone page: an outer On Feature band (brand emphasis,
// matching src/examples/VinesAndVinylLanding.tsx's Hero) around the card
// above. Unchanged output from before this file split SignUpFormCard out —
// this is a pure extraction, not a behavior change.
export const VinesAndVinylSignUp = ({ startTouched = false }: VinesAndVinylSignUpProps) => (
  <div
    data-mode="feature"
    className="flex min-h-screen w-full flex-col items-center gap-05 bg-surface-feature px-06 py-09"
  >
    <div className="flex flex-col items-center gap-01 text-center">
      <p className="font-manrope text-label-strong font-semibold text-text-primary">RUNABOUT EVENTS PRESENTS</p>
      <p className="font-recoleta text-h4 text-text-primary">Vines &amp; Vinyl</p>
    </div>
    <SignUpFormCard startTouched={startTouched} />
  </div>
);
