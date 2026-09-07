import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Card/Producer (852:1722).
export const docs: ComponentDocMeta = {
  description:
    'An image-first producer card: a photograph filling the card with a scrim over it and the producer\'s category, name and location sitting on the scrim.',
  usageGuidelines: [
    'Use a photograph with room at the bottom. The scrim darkens the lower half, so a subject sitting low in the frame gets buried.',
    'Keep the category to a word or two — it is set as a tracked overline and does not wrap gracefully.',
    'This is the one card with no `surface` prop; see the accessibility notes for why its mode is fixed.',
  ],
  dos: [
    'Give the image an alt describing the producer, or an empty alt when the name below already carries the same information.',
    'Check any accented producer name against a real render before shipping it — the Recoleta cut used in development is a demo licence that silently substitutes a watermark glyph for accented characters. See the note on --font-recoleta in tokens.css.',
    'Supply a location where you have one — it is what turns a name into a place you could visit.',
  ],
  donts: [
    'Do not remove the scrim to show more of the photograph. It is the only thing guaranteeing the text stays legible over an arbitrary image.',
    'Do not set a mode on this card. Unlike CardEvent and CardQuote it is deliberately pinned — see below.',
  ],
  variants: [],
  states: ['default'],
  accessibilityNotes: [
    'The card is pinned to On Dark and takes no surface prop, because its text never sits on a surface colour at all — it sits on an 85% black scrim over an arbitrary photograph. On Dark is the only column whose text tokens are correct against that regardless of what the photo looks like, and Figma pins the master the same way.',
    'The scrim is a real gradient between surface-scrim-start and surface-scrim-end rather than an opacity on the image, so the top of the photograph stays fully visible while the text end is dark enough to read against.',
    'The scrim layer is aria-hidden — it is presentation, and it sits behind the content in the stacking order rather than over it.',
    'The location line carries a literal 0.5 opacity taken from Figma, where it is a raw layer opacity with no variable bound. It is supporting metadata rather than primary content; do not put anything essential at that weight.',
  ],
  codeExample:
    '<CardProducer\n  category="WINE"\n  name="Domaine Léonine"\n  location="Roussillon, France"\n  imageSrc={producer}\n  imageAlt=""\n/>',
};
