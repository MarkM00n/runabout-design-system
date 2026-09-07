import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Button/Close (146:475).
export const docs: ComponentDocMeta = {
  description:
    'An icon-only dismiss control for modals, banners and overlays. Always a last-resort exit — wherever it makes sense, the primary action should also close the thing it sits in.',
  usageGuidelines: [
    'Place it top-right of the surface it dismisses; Modal already does this for you when you pass onClose.',
    'Give it a label that says what closes ("Close sign-up form"), not just "Close", wherever more than one dismissible thing can be on screen.',
    'It inherits its surface like any other control — no data-mode of its own.',
  ],
  dos: [
    'Pair it with a second way out (Esc, a Cancel button) rather than making it the only escape route.',
    'Keep the 32px visual size — the touch target is already grown to 44px underneath without changing layout.',
  ],
  donts: [
    'Do not use it for a destructive action that happens to be represented by a cross. It means "dismiss this", not "delete this".',
    'Do not remove the accessible label. An icon-only control with no label announces as nothing useful.',
  ],
  variants: [],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <button> carrying an aria-label, since there is no visible text for a screen reader to announce. The glyph itself is aria-hidden.',
    'The visual box is 32x32, which clears WCAG 2.2 SC 2.5.8 (24x24, AA) on its own. A transparent 44x44 pseudo-element extends the touch target to satisfy the component\'s own Figma description, which asks for 44px — that is a house preference matching SC 2.5.5 (AAA), not the AA bar this system tests against.',
    'Focus is a 2px state-focus outline offset 2px, on :focus-visible only.',
    'Disabled renders the default appearance at 38% opacity via the native attribute.',
  ],
  codeExample: '<ButtonClose label="Close sign-up form" onClick={dismiss} />',
};
