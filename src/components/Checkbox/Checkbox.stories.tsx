import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';
import { docs } from './Checkbox.docs';
import validation from './Checkbox.validation.json';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['large', 'small'] },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Large: Story = {
  args: { size: 'large', label: 'Email me about future events' },
};

export const Small: Story = {
  args: { size: 'small', label: 'Email me about future events' },
};

/** `checked` is a real state Storybook can't demonstrate via a pseudo-class,
 *  so it gets its own story (rules §3). */
export const Checked: Story = {
  args: { size: 'large', label: 'Email me about future events', defaultChecked: true },
};

export const Disabled: Story = {
  args: { size: 'large', label: 'Email me about future events', disabled: true },
};

export const DisabledChecked: Story = {
  args: {
    size: 'large',
    label: 'Email me about future events',
    disabled: true,
    defaultChecked: true,
  },
};

/** The wrapping-label case that exposed the items-start alignment fix — the
 *  box aligns to the first line, not the centre of the whole block. */
export const WithLongLabel: Story = {
  args: {
    size: 'large',
    label:
      'Email me about future events, tastings and producer visits, and share my details with the producers taking part',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
};
