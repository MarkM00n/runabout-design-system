import type { Meta, StoryObj } from '@storybook/react-vite';

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
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Tab label', selected: false },
};

/** The Active state — the indicator is the only visual difference, so it
 *  needs its own story rather than being left to a pseudo-class. */
export const Selected: Story = {
  args: { children: 'Tab label', selected: true },
};

export const Disabled: Story = {
  args: { children: 'Tab label', disabled: true },
};

/** A realistic set, with the tablist wiring Tab expects around it. */
export const InATabList: Story = {
  args: { children: 'Events' },
  render: (args) => (
    <div role="tablist" aria-label="Programme" className="flex items-end gap-01">
      <Tab {...args} selected>
        Events
      </Tab>
      <Tab>Producers</Tab>
      <Tab>Tickets</Tab>
      <Tab disabled>Archive</Tab>
    </div>
  ),
};
