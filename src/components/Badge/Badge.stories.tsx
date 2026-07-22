import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './Badge';
import { docs } from './Badge.docs';
import validation from './Badge.validation.json';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'error'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NeutralMedium: Story = {
  args: {
    variant: 'neutral',
    size: 'medium',
    children: 'Neutral',
  },
};

export const SuccessMedium: Story = {
  args: {
    variant: 'success',
    size: 'medium',
    children: 'Success',
  },
};

export const WarningMedium: Story = {
  args: {
    variant: 'warning',
    size: 'medium',
    children: 'Warning',
  },
};

export const ErrorMedium: Story = {
  args: {
    variant: 'error',
    size: 'medium',
    children: 'Error',
  },
};

export const NeutralSmall: Story = {
  args: {
    variant: 'neutral',
    size: 'small',
    children: 'Neutral',
  },
};

export const SuccessSmall: Story = {
  args: {
    variant: 'success',
    size: 'small',
    children: 'Success',
  },
};

export const WarningSmall: Story = {
  args: {
    variant: 'warning',
    size: 'small',
    children: 'Warning',
  },
};

export const ErrorSmall: Story = {
  args: {
    variant: 'error',
    size: 'small',
    children: 'Error',
  },
};
