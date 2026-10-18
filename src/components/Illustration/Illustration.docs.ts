import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Illustration/Sparkle (1433:2809), Illustration/Vinyl
// (1464:1000), Illustration/Grapes (1433:2812), Illustration/Seal (1385:8).
export const docs: ComponentDocMeta = {
  description:
    'Decorative brand art — a sparkle, a vinyl record, a grape cluster and a scalloped seal. Pick the shape with `name` and its colour with `colour`; every colour is an illustration token that resolves from the surface and brand the art sits on.',
  usageGuidelines: [
    'Choose the colour with the `colour` prop, never with a fill or text class of your own. Each shape offers only the colours its Figma set does: sparkle primary, secondary or tertiary; vinyl feature, primary or highlight; grapes primary, feature or outline; the seal has one colour and takes no `colour` at all.',
    'Defaults follow Figma: sparkle primary, vinyl feature, grapes primary.',
    'Size it with a width class — `w-[64px]`, or `w-full` inside a sized wrapper. The height follows the shape. Without one it renders at its Figma master size.',
    'Place it on a surface. The art has no background and never sets a mode; it resolves from the nearest `data-mode` and `data-brand`, the same as text does.',
    'Use vinyl highlight — cream — on accent (gold) grounds, where terracotta reads heavy.',
    'Use vinyl primary on light grounds, where the feature colour is pale. The record\'s label is always the surface colour, so it reads as a hole in any mode.',
    'Use grapes outline — a 1px line with no fill — for a line-drawn bunch over a busy or dark ground such as a photo. The line scales with the size you give it, as it does in Figma.',
    'The seal is the shape behind Event / Date seal. When text sits on it, colour that text `text-on-highlight` — the one illustration pairing built to carry text.',
  ],
  dos: [
    'Let it decorate: around a hero, beside a heading, as the mark above a short info column.',
    'Rotate and position it from a wrapper. The component itself only knows its shape and colour.',
    'Resize proportionally with a width class and let the height follow.',
  ],
  donts: [
    'Do not override the fill or stroke. A colour Figma does not offer is a design request for a new variant, not a class in code.',
    'Do not use an illustration to carry meaning. It is hidden from screen readers; anything it seems to say must also be in the text.',
    'Do not set `data-mode` on the illustration or on a wrapper that has no background of its own.',
    'Do not stretch it with both a width and a height. The shapes are drawn to one aspect ratio.',
    'Do not put text on any illustration except the seal, and on the seal only in text-on-highlight. The other illustration colours are fills and are never measured as text backgrounds.',
  ],
  variants: [
    'sparkle · primary',
    'sparkle · secondary',
    'sparkle · tertiary',
    'vinyl · feature',
    'vinyl · primary',
    'vinyl · highlight',
    'grapes · primary',
    'grapes · feature',
    'grapes · outline',
    'seal',
  ],
  states: ['default'],
  accessibilityNotes: [
    'Always decorative: the svg is aria-hidden with focusable="false", so it adds nothing to the accessibility tree and cannot be tabbed to. There is deliberately no `label` prop — if an image needs a name, it is not an illustration.',
    'It is not interactive, so it has no focus, hover or disabled state and no touch target to size.',
    'Decorative graphics are exempt from non-text contrast (WCAG 2.2 SC 1.4.11), so the illustration colours are not checked against surfaces. Each still resolves per mode so the art stays visible on every ground.',
    'The seal\'s illustration-highlight paired with text-on-highlight is checked by design-sync in every mode and brand. One known exception: under Northline on light and soft surfaces it measures 3.51:1, a palette decision recorded in design-system-rules.md section 7.',
  ],
  codeExample:
    '<div className="relative">\n  <Illustration name="sparkle" colour="secondary" className="absolute right-0 top-0 w-[64px] rotate-12" />\n  <Illustration name="vinyl" className="w-[240px]" />\n</div>',
};
