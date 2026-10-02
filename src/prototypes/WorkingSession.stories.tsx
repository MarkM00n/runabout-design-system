import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkingSession } from './WorkingSession';

const meta = {
  title: 'Prototypes/WorkingSession',
  component: WorkingSession,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WorkingSession>;

export default meta;
type Story = StoryObj<typeof meta>;

// Loads working-session-data.csv. Drop any CSV onto the canvas to swap it.
export const Default: Story = {};
