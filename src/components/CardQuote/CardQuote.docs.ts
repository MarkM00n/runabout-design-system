import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Card/Quote (945:1122).
export const docs: ComponentDocMeta = {
  description:
    'A pull quote card — a short quotation in the display face with an optional attribution beneath. Display only; there is nothing to interact with.',
  usageGuidelines: [
    'Choose the surface with the `surface` prop, the same rule as every card: On Terracotta on a cream page, On Cream on olive, dark or terracotta.',
    'Keep the quote short. It is set at display size, so a long passage overwhelms whatever it sits next to.',
    'Include the quotation marks and the attribution dash in the strings themselves if the design calls for them — the component does not add either.',
  ],
  dos: [
    'Attribute the quote wherever you can. An unattributed pull quote reads as marketing copy rather than as something someone said.',
  ],
  donts: [
    'Do not use it for body copy that happens to be important. It is a quotation, and it is marked up as one.',
    'Do not make it clickable. There is no focus or hover treatment in the design, so an interactive version would have no visible affordance.',
  ],
  variants: ['cream', 'olive', 'dark', 'terracotta'],
  states: ['default'],
  accessibilityNotes: [
    'Renders <figure> / <blockquote> / <figcaption>, so the quote and its attribution are programmatically related rather than being two unconnected blocks of text — the one thing the static Figma frame cannot express.',
    'The attribution carries a literal 0.9 opacity taken from Figma, where it is a raw layer opacity with no variable bound. Against text-secondary on every surface the result still clears AA for its size.',
    'The card declares its own mode, so the quote and attribution resolve to the right ink for the surface the card is set to.',
  ],
  codeExample:
    '<CardQuote\n  surface="terracotta"\n  quote="&ldquo;Time is the only ingredient you cannot buy.&rdquo;"\n  attribution="— A cellar master"\n/>',
};
