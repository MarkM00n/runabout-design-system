import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from './Select';
import { docs } from './Select.docs';
import validation from './Select.validation.json';

const meta = {
  title: 'Components/Select',
  component: Select,
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
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const options = (
  <>
    <option value="" disabled>
      Select an option...
    </option>
    <option value="natural-wine">Natural Wine Session</option>
    <option value="cellar-tour">Cellar Tour</option>
    <option value="harvest">Harvest Day</option>
  </>
);

export const Large: Story = {
  args: { size: 'large', defaultValue: '', children: options },
};

export const Small: Story = {
  args: { size: 'small', defaultValue: '', children: options },
};

/** A real selection rather than the placeholder. Also the regression case
 *  for the has-[select:disabled] scoping: the disabled placeholder option
 *  must not dim the whole control. */
export const WithSelection: Story = {
  args: { size: 'large', defaultValue: 'cellar-tour', children: options },
};

export const Disabled: Story = {
  args: { size: 'large', defaultValue: '', disabled: true, children: options },
};
