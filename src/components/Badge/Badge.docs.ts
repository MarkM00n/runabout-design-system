import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma `Badge` component set (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'A short status label. Communicates state — not an action — with a colored pill and a word or two of text.',
  usageGuidelines: [
    'Use Badge to surface state (e.g. an order or account status), never as a clickable control — it renders a plain <span>, not a button or link.',
    'Always pass meaningful text as children. Per Figma\'s own usage note, color never carries meaning alone, so a badge can\'t rely on variant alone to communicate.',
    'Pick variant by meaning, not by which color looks best: success for a completed/healthy state, warning for something needing attention, error for a failed/blocked state, neutral for anything else.',
    'Use size="small" in dense contexts like table rows or lists; size="medium" (the default) elsewhere.',
  ],
  dos: [
    'Keep the label short — the component truncates to one line rather than wrapping, so long text will be cut off with an ellipsis.',
    'Use size="small" consistently within a dense list/table so badges align with the surrounding row height.',
  ],
  donts: [
    'Do not use Badge for actions (e.g. a dismissible tag or filter chip) — it has no interactive semantics or click handling built in.',
    'Do not rely on variant color alone to convey meaning — pair it with a clear text label.',
  ],
  variants: ['neutral', 'success', 'warning', 'error'],
  states: ['default'],
  accessibilityNotes: [
    'Renders a plain <span>, not a button — it is not focusable and has no interactive role, matching its non-interactive, state-only purpose.',
    'Carries no built-in ARIA role or live-region behavior; if a badge communicates a change that should be announced to screen readers, wrap it in an appropriate live region at the call site.',
    'Text is required (not optional) so every badge has real, readable content — color is never the only signal.',
  ],
  codeExample: '<Badge variant="success" size="medium">\n  Active\n</Badge>',
};
