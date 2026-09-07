import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon } from './Icon';
import { docs } from './Icon.docs';
import validation from './Icon.validation.json';

const meta = {
  title: 'Components/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'select', options: ['instagram', 'facebook', 'twitter', 'calendar'] },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Instagram: Story = { args: { name: 'instagram' } };
export const Facebook: Story = { args: { name: 'facebook' } };
export const Twitter: Story = { args: { name: 'twitter' } };

/** The one non-social glyph, drawn at 16px to sit inline beside a date. */
export const Calendar: Story = { args: { name: 'calendar' } };

/** Every icon at once, inheriting text-primary from the wrapper — the
 *  quickest way to check all four against a surface in the Mode toolbar. */
export const AllIcons: Story = {
  args: { name: 'instagram' },
  render: () => (
    <div className="flex items-center gap-03 text-text-primary">
      <Icon name="instagram" />
      <Icon name="facebook" />
      <Icon name="twitter" />
      <Icon name="calendar" />
    </div>
  ),
};

/** currentColor in practice: the icon takes the link's colour rather than
 *  setting one of its own, and carries the accessible name because there is
 *  no visible text beside it. */
export const AsAnIconOnlyLink: Story = {
  args: { name: 'instagram' },
  render: () => (
    <a href="#instagram" className="inline-flex text-text-link">
      <Icon name="instagram" label="Runabout on Instagram" />
    </a>
  ),
};

/** Paired with a date, which is what the calendar glyph is for. */
export const CalendarInline: Story = {
  args: { name: 'calendar' },
  render: () => (
    <span className="inline-flex items-center gap-01 font-manrope text-paragraph-small text-text-primary">
      <Icon name="calendar" />
      SAT 24 APRIL 2027
    </span>
  ),
};
