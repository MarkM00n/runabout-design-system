import type { Meta, StoryObj } from '@storybook/react-vite';

import { ButtonClose } from './ButtonClose';
import { docs } from './ButtonClose.docs';
import validation from './ButtonClose.validation.json';

const meta = {
  title: 'Components/ButtonClose',
  component: ButtonClose,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ButtonClose>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Close' },
};

/** A label naming what closes, for a page where more than one thing is
 *  dismissible. */
export const WithSpecificLabel: Story = {
  args: { label: 'Close sign-up form' },
};

export const Disabled: Story = {
  args: { label: 'Close', disabled: true },
};
