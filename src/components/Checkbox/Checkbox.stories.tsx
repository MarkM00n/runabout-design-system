import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

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
    size: {
      control: 'select',
      options: ['large', 'small'],
    },
  },
  args: {
    label: 'Checkbox label',
    onChange: fn(),
  },
  // No decorator needed — confirmed live against Figma 2026-08-08 that
  // Checkbox's box/label bind to border-strong/text-primary/action-secondary,
  // all mode-aware tokens that resolve correctly under the default On Light
  // mode (Storybook's plain canvas), same as Input/Select/Textarea. The
  // previous assumption that Checkbox required an externally dark backdrop
  // was stale — Figma's own reference now shows it on a light surface.
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
