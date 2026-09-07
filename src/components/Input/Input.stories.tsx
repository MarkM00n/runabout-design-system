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
    size: { control: 'select', options: ['large', 'small'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Large: Story = {
  args: { size: 'large', placeholder: 'Enter text...' },
};

export const Small: Story = {
  args: { size: 'small', placeholder: 'Enter text...' },
};

/** A typed value rather than a placeholder — the two use different tokens
 *  (text-primary vs text-secondary), which one static story can't show. */
export const WithValue: Story = {
  args: { size: 'large', defaultValue: 'Ada Lovelace' },
};

export const Disabled: Story = {
  args: { size: 'large', placeholder: 'Enter text...', disabled: true },
};

/** With the label the component's own guidance requires — a placeholder is
 *  not a label. */
export const WithLabel: Story = {
  args: { size: 'large', placeholder: 'you@example.com' },
  render: (args) => (
    <div className="flex flex-col gap-01">
      <label htmlFor="email-demo" className="font-manrope text-label text-text-primary">
        Email address
      </label>
      <Input {...args} id="email-demo" type="email" />
    </div>
  ),
};
