import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: { onCtaClick: fn() },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EventCard: Story = {
  args: {
    title: 'Natural Wine Session',
    date: 'TUE 24 MAR',
    time: '12PM - 6PM',
    description:
      'Join us for a relaxed evening exploring five new arrivals from our favorite Adelaide Hills producers.',
    ctaLabel: 'Book now',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};
