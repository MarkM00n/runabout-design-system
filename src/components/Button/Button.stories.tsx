import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent', 'link'],
    },
    size: {
      control: 'select',
      options: ['large', 'small'],
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'large',
    children: 'Button',
  },
};

export const Accent: Story = {
  args: {
    variant: 'accent',
    size: 'large',
    children: 'Button',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    size: 'large',
    children: 'Button',
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    children: 'Button',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Button',
    disabled: true,
  },
};
