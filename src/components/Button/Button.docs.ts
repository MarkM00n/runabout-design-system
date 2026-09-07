import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Button/Primary (70:42), Button/Secondary (70:83),
// Button/Accent (59:1985), Button/Link (70:124).
export const docs: ComponentDocMeta = {
  description:
    'The system\'s action control, in four emphasis levels. Primary is the main call to action, secondary supports it, accent is reserved for conversion moments, and link is a text-weight action for tertiary choices.',
  usageGuidelines: [
    'One primary button per view or section — if two things look equally important, neither reads as the main action.',
    'Secondary is a supporting action shown alongside a primary one, never the only action in a view.',
    'Accent is for conversion moments (Reserve, Book) at most once per section — it is not a louder primary, and it does not belong in forms or flows.',
    'Labels are sentence case, verb first, one to three words.',
    'Buttons inherit their surface. Put one on an olive or terracotta section and its fill, label and border resolve to that surface automatically — never wrap it in a data-mode to force an appearance.',
  ],
  dos: [
    'Use size="small" where the surrounding content is dense and size="large" (the default) elsewhere; the radius steps down with the size, matching Figma.',
    'Set icon={false} when the trailing arrow would be misleading — it implies forward movement, so it suits "Book now" better than "Cancel".',
    'Let the native disabled attribute do the work: it blocks focus and pointer events for free, and the visual treatment follows from it.',
  ],
  donts: [
    'Do not wrap a secondary button in data-mode="dark" to get a light outline. It used to need that; since the 2026-09-07 sync its border and label resolve per surface, and forcing the mode now produces a near-white outline on a cream page.',
    'Do not add outline-none alongside the focus styles, even scoped to focus:. Tailwind v4 routes every outline utility through one shared custom property, so any outline-none permanently prevents the focus ring from painting.',
    'Do not use the link variant for destructive or primary actions — it carries the least visual weight in the set.',
  ],
  variants: ['primary', 'secondary', 'accent', 'link'],
  states: ['default', 'hover', 'focus', 'disabled'],
  accessibilityNotes: [
    'Renders a real <button> with an explicit type, so keyboard activation, form semantics and focus order all come from the platform.',
    'Focus is a 2px state-focus outline offset 2px outside the control, on :focus-visible only — so the ring shows for keyboard users without appearing on every mouse click.',
    'The focus ring clears WCAG 2.2 SC 1.4.11 (3:1) on all four surfaces — measured 4.40:1 on cream, 6.08:1 olive, 8.92:1 dark, 3.67:1 terracotta. Because the ring sits in a 2px gap of bare surface, it is measured against the surface rather than the button fill, which is why the accent variant no longer needs a darker ring of its own.',
    'Disabled renders the default appearance at 38% opacity and pairs the native attribute with pointer-events-none, so hover states cannot leak through. Disabled contrast is exempt under SC 1.4.3.',
    'The trailing arrow is aria-hidden — it is decoration, and the label carries the meaning.',
    'The small size is 32px tall. That clears SC 2.5.8 (24x24) but not SC 2.5.5 (44x44, AAA) — worth a look if a given button is a primary touch target.',
  ],
  codeExample: '<Button variant="primary" size="large" onClick={book}>Book now</Button>',
};
