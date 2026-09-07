import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Tab (288:609).
export const docs: ComponentDocMeta = {
  description:
    'One tab in a set that switches between peer views inside a page. One tab is always active. Not for page navigation — use links for that.',
  usageGuidelines: [
    'Use between three and seven tabs. Fewer reads as arbitrary; more needs an overflow pattern, which is out of scope for v1.',
    'Keep one tab selected at all times — a tab set with nothing active has no meaning.',
    'Labels truncate at one line rather than wrapping, so keep them short.',
    'Render the set inside an element with role="tablist" and wire each tab to its panel; Tab itself supplies role="tab" and aria-selected.',
  ],
  dos: [
    'Implement roving tabindex across the set: arrow keys move focus between tabs, Home and End jump to first and last, Enter or Space activates.',
    'Let the active indicator carry selection alongside aria-selected, so the state is available both visually and programmatically.',
  ],
  donts: [
    'Do not use tabs to navigate between pages — that is a link, and it breaks the back button.',
    'Do not disable the active tab. Disable a tab only when its panel genuinely has nothing to show.',
  ],
  variants: [],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <button> with role="tab" and aria-selected, so assistive tech announces both what it is and whether it is the current one.',
    'The active indicator binds border-strong — the same ink as the label — rather than an accent colour. It reads as an emphasised rule, and it resolves per surface.',
    'Selection is never carried by the indicator alone: aria-selected is what communicates it to a screen reader.',
    'Focus is a 2px state-focus outline offset 2px, on :focus-visible only. This component has never carried an outline-none and does not need one.',
    'Disabled renders the default appearance at 38% opacity and blocks pointer events; the indicator is suppressed so a disabled tab cannot read as selected.',
  ],
  codeExample: '<Tab selected onClick={() => select("events")}>Events</Tab>',
};
