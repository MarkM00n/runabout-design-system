import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Tab } from './Tab';
import { docs } from './Tab.docs';
import validation from './Tab.validation.json';

const meta = {
  title: 'Components/Tab',
  component: Tab,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    selected: {
      control: 'boolean',
    },
  },
  args: { onClick: fn() },
  // role="tab" requires an ancestor role="tablist" to be valid — real usage
  // gets this from the TabList/Tabs composite that owns roving tabindex
  // (out of scope for this atomic component, see Tab.docs.ts). Applied here
  // so the isolated story stays accessibility-valid on its own.
  decorators: [
    (Story) => (
      <div role="tablist">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selected: false,
    children: 'Tab label',
  },
};

export const Selected: Story = {
  args: {
    selected: true,
    children: 'Tab label',
  },
};

export const Disabled: Story = {
  args: {
    selected: false,
    children: 'Tab label',
    disabled: true,
  },
};
