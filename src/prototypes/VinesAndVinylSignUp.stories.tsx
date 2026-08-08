import type { Meta, StoryObj } from '@storybook/react-vite';

import { VinesAndVinylSignUp } from './VinesAndVinylSignUp';

// PROTOTYPE — see src/prototypes/README.md. layout: 'fullscreen' because
// this is a full page (feature-mode band + light-mode card), not an
// isolated control — Storybook's default 'centered' layout would pad and
// shrink it in a way that misrepresents the actual page.
const meta = {
  title: 'Prototypes/VinesAndVinylSignUp',
  component: VinesAndVinylSignUp,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof VinesAndVinylSignUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Renders with every required field already touched-and-empty, so the
// error state (invalid border + message under each field) is visible on
// load — inspecting it this way doesn't require actually blurring three
// fields by hand every time.
export const ErrorState: Story = {
  args: {
    startTouched: true,
  },
};
