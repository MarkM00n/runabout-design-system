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
  // Checkbox's label/box border bind to text-primary/border-default, which
  // (2026-08-05 mode architecture) resolve per data-mode — Checkbox assumes
  // an externally dark backdrop rather than owning its own fill, so this
  // decorator supplies both the mode (drives the actual token resolution)
  // and a matching background (so the demo is visually legible, not just
  // technically correct). Without data-mode="dark" here, every story would
  // render dark-on-dark: the tokens would resolve their On Light values
  // against this decorator's dark background.
  decorators: [
    (Story) => (
      <div data-mode="dark" style={{ background: '#2f2c28', padding: 32, borderRadius: 12 }}>
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
