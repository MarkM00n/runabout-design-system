import type { Meta, StoryObj } from '@storybook/react-vite';
import { VinesAndVinylSignUp } from './VinesAndVinylSignUp';

const meta = {
  title: 'Prototypes/VinesAndVinylSignUp',
  component: VinesAndVinylSignUp,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof VinesAndVinylSignUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ErrorState: Story = { args: { startTouched: true } };
