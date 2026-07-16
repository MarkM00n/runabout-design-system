import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/Checkbox component set (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'A labeled checkbox for binary or multi-select choices. Renders a visually-hidden native input driving a custom-styled box and checkmark, so it looks fully custom while staying keyboard- and screen-reader-operable.',
  usageGuidelines: [
    'Always pass a label — it is required, not optional, so every checkbox has a discoverable accessible name.',
    'Its label/border tokens (text-inverse, border-default) are designed for a dark or colored surface. If placing it directly on a plain light page, wrap it with an appropriate background rather than expecting it to read clearly on white.',
    'Use the size prop to match the surrounding form density (large for standalone forms, small for compact lists/tables).',
  ],
  dos: [
    'Group related checkboxes with a fieldset/legend (or an equivalent labeled container) when they represent one logical question.',
    'Rely on the component\'s own checked/defaultChecked/onChange — it forwards all native input props.',
  ],
  donts: [
    'Do not remove or hide the real input from the DOM (no display:none/hidden) — it is sr-only, not gone, and removing it breaks keyboard and screen-reader operation.',
    'Do not use Checkbox for a single yes/no toggle that takes effect immediately — that is a Switch pattern, not built in this system yet.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled', 'checked'],
  accessibilityNotes: [
    'The real <input type="checkbox"> stays in the DOM and keyboard-focusable; the box and checkmark are aria-hidden decorative siblings driven off it.',
    'The checkmark svg is nested inside the box rather than a flat sibling of the input, so it uses explicit [label:has(:checked)_&] ancestor selectors instead of Tailwind\'s sibling-based peer-* — both are scoped correctly per-instance through the nearest label.',
    'Figma\'s Disabled variant recolors both the checkmark and the label text to text-muted, not just the box border — the implementation preserves that rather than only dimming the box.',
    'The label wraps both the box and the text, so clicking anywhere in the label toggles the checkbox — no separate click handler needed.',
  ],
  codeExample:
    '<Checkbox\n  label="Subscribe to updates"\n  size="large"\n  onChange={(e) => setSubscribed(e.target.checked)}\n/>',
};
