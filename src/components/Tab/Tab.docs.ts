import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Tab component set (Design System, JpFA7KtVlSOrM9fIYYgOsn,
// node 288:609). Atomic Tab only — the roving-tabindex keyboard behaviour
// described below is a TabList/Tabs composite's responsibility, not
// something this component owns; see its own description for the full
// behaviour note.
export const docs: ComponentDocMeta = {
  description:
    'A single tab in a set of peer views within a page — one tab is always selected. Not for page navigation; use Tab for switching between views the user stays on the same page for.',
  usageGuidelines: [
    'Compose a set of at least 3 and at most 7 Tabs — overflow handling beyond that range is out of scope for this component.',
    'Exactly one Tab in a set should have selected set at any time.',
    'The parent composing a Tab set owns roving tabIndex and arrow-key/Home/End keyboard navigation across the set — Tab itself only renders one tab\'s markup and visual states.',
    'Keep labels short — they truncate at one line rather than wrapping.',
  ],
  dos: [
    'Set selected on exactly one Tab per set, and keep it in sync with whatever view is currently showing.',
    'Wire Enter/Space activation and roving tabIndex at the parent level so keyboard users can reach and activate every tab.',
  ],
  donts: [
    'Do not use Tab for page-to-page navigation — reach for a link/nav pattern instead.',
    'Do not render a Tab set with fewer than 3 or more than 7 tabs without a separate overflow pattern.',
  ],
  variants: ['default'],
  states: ['default', 'hover', 'selected', 'disabled', 'focus'],
  accessibilityNotes: [
    'Renders role="tab" with aria-selected reflecting the selected prop — the parent composing a full tablist is responsible for the surrounding role="tablist" and each panel\'s role="tabpanel"/aria-controls.',
    'Disabled renders the Default appearance at 38% opacity (opacity-disabled) rather than a separate colour set, and is exempt from text-contrast requirements under WCAG SC 1.4.3\'s inactive-component exception.',
    'Focus renders a 2px outline offset 2px outside the control (outline-border-focus), not a colour or background change — verified live against Figma to clear WCAG 1.4.11\'s 3:1 non-text contrast minimum.',
  ],
  codeExample: '<Tab selected onClick={() => setActiveTab(\'overview\')}>Overview</Tab>',
};
