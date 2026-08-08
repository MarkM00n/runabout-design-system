import type { Meta, StoryObj } from '@storybook/react-vite';

import { VinesAndVinylLandingWithSignUp } from './VinesAndVinylLandingWithSignUp';

// PROTOTYPE — src/prototypes/, not part of the shipped design system. See
// src/prototypes/README.md / docs/design-system-rules.md §9.
//
// src/examples/VinesAndVinylLanding.tsx's own inline email-capture form
// swapped for a full sign-up form built from existing components — see
// VinesAndVinylLandingWithSignUp.tsx's header comment for why this page
// duplicates rather than imports the landing page's sections. The
// standalone sign-up-only prototype this form was originally built and
// tested in isolation as has been retired now that this combined page is
// the one worth keeping.
//
// Every section sets its own data-mode, same as the Examples landing page
// story — the toolbar's Mode global isn't meaningful here for the same
// reason it isn't there. Brand global still applies globally.
const meta = {
  title: 'Prototypes/Landing page - sign up form',
  component: VinesAndVinylLandingWithSignUp,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof VinesAndVinylLandingWithSignUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
