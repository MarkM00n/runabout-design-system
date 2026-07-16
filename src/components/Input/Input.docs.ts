import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/Text component set (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'A single-line text field for free-form input — names, emails, search terms, and similar short values. A thin styled wrapper around a native <input>, not a reimplementation.',
  usageGuidelines: [
    'Use for any single-line text entry; use Textarea instead when the expected answer is multi-line.',
    'Pass a placeholder to show example/hint text — do not rely on a separate visible label overlapping the field.',
    'Corner radius stays a full pill (24px) at both sizes; do not expect it to step down at small the way Button\'s does — the two components do not share a radius rule.',
  ],
  dos: [
    'Forward standard input attributes (type, name, required, maxLength, etc.) — they all pass through.',
    'Use size="small" in dense forms or inline filter bars; size="large" is the default for standalone forms.',
  ],
  donts: [
    'Do not use Input for multi-line content — it renders a single-line native input regardless of content length.',
    'Do not style over the placeholder/typed-value color split by hand; the component already reconstructs it (Figma\'s single static mockup cannot show both).',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real native <input>, so browser autofill, form validation, and assistive-technology behavior all work without extra wiring.',
    'Figma shows one static "Enter text..." mockup, which cannot represent a real typed value and a placeholder at once. The Default/Hover/Disabled muted color maps onto the real ::placeholder pseudo-element, and the Focused variant\'s color maps onto the input\'s actual typed-value color — a deliberate reconstruction, not a literal 1:1 copy of the mockup.',
    'Focus uses a visible :focus-visible ring in addition to the border-color change, so keyboard users get a clear indicator beyond color alone.',
  ],
  codeExample: '<Input size="large" placeholder="Enter your name" onChange={handleChange} />',
};
