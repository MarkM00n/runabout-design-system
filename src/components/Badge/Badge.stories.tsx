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
      options: ['medium', 'small'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: {
    variant: 'neutral',
    size: 'medium',
    children: 'Neutral',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    size: 'medium',
    children: 'Success',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    size: 'medium',
    children: 'Warning',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    size: 'medium',
    children: 'Error',
  },
};

export const Small: Story = {
  args: {
    variant: 'neutral',
    size: 'small',
    children: 'Neutral',
  },
};

export const AllVariants: Story = {
  args: {
    children: 'Badge',
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Badge variant="neutral" size="small">Neutral</Badge>
        <Badge variant="success" size="small">Success</Badge>
        <Badge variant="warning" size="small">Warning</Badge>
        <Badge variant="error" size="small">Error</Badge>
      </div>
    </div>
  ),
};
