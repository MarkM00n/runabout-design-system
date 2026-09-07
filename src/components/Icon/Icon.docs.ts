import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Icon/Social/Instagram (858:1735), Icon/Social/Facebook
// (858:1739), Icon/Social/Twitter (858:1743), Icon/Calendar (1101:3386).
export const docs: ComponentDocMeta = {
  description:
    'The system\'s icon set — three 36px social marks and a 16px calendar glyph. Every stroke follows currentColor, so an icon takes its colour from the text around it.',
  usageGuidelines: [
    'Leave `label` off for a decorative icon. That is the default, and it hides the glyph from assistive tech entirely.',
    'Supply `label` only when the icon is the sole carrier of meaning — an icon-only social link, for example, where there is no visible text beside it.',
    'Set colour on the parent rather than on the icon. It inherits currentColor, so a social link coloured text-link gives you a text-link icon for free.',
    'The three social icons are drawn at 36px inside their own ring; the calendar glyph is 16px and meant to sit inline beside a date.',
  ],
  dos: [
    'Wrap a social icon in a real <a> with an href when it links somewhere, and put the label on whichever of the two is the accessible name.',
    'Pair the calendar glyph with the date text rather than using it as the only indication that a field takes a date.',
  ],
  donts: [
    'Do not hardcode a colour on the icon. currentColor is what lets it work on all four surfaces and inside any control that already sets a text colour.',
    'Do not give an icon both an aria-label and a visible text label next to it — that announces the same thing twice.',
    'Do not scale a social icon down to sit inline with text. It carries its own 36px ring, which stops reading as a ring at small sizes.',
  ],
  variants: ['instagram', 'facebook', 'twitter', 'calendar'],
  states: ['default'],
  accessibilityNotes: [
    'By default the svg is aria-hidden with focusable="false", so a decorative icon adds nothing to the accessibility tree and cannot be tabbed to in any browser.',
    'Passing `label` switches it to role="img" with an accessible name, which is correct only when there is no other text conveying the same thing.',
    'Every stroke is currentColor rather than a bound token, so contrast is whatever the surrounding text\'s contrast is — which is the intent. In Figma all four bind text/primary; the icon-* token group was retired in the 2026-09-07 sync.',
    'The three social icons carry a literal 0.7 opacity taken from Figma, where it is a raw layer opacity with no variable bound. On text-primary that still clears 3:1 against every surface, but do not put an icon at that weight where it is the only indication of something important.',
  ],
  codeExample:
    '<a href="https://instagram.com/runabout" className="text-text-link">\n  <Icon name="instagram" label="Runabout on Instagram" />\n</a>',
};
