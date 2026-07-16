import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/Dropdown component set (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'A native dropdown for choosing one value from a small, known set of options. Styled to match Input\'s shape, with a custom chevron icon layered on top of an appearance-none <select>.',
  usageGuidelines: [
    'Pass a disabled, selected placeholder <option value=""> as the first child to get "Select an option..." style placeholder text — native <select> has no built-in placeholder attribute.',
    'Use for a short, fixed list of choices. For long or searchable option lists, this plain native select is likely the wrong tool — it has no search/filter UI.',
    'Children must be real <option>/<optgroup> elements, passed through as-is.',
  ],
  dos: [
    'Keep option labels short — the field width does not grow to fit long option text.',
    'Rely on the built-in keyboard support (arrow keys, type-ahead) that comes free with a native <select>.',
  ],
  donts: [
    'Do not expect the muted-placeholder-vs-typed-value color split that Input has — native <select> has no ::placeholder equivalent, so the displayed text stays text-primary colored regardless of selection state.',
    'Do not nest interactive elements inside an <option> — the browser will not render them.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real native <select> with appearance-none only removing the browser\'s default arrow graphic — all native keyboard and screen-reader behavior for selects is preserved.',
    'The chevron icon is aria-hidden and pointer-events-none, so it never intercepts clicks meant for the underlying select.',
    'Known gap: because native <select> has no ::placeholder equivalent, this component cannot fully replicate Input\'s muted-vs-primary text color distinction — documented here rather than silently mismatched against Figma.',
  ],
  codeExample:
    '<Select size="large" defaultValue="" onChange={handleChange}>\n  <option value="" disabled hidden>Select an option...</option>\n  <option value="a">Option A</option>\n</Select>',
};
