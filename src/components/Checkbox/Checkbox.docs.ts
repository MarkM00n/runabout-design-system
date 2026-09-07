import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Input/Checkbox (141:449).
export const docs: ComponentDocMeta = {
  description:
    'A binary choice with its label as part of the clickable area. For opting in or out of something that takes effect when the form is submitted.',
  usageGuidelines: [
    'Use a checkbox only where the choice is applied later, on submit. If the action takes effect immediately, that is a toggle, not a checkbox.',
    'Write the label as the affirmative statement being agreed to, so the checked state reads as true.',
    'Group related checkboxes inside a <fieldset> with a <legend> naming what they have in common.',
    'Use size="small" in dense layouts and size="large" (the default) elsewhere.',
  ],
  dos: [
    'Let the label be part of the target — the whole control is one <label>, so clicking the text toggles the box.',
    'Keep long labels readable: the box aligns to the first line\'s cap height rather than centring against the whole block, which is the conventional treatment once a label wraps.',
  ],
  donts: [
    'Do not replace the native input with a styled div. The real input stays in the DOM, hidden with sr-only rather than display:none, so keyboard operation and the accessibility tree survive.',
    'Do not apply the disabled opacity twice. Figma currently binds opacity/disabled on both the variant root and the box child, which multiplies to about 14% on the box — a design-side defect reported on 2026-09-07. This component applies it once, per rules §2.',
  ],
  variants: ['large', 'small'],
  states: ['default', 'hover', 'focus', 'disabled', 'checked'],
  accessibilityNotes: [
    'The real <input type="checkbox"> stays in the DOM and is only visually hidden (sr-only) — never display:none or visibility:hidden, which would remove it from the accessibility tree and break keyboard operation. The box and checkmark are aria-hidden decoration driven off it.',
    'Space toggles the checkbox, straight from the native element.',
    'Focus is a 2px state-focus outline offset 2px around the box itself, on :focus-visible only, matching Figma\'s 32x32 focus ring around the 24px box.',
    'The label stays text-primary in every state including Disabled — it does not recolour; the whole control dims instead.',
    'The large control is 24px tall, exactly meeting SC 2.5.8 (24x24). The clickable area extends across the label, so the real target is larger than the box.',
  ],
  codeExample: '<Checkbox label="Email me about future events" name="marketing" />',
};
