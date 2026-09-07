import type { Meta, StoryObj } from '@storybook/react-vite';

import { Textarea } from './Textarea';
import { docs } from './Textarea.docs';
import validation from './Textarea.validation.json';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['large', 'small'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Large: Story = {
  args: { size: 'large', placeholder: 'Enter details...' },
};

export const Small: Story = {
  args: { size: 'small', placeholder: 'Enter details...' },
};

export const WithValue: Story = {
  args: {
    size: 'large',
    defaultValue: 'We are coming as a group of six and one of us is gluten free.',
  },
};

export const Disabled: Story = {
  args: { size: 'large', placeholder: 'Enter details...', disabled: true },
};
