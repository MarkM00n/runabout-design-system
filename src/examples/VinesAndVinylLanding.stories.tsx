import type { Meta, StoryObj } from '@storybook/react-vite';

import { VinesAndVinylLanding } from './VinesAndVinylLanding';

// Source: Figma frame "Vines & Vinyl — Landing / Join the list" (node
// 435:62). A composed marketing page, not a reusable design-system
// component — Input and Button are the only real components it uses;
// everything else is layout built from semantic tokens and the design
// system's text styles. See VinesAndVinylLanding.tsx's own header comment
// for the mode-per-section rationale.
//
// Every section sets its own data-mode, so this story doesn't need (and
// shouldn't rely on) the toolbar's Mode global — that's only meaningful for
// components that resolve tokens against whatever ambient mode surrounds
// them, which this page's sections deliberately don't do. The toolbar's
// Brand global (Runabout/Northline) is exactly what this story exists to
// exercise: use it to confirm every section — including the two that
// self-scope their own data-mode (Nav/Footer's dark, Hero's feature) —
// resolves the selected brand's palette correctly.
//
// Fixed 1440px design, not responsive (matches every other component in
// this system so far) — rendered at fullscreen layout so Storybook's
// default canvas padding doesn't clip it.
const meta = {
  title: 'Examples/Landing Page',
  component: VinesAndVinylLanding,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof VinesAndVinylLanding>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VinesAndVinyl: Story = {};
