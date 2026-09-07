import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/TextBox (141:392). Named Textarea in code after the
// native element it wraps, per design-system-rules.md §1.
export const docs: ComponentDocMeta = {
  description:
    'A multi-line text field for longer content. Same label, helper, focus and error behaviour as Input, with padding on all four sides and a taller default height.',
  usageGuidelines: [
    'Reach for it when the expected answer runs past a single line — an address, a note, a message. Anything shorter belongs in an Input.',
    'Give it a visible label above the field, the same as Input.',
    'If there is a character limit, show the remaining count and announce it when it is exceeded.',
    'Size the field to the answer you expect. A box far taller than the content invites more than you want.',
  ],
  dos: [
    'Leave vertical resizing on — it is a deliberate addition for standard textarea UX, not a Figma binding, and it lets someone see their own long answer.',
    'Use size="small" in dense layouts; both sizes keep the same pill radius.',
  ],
  donts: [
    'Do not use it as a rich-text editor stand-in. It holds plain text.',
    'Do not add outline-none alongside the focus styles — see Input for why the ring stops painting entirely.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <textarea>, so line breaks, scrolling and form participation all behave natively.',
    'Focus replaces the border with a 2px state-focus outline offset 2px, on :focus-visible only.',
    'Resizing is disabled when the field is, so a disabled control cannot be dragged around.',
    'The transparent action-secondary fill means contrast must be computed against whatever surface shows through, never against the fill token.',
    'Disabled renders the default appearance at 38% opacity via the native attribute.',
  ],
  codeExample:
    '<label htmlFor="notes">Anything we should know?</label>\n<Textarea id="notes" placeholder="Enter details..." />',
};
