import type { Meta, StoryObj } from '@storybook/react-vite';

import { CardQuote } from './CardQuote';
import { docs } from './CardQuote.docs';
import validation from './CardQuote.validation.json';

const meta = {
  title: 'Components/CardQuote',
  component: CardQuote,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    surface: { control: 'select', options: ['light', 'ink', 'dark', 'brand', 'accent', 'soft'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[640px] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardQuote>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  quote: '“Time is the only ingredient you cannot buy.”',
  attribution: '— A cellar master',
};

export const Brand: Story = { args: { ...base, surface: 'brand' } };
export const Light: Story = { args: { ...base, surface: 'light' } };
export const Ink: Story = { args: { ...base, surface: 'ink' } };
export const Dark: Story = { args: { ...base, surface: 'dark' } };
export const Accent: Story = { args: { ...base, surface: 'accent' } };
export const Soft: Story = { args: { ...base, surface: 'soft' } };

/** Attribution is optional, though a quote reads better with one. */
export const WithoutAttribution: Story = {
  args: { quote: base.quote, surface: 'brand' },
};
