import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Button/Primary, Button/Secondary, Button/Accent, and
// Button/Link component sets (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'The primary interactive control for triggering an action. Four visual variants share one component so callers pick intent (primary/secondary/accent/link), not colors.',
  usageGuidelines: [
    'Use primary for the single main action on a screen or within a section.',
    'Use secondary for supporting actions alongside a primary action.',
    'Use accent to draw extra attention to a promotional or highlighted action.',
    'Use link for the lowest-emphasis action, visually closer to inline text than a button.',
    'Pass content via children, not a label prop, so the button can hold an icon plus text if a future variant needs it.',
  ],
  dos: [
    'Use one primary button per view so the main action stays unambiguous.',
    'Let the button size its own width to its content — do not force full-width unless the surrounding layout specifically calls for it.',
    'Pass a type explicitly (submit/reset) when the button lives inside a form and is not a plain action button.',
  ],
  donts: [
    'Do not use accent as a second primary button — it competes for attention rather than supporting the main action.',
    'Do not disable a button without also explaining why elsewhere in the UI — a disabled control with no context reads as broken.',
    'Do not nest interactive elements (links, other buttons) inside a Button — screen readers cannot represent nested controls.',
  ],
  variants: ['primary', 'secondary', 'accent', 'link'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <button>, never a styled div — keyboard activation (Enter/Space) and the button role come from the native element for free.',
    'Focus uses :focus-visible so the ring only appears for keyboard users, matching Figma\'s Focused variant rather than showing on every mouse click.',
    'Disabled uses the native disabled attribute plus disabled:pointer-events-none, not just a visual dimming.',
    'Accent\'s focus ring literally binds to Figma\'s border-default token rather than border-focus (the token Primary/Secondary use) — this is a real difference in the source file, not an inconsistency in the implementation.',
    'Link has no Disabled variant in the Figma source; a disabled treatment was added anyway for accessibility completeness rather than leaving disabled buttons of that variant unstyled.',
  ],
  codeExample:
    '<Button variant="primary" size="large" onClick={handleSubmit}>\n  Continue\n</Button>',
};
