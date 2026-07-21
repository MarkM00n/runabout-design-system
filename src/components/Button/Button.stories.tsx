import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from './Button';
import { docs } from './Button.docs';
import validation from './Button.validation.json';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
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
  // Secondary's text/border bind to text-inverse in Figma — a token meant
  // for a dark/colored surface, not Storybook's plain white canvas (same
  // reason Checkbox's stories carry this decorator). Scoped to this one
  // story rather than the whole meta, since Primary/Accent are self-
  // contained and Link's amber tokens already clear AA on a light surface.
  decorators: [
    (Story) => (
      <div style={{ background: '#2f2c28', padding: 32, borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
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
