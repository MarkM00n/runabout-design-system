import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Sign-up form (1490:546, page 02. Components).
export const docs: ComponentDocMeta = {
  description:
    'An email sign-up block for event landing pages: a lead-in, an email field and a submit button, with Submitting, Success and Error states built in. It validates the address itself and hands it to an `onSubmit` function you supply, so it works with any mailing-list provider.',
  usageGuidelines: [
    'Pass `onSubmit` as a function that takes the email and returns a promise. Resolve it when the address is stored; reject it (throw) on any failure — network, 4xx or 5xx — and the form shows its retry message. Keep provider details (field names, auth, double opt-in) behind that function or the endpoint it calls.',
    'Place it on a surface. It has no background and never sets a mode, so it resolves its text, field and button from the nearest `data-mode` and `data-brand`, like the hero it was designed for (On Brand).',
    'Change the words with props: `leadIn`, `submitLabel`, `submittingLabel`, `successHeading`, `successBody` and `errorMessages`. `leadIn` takes any inline content, so a page can colour a phrase with `text-text-accent`.',
    'Give it the width of its column. The field and button share a row up to Figma\'s 591px and stack, each full width, once the row is too narrow for both — from the content, not a breakpoint.',
    'Use `initialState` and `initialError` only to pin a state for stories and snapshots. A real page starts at Default.',
  ],
  dos: [
    'Write a lead-in that says what the visitor gets for signing up. It is also the form\'s accessible name.',
    'Keep the success copy specific about what happens next — what will arrive, and where to look for it.',
    'Success shows as a light notice card (its own `data-mode="light"`, `surface-section`, `radius-2xl`), so it reads the same on any surface the form sits on. Don\'t add a mode or fill around it.',
    'Throw from `onSubmit` on any non-2xx response, so a failed request never reads as success.',
  ],
  donts: [
    'Do not set `data-mode` on the form or on a wrapper with no background of its own. Put it on the section it sits in.',
    'Do not colour the error or success message with a status colour. The message stays `text-primary`; the dot beside it is the only status colour, and it is supplementary.',
    'Do not add a second validation layer with the browser\'s own bubbles. The form is `noValidate` on purpose, so the Error state is the one place a problem is shown.',
    'Do not make `onSubmit` resolve before the address is actually accepted. Success replaces the form; there is no way back to it without reloading.',
  ],
  variants: ['default', 'submitting', 'success', 'error · invalid', 'error · failed'],
  states: ['default', 'submitting', 'success', 'error', 'focus'],
  accessibilityNotes: [
    'The whole block is `aria-live="polite"`, so the error message, the Joining… label and the success copy are announced as they appear.',
    'The form is named by its lead-in (`aria-labelledby`); the field, which has no visible label, is named by `inputLabel` (default "Email address").',
    'An invalid address keeps the typed value, puts focus back in the field, and sets `aria-invalid` with `aria-describedby` pointing at the message. A failed submit shows its message the same way but does not set `aria-invalid` — the address was not the problem.',
    'On success, focus moves to the confirmation heading, which draws the standard 2px `state-focus` ring offset 2px. Focus only ever moves after a real submit, never when the form first renders.',
    'Submitting disables the button (Button\'s Disabled treatment, 38% `opacity-disabled`) and makes the field read-only, so a second submit cannot be sent; `aria-busy` is set on the form meanwhile.',
    'Status dots are decorative (`aria-hidden`); the message beside each carries the meaning in `text-primary`. On some surfaces the dot measures low against the ground — about 1.1–1.2:1 on On Brand — which is reported to design and does not affect the message\'s own contrast.',
    'Fades on the error message and success block respect `prefers-reduced-motion`: with it set they simply appear.',
  ],
  codeExample:
    '<section data-mode="brand" className="bg-surface-section">\n  <SignupForm\n    onSubmit={async (email) => {\n      const res = await fetch("/api/signup", { method: "POST", body: JSON.stringify({ email }) });\n      if (!res.ok) throw new Error("Sign-up failed");\n    }}\n  />\n</section>',
};
