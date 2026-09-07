import type { Meta, StoryObj } from '@storybook/react-vite';

import { CardEvent } from './CardEvent';
import { docs } from './CardEvent.docs';
import validation from './CardEvent.validation.json';
import hero from '../../assets/hero.png';

const meta = {
  title: 'Components/CardEvent',
  component: CardEvent,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    surface: { control: 'select', options: ['cream', 'olive', 'dark', 'terracotta'] },
    titleLevel: { control: 'select', options: ['h2', 'h3', 'h4', 'h5', 'h6'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[624px] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardEvent>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  imageSrc: hero,
  imageAlt: '',
  title: 'Natural Wine Session',
  date: 'SAT 24 APRIL 2027',
  time: '12PM - 6PM',
  description:
    'Join us for a relaxed afternoon exploring low-intervention wines with the growers who made them.',
  ctaLabel: 'Book now',
};

/** The default surface — a terracotta card, which is what you want on a
 *  cream page. */
export const Terracotta: Story = {
  args: { ...base, surface: 'terracotta' },
};

/** The pairing for a card sitting on a dark or olive section. */
export const Cream: Story = {
  args: { ...base, surface: 'cream' },
};

export const Olive: Story = {
  args: { ...base, surface: 'olive' },
};

export const Dark: Story = {
  args: { ...base, surface: 'dark' },
};

/** With the image/title/metadata region made one clickable, focusable unit.
 *  Tab twice: the card region first, then the CTA. */
export const Clickable: Story = {
  args: { ...base, surface: 'terracotta', onCardClick: () => {} },
};

/** Figma's `Show Image` boolean, off. */
export const WithoutImage: Story = {
  args: { ...base, surface: 'terracotta', imageSrc: undefined },
};
