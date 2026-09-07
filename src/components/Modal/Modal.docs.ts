import type { ComponentDocMeta } from '../../design-docs/types';

// Source: Figma Modal (144:459).
export const docs: ComponentDocMeta = {
  description:
    'The panel of a modal dialog: title, optional description, a content slot and an optional footer for actions. It is the panel only — backdrop, focus trapping and scroll locking are the caller\'s job.',
  usageGuidelines: [
    'Render it inside your own overlay, and give that overlay the backdrop and the click-outside handling.',
    'Trap focus while it is open and return focus to whatever opened it on close. This component does not do either.',
    'Pass onClose to get the dismiss control in the header, and wire Esc to the same handler so there are two ways out.',
    'Put the actions in the footer, with the confirming action last.',
  ],
  dos: [
    'Give it an id so the title association has a stable target.',
    'Keep the content short enough not to scroll. A modal that scrolls usually wants to be a page.',
  ],
  donts: [
    'Do not open a modal from inside a modal.',
    'Do not override the mode. It is pinned to On Cream on purpose — see the accessibility notes.',
    'Do not use it for a message that has no decision attached. That is a banner or a toast, not a dialog.',
  ],
  variants: [],
  states: ['default'],
  accessibilityNotes: [
    'Renders role="dialog" with aria-modal and aria-labelledby pointing at the title, so assistive tech announces it as a dialog and names it — none of which the static Figma frame can express.',
    'It is the only component filling with surface-card, and it pins itself to On Cream. Both are the same fact: surface-card is Surface/50 in every mode — it does not vary — and text-primary only clears AA against that near-white fill in the On Cream column (13.65:1 there, 1.10:1 in the other three). Without the pinned mode, a modal on an olive or dark page would render pale ink on near-white. Figma pins the master identically.',
    'Focus trapping, scroll locking and returning focus on close are explicitly out of scope and must be supplied by the caller — a dialog without them is keyboard-hostile.',
    'The dividers are aria-hidden decoration; the heading structure carries the grouping.',
    'The close control carries its own accessible label and a 44px touch target — see ButtonClose.',
  ],
  codeExample:
    '<Modal\n  id="signup"\n  title="Sign Up for Event"\n  description="Fill in your details below to reserve your spot."\n  onClose={close}\n  footer={<>\n    <Button variant="secondary" icon={false} onClick={close}>Cancel</Button>\n    <Button variant="accent" onClick={submit}>Reserve</Button>\n  </>}\n>\n  <Input placeholder="Your name" />\n</Modal>',
};
