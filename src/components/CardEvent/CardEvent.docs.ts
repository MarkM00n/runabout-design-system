import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Card/Event (376:586) — renamed from `cards` in the
// 2026-09-07 sync.
export const docs: ComponentDocMeta = {
  description:
    'An event card: image, title, date and time, description, and a call to action. A surface in its own right, so it declares which surface it is rather than inheriting one.',
  usageGuidelines: [
    'Choose the surface with the `surface` prop. Figma\'s guidance is On Cream on a dark section and On Terracotta on a cream page — pick the one that contrasts with what the card sits on.',
    'Pass `titleLevel` to match the page\'s heading outline. The card does not own its heading level; the visual size stays the same whichever tag you choose.',
    'Supply `onCardClick` only when the whole image-and-text region should be one link-like target. Leave it off for a card whose only action is the CTA.',
    'Keep the description to a couple of lines. The card is a teaser, not the event page.',
  ],
  dos: [
    'Give the image a meaningful alt, or an empty one if the title already says the same thing.',
    'Let the CTA hug its content width — Figma does, and stretching it across the card changes the visual weight of the whole thing.',
  ],
  donts: [
    'Do not nest the CTA inside the clickable card region. They are two separate targets with two separate focus stops, which is what keeps a button inside a button from happening.',
    'Do not hardcode a mode on the card the way the old version did. The fill is surface-section now, and the instance chooses its colour.',
  ],
  variants: ['cream', 'olive', 'dark', 'terracotta'],
  states: ['default', 'focus'],
  accessibilityNotes: [
    'The clickable region, when present, is a real <button> with a single focus stop covering the image, title and metadata — the CTA sits outside it as its own control, so a keyboard user gets two distinct targets rather than a button nested in a button.',
    'Focus is drawn on the card root with a 2px state-focus outline at the card\'s own bounds, matching Figma\'s State=Focus variant, which strokes the root rather than adding the offset overlay ring the smaller controls use. It is scoped to the card region\'s own :focus-visible, so tabbing to the CTA does not also ring the whole card.',
    'The heading level is the caller\'s choice via titleLevel, so the card can slot into any page outline without introducing a heading-order jump.',
    'Every text token inside resolves from the card\'s own data-mode, so the title, metadata and description are correct against whichever surface the card is set to.',
    'The date and time divider is aria-hidden — it is a visual separator, and the two values read fine in sequence without it.',
  ],
  codeExample:
    '<CardEvent\n  surface="terracotta"\n  title="Natural Wine Session"\n  date="SAT 24 APRIL 2027"\n  time="12PM - 6PM"\n  description="A relaxed afternoon with the growers."\n  imageSrc={hero}\n  imageAlt=""\n  ctaLabel="Book now"\n  onCtaClick={book}\n/>',
};
