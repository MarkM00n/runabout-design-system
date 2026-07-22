import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma `cards` component set (Design System, JpFA7KtVlSOrM9fIYYgOsn),
// State: Default | Focus.
export const docs: ComponentDocMeta = {
  description:
    'A self-contained event promo card — image, title, date/time, description, and a booking CTA. The image/title/metadata region and the CTA button are two separate interactive units, not one; composes Button internally rather than duplicating button styling.',
  usageGuidelines: [
    'Use for promoting a single bookable event inside a grid or list of similar cards.',
    'Provide imageSrc when a real photo is available; the component falls back to a neutral placeholder block otherwise, it does not require an image.',
    'Pass onCardClick to make the image/title/metadata region a single clickable, keyboard-focusable unit (e.g. navigating to an event detail page) — separate from the CTA button, which keeps its own click handler (onCtaClick). Omit onCardClick to leave that region static.',
    'Set titleLevel to the heading tag correct for the page\'s outline (e.g. "h2" in a page with no other h2, "h4" nested under a section h3) — the card does not assert its own heading level, and defaults to h3 only for backward compatibility.',
    'The card is fluid-width by design — let its parent grid/flex container control the actual rendered width rather than wrapping it in a fixed-width box.',
  ],
  dos: [
    'Keep description short — the layout is not built for long-form copy.',
    'Override ctaLabel when the action is not a booking (e.g. "Learn more"); the default is "Book now".',
    'Pass a meaningful imageAlt when the image conveys information beyond decoration (e.g. a named venue photo); leave it empty (the default) for a purely decorative image.',
  ],
  donts: [
    'Do not put another Card inside a Card — the composition is not designed to nest.',
    'Do not rely on this component for non-event content; its structure (date/time row, single CTA) is specific to event promos.',
    'Do not use onCardClick and onCtaClick to trigger the same action with different behavior — if both are set, make sure they agree on where a click leads.',
  ],
  variants: [],
  states: ['default', 'focus'],
  accessibilityNotes: [
    'The date/time divider is a decorative visual separator and is marked aria-hidden.',
    'The CTA is a real Button instance, so it inherits all of Button\'s accessibility behavior (native <button>, :focus-visible ring) rather than reimplementing it.',
    'When onCardClick is provided, the image/title/metadata region renders as a real <button> (not a styled <div>) with its own :focus-visible ring, distinct from and a DOM sibling of the CTA button — never nested inside it. Its accessible name is the concatenation of the title, date, time, and description text.',
    'titleLevel lets the caller choose the correct heading level for the page outline; the title\'s visual size (text-h3) stays constant regardless of which tag is rendered.',
  ],
  codeExample:
    '<Card\n  title="Natural Wine Session"\n  date="TUE 24 MAR"\n  time="12PM - 6PM"\n  description="Join us for a relaxed evening..."\n  onCtaClick={handleBooking}\n  onCardClick={goToEventDetail}\n  titleLevel="h2"\n/>',
};
