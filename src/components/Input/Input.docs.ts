import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/Text (141:375).
export const docs: ComponentDocMeta = {
  description:
    'A single-line text field. The base of the Input family — Select, Textarea and Checkbox share its colour, border and state behaviour.',
  usageGuidelines: [
    'Always give the field a visible label above it. A placeholder is not a label: it disappears the moment someone types.',
    'Mark required fields in the label text, not by colour or an asterisk alone.',
    'Put helper text below the field, and error text in the same place so the two never fight for the same spot.',
    'Announce error text to screen readers by wiring aria-describedby and aria-invalid on the input.',
  ],
  dos: [
    'Use size="small" in dense layouts and size="large" (the default) elsewhere. Both keep the same pill radius — unlike Button, the radius does not step down with size.',
    'Let the field stay transparent. It is a bordered ghost control by design, so it picks up whatever surface it sits on.',
  ],
  donts: [
    'Do not wrap the field in a data-mode to force a readable pairing. That was load-bearing when the fill was an opaque cream; now the fill is genuinely transparent, and forcing a mode paints the wrong ink over the real backdrop. This shipped as a real bug once — see CLAUDE.md\'s 2026-08-08 incident.',
    'Do not add outline-none alongside the focus styles. Tailwind v4 shares one custom property across every outline utility, so any outline-none stops the focus ring painting at all.',
    'Do not swap the border colour when disabled. Figma binds border-strong in every state including Disabled; the only difference is opacity.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <input>, so keyboard behaviour, form participation and autofill all come from the platform.',
    'Focus replaces the border with a 2px state-focus outline offset 2px outside the field, matching Figma\'s Focused variant, which draws no border at all. On :focus-visible only.',
    'The placeholder uses text-secondary and the typed value uses text-primary — Figma\'s static mockup shows one string for both, so the two concepts are split here along the real pseudo-element boundary.',
    'Contrast has to be computed against the composited result, not the fill token: action-secondary is fully transparent, so whatever surface sits behind the field is the real background.',
    'Disabled uses the native attribute plus pointer-events-none, rendering the default appearance at 38% opacity. Disabled contrast is exempt under SC 1.4.3.',
    'The small size is 32px tall, which clears SC 2.5.8 (24x24) but not SC 2.5.5 (44x44, AAA).',
  ],
  codeExample:
    '<label htmlFor="email">Email address</label>\n<Input id="email" type="email" placeholder="you@example.com" />',
};
