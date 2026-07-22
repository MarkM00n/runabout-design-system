import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Badge component set (Design System, JpFA7KtVlSOrM9fIYYgOsn,
// node 248:437).
export const docs: ComponentDocMeta = {
  description:
    'A short status label — neutral, success, warning, or error — for showing state at a glance. Non-interactive; it never carries an action.',
  usageGuidelines: [
    'Use to surface state (e.g. "Success", "Warning") next to or inside other content, not as a clickable control.',
    'Keep the label to a single short word or phrase — text truncates at one line rather than wrapping.',
    'Pick the variant that matches the underlying state (success/warning/error), or neutral for anything that is not one of those three.',
  ],
  dos: [
    'Pair the badge with its own visible text label — never rely on color alone to convey which state it represents.',
    'Use size="small" wherever the surrounding content is already dense (tables, list rows) and size="medium" (the default) elsewhere.',
  ],
  donts: [
    'Do not attach onClick or otherwise make a Badge interactive — use Button if the element needs to trigger an action.',
    'Do not use warning/error variants for anything other than an actual warning or error state — they carry that meaning to the user.',
  ],
  variants: ['neutral', 'success', 'warning', 'error'],
  states: ['default'],
  accessibilityNotes: [
    'Renders a <span>, since a badge conveys status, not structure or interactivity — no role or tabIndex is added.',
    'Every variant\'s text sits on its own fill color (text-inverse on surface-inverse/state-success/state-warning/state-error) rather than relying on a shared page background, so contrast holds regardless of where the badge is placed.',
    'Color never carries meaning alone — the variant\'s text label ("Success", "Warning", etc.) is what actually communicates state; color reinforces it.',
  ],
  codeExample: '<Badge variant="success" size="medium">Success</Badge>',
};
