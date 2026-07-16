import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './Input';
import { docs } from './Input.docs';
import validation from './Input.validation.json';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['large', 'small'],
    },
  },
  args: {
    placeholder: 'Enter text...',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Disabled: Story = {
  args: {
    size: 'large',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    size: 'large',
    defaultValue: 'Hello world',
  },
};
