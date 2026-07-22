import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Card } from './Card';
import { docs } from './Card.docs';
import validation from './Card.validation.json';

// Inline SVG placeholder — avoids an external image dependency in Storybook/Chromatic.
const placeholderImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200"><rect width="480" height="200" fill="#d2805c"/></svg>',
  );

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  args: {
    title: 'Natural Wine Session',
    date: 'TUE 24 MAR',
    time: '12PM - 6PM',
    description:
      'Join us for a relaxed evening exploring five new arrivals from our favorite Adelaide Hills producers.',
    ctaLabel: 'Book now',
    imageSrc: placeholderImage,
    onCtaClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EventCard: Story = {};

/** Image/title/metadata region becomes one clickable, keyboard-focusable unit
 * (Figma's Focus state) — separate from the CTA button. Tab to it to see the
 * focus ring. */
export const Clickable: Story = {
  args: {
    onCardClick: fn(),
  },
};

export const WithoutImage: Story = {
  args: {
    imageSrc: undefined,
  },
};
