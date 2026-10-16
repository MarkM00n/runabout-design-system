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
    surface: { control: 'select', options: ['light', 'ink', 'dark', 'brand', 'accent', 'soft'] },
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

/** The default surface — a brand-coloured card, which is what you want on a
 *  light page. */
export const Brand: Story = {
  args: { ...base, surface: 'brand' },
};

/** The pairing for a card sitting on a dark or ink section. */
export const Light: Story = {
  args: { ...base, surface: 'light' },
};

export const Ink: Story = {
  args: { ...base, surface: 'ink' },
};

export const Dark: Story = {
  args: { ...base, surface: 'dark' },
};

export const Accent: Story = {
  args: { ...base, surface: 'accent' },
};

export const Soft: Story = {
  args: { ...base, surface: 'soft' },
};

/** With the image/title/metadata region made one clickable, focusable unit.
 *  Tab twice: the card region first, then the CTA. */
export const Clickable: Story = {
  args: { ...base, surface: 'brand', onCardClick: () => {} },
};

/** Figma's `Show Image` boolean, off. */
export const WithoutImage: Story = {
  args: { ...base, surface: 'brand', imageSrc: undefined },
};
