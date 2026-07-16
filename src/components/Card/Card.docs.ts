import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma cards/events component (Design System, JpFA7KtVlSOrM9fIYYgOsn).
export const docs: ComponentDocMeta = {
  description:
    'A self-contained event promo card — image, title, date/time, description, and a booking CTA. A single fixed composition, not a variant matrix, and composes Button internally rather than duplicating button styling.',
  usageGuidelines: [
    'Use for promoting a single bookable event inside a grid or list of similar cards.',
    'Provide imageSrc when a real photo is available; the component falls back to a neutral placeholder block otherwise, it does not require an image.',
    'The card is fluid-width by design — let its parent grid/flex container control the actual rendered width rather than wrapping it in a fixed-width box.',
  ],
  dos: [
    'Keep description short — the layout is not built for long-form copy.',
    'Override ctaLabel when the action is not a booking (e.g. "Learn more"); the default is "Book now".',
  ],
  donts: [
    'Do not put another Card inside a Card — the composition is not designed to nest.',
    'Do not rely on this component for non-event content; its structure (date/time row, single CTA) is specific to event promos.',
  ],
  variants: [],
  states: ['default'],
  accessibilityNotes: [
    'The date/time divider is a decorative visual separator and is marked aria-hidden.',
    'The CTA is a real Button instance, so it inherits all of Button\'s accessibility behavior (native <button>, :focus-visible ring) rather than reimplementing it.',
    'Container padding, gap, and corner radius are not bound to Figma variables in the source file — they are implemented as literal pixel values rather than mapped onto tokens they do not actually reference.',
  ],
  codeExample:
    '<Card\n  title="Natural Wine Session"\n  date="TUE 24 MAR"\n  time="12PM - 6PM"\n  description="Join us for a relaxed evening..."\n  onCtaClick={handleBooking}\n/>',
};
