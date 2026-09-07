import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/Dropdown (141:358). Named Select in code after the
// native element it wraps, per design-system-rules.md §1.
export const docs: ComponentDocMeta = {
  description:
    'A single-choice selection from a list of options. Shares Input\'s field styling with a chevron added.',
  usageGuidelines: [
    'Always show a visible label above the field — a placeholder is not a label.',
    'Provide the "no selection yet" state as a disabled, selected placeholder <option>, since a native select has no placeholder attribute.',
    'Reach for radio buttons instead when there are only two or three options and they all deserve to be visible at once.',
    'Announce error text via aria-describedby and set aria-invalid on the select.',
  ],
  dos: [
    'Keep the native element. Arrow keys, Enter, Esc, type-ahead and the platform\'s own mobile picker all come for free.',
    'Order options in a way the reader can predict — alphabetical, chronological or by frequency, not by how they came out of the database.',
  ],
  donts: [
    'Do not use has-[:disabled] to dim the wrapper. It matches any disabled descendant, including a perfectly normal disabled placeholder option — which silently dimmed every Select using the standard convention. The selector is scoped to has-[select:disabled] for exactly this reason.',
    'Do not add outline-none alongside the focus styles — see Input for why the ring then never paints.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <select>, so keyboard navigation and the platform\'s native option list both work without any custom listbox code.',
    'Focus replaces the border with a 2px state-focus outline offset 2px, on :focus-visible only.',
    'The chevron is aria-hidden and follows text-primary — the icon-* token group was retired in the 2026-09-07 sync, and icons bind the matching text-* token.',
    'Known gap vs Figma: a native select has no ::placeholder equivalent, so Input\'s text-secondary placeholder / text-primary value split is not reproducible here without giving up the native control. Text is text-primary throughout.',
    'Disabled dims the wrapper so the chevron fades with the field in one paint, scoped to the select\'s own disabled state.',
  ],
  codeExample:
    '<label htmlFor="guests">Number of guests</label>\n<Select id="guests" defaultValue="">\n  <option value="" disabled>Select an option...</option>\n  <option value="2">2</option>\n</Select>',
};
