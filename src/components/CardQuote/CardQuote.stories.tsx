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
    surface: { control: 'select', options: ['cream', 'olive', 'dark', 'terracotta'] },
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

export const Terracotta: Story = { args: { ...base, surface: 'terracotta' } };
export const Cream: Story = { args: { ...base, surface: 'cream' } };
export const Olive: Story = { args: { ...base, surface: 'olive' } };
export const Dark: Story = { args: { ...base, surface: 'dark' } };

/** Attribution is optional, though a quote reads better with one. */
export const WithoutAttribution: Story = {
  args: { quote: base.quote, surface: 'terracotta' },
};
