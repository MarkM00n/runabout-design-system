import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Badge (248:437).
export const docs: ComponentDocMeta = {
  description:
    'A short status label — neutral, success, warning or error — for showing state at a glance. Non-interactive; it never carries an action.',
  usageGuidelines: [
    'Use it to surface state next to or inside other content, not as a clickable control.',
    'Keep the label to a single short word or phrase — text truncates at one line rather than wrapping.',
    'Pick the variant that matches the underlying state, or neutral for anything that is not success, warning or error.',
    'Use size="small" where the surrounding content is dense (tables, list rows) and size="medium" elsewhere.',
  ],
  dos: [
    'Pair the badge with its own visible text label — never rely on colour alone to convey state.',
    'Let neutral badges inherit the surface. A neutral badge is an outline plus ink, so it reads correctly on all four surfaces without any help.',
  ],
  donts: [
    'Do not attach onClick or otherwise make a Badge interactive — reach for Button if the element needs to trigger something.',
    'Do not use the warning or error variants for anything that is not actually a warning or an error; they carry that meaning to the reader.',
    'Do not give a Badge its own data-mode. It has a background but it is not a surface, and a mode would recolour the status fills that are deliberately constant.',
  ],
  variants: ['neutral', 'success', 'warning', 'error'],
  states: ['default'],
  accessibilityNotes: [
    'Renders a <span>: a badge conveys status, not structure or interactivity, so no role or tabIndex is added.',
    'The three status variants pin their fills and pair them with text-on-state, which is mode-invariant by design — measured 6.92:1 (success), 6.97:1 (warning) and 6.28:1 (error), the same on every surface.',
    'The neutral variant is outlined rather than filled as of 2026-09-07: a transparent fill with a border-strong outline and a text-primary label, all of which resolve per surface, so it stays legible on cream, olive, dark and terracotta alike.',
    'Colour never carries meaning alone — the label text is what communicates state, and colour reinforces it.',
  ],
  codeExample: '<Badge variant="success" size="medium">Success</Badge>',
};
