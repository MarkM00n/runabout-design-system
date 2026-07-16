import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from './Select';

const meta = {
  title: 'Components/Select',
  component: Select,
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
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const options = (
  <>
    <option value="" disabled hidden>
      Select an option...
    </option>
    <option value="natural-wine">Natural wine</option>
    <option value="orange-wine">Orange wine</option>
    <option value="pet-nat">Pét-nat</option>
  </>
);

export const Large: Story = {
  args: {
    size: 'large',
    defaultValue: '',
  },
  render: (args) => <Select {...args}>{options}</Select>,
};

export const Small: Story = {
  args: {
    size: 'small',
    defaultValue: '',
  },
  render: (args) => <Select {...args}>{options}</Select>,
};

export const Disabled: Story = {
  args: {
    size: 'large',
    defaultValue: '',
    disabled: true,
  },
  render: (args) => <Select {...args}>{options}</Select>,
};
