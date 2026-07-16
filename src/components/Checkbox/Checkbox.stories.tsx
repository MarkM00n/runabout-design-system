import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['large', 'small'],
    },
  },
  args: {
    label: 'Checkbox label',
    onChange: fn(),
  },
  // Checkbox's label/box border bind to text-inverse/border-default in
  // Figma — tokens named for use on a dark/colored surface, not a plain
  // white canvas. Without this, every story renders near-illegible pale
  // cream on white; this isn't a component bug, it's a missing backdrop.
  decorators: [
    (Story) => (
      <div style={{ background: '#2f2c28', padding: 32, borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    size: 'large',
  },
};

export const Checked: Story = {
  args: {
    size: 'large',
    defaultChecked: true,
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    size: 'large',
    defaultChecked: true,
    disabled: true,
  },
};
