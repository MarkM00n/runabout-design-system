import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/TextBox component set (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'A multi-line text field for longer free-form content — messages, descriptions, comments. Shares Input\'s color/border/state pattern but pads on all four sides and starts at a taller fixed height.',
  usageGuidelines: [
    'Use for any answer expected to span more than one line; use Input for single-line values.',
    'The starting height (120px large / 80px small) matches the Figma source; the field can be resized vertically by the user by default.',
  ],
  dos: [
    'Pass rows or a CSS height override if a specific starting height is needed beyond the two built-in sizes.',
    'Forward standard textarea attributes (maxLength, required, name, etc.) — they all pass through.',
  ],
  donts: [
    'Do not assume the height is fixed — resize-y is a deliberate UX addition in this implementation, not something sourced from Figma (Figma has no concept of resize behavior). Pass a resize-none override if a fixed height is actually required.',
    'Do not use Textarea for single-line values just to get more visual weight — use Input at the large size instead.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real native <textarea>, so browser spellcheck, resize handles, and assistive-technology behavior all work without extra wiring.',
    'Placeholder and typed-value colors follow the same real ::placeholder vs. typed-text-color pattern as Input.',
    'Focus uses a visible :focus-visible ring in addition to the border-color change.',
  ],
  codeExample: '<Textarea size="large" placeholder="Enter details..." onChange={handleChange} />',
};
