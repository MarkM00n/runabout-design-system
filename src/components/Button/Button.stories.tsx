import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';
import { docs } from './Button.docs';
import validation from './Button.validation.json';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'accent', 'link'] },
    size: { control: 'select', options: ['large', 'small'] },
    icon: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryLarge: Story = {
  args: { variant: 'primary', size: 'large', children: 'Book now' },
};

export const SecondaryLarge: Story = {
  args: { variant: 'secondary', size: 'large', children: 'Book now' },
};

export const AccentLarge: Story = {
  args: { variant: 'accent', size: 'large', children: 'Reserve' },
};

export const LinkLarge: Story = {
  args: { variant: 'link', size: 'large', children: 'Read more' },
};

export const PrimarySmall: Story = {
  args: { variant: 'primary', size: 'small', children: 'Book now' },
};

export const SecondarySmall: Story = {
  args: { variant: 'secondary', size: 'small', children: 'Book now' },
};

export const AccentSmall: Story = {
  args: { variant: 'accent', size: 'small', children: 'Reserve' },
};

export const LinkSmall: Story = {
  args: { variant: 'link', size: 'small', children: 'Read more' },
};

/** Figma's `Icon` boolean, off. The arrow implies forward movement, so it
 *  suits "Book now" better than a neutral or cancelling action. */
export const WithoutIcon: Story = {
  args: { variant: 'secondary', size: 'large', icon: false, children: 'Cancel' },
};

export const Disabled: Story = {
  args: { variant: 'primary', size: 'large', disabled: true, children: 'Book now' },
};

/** Every variant on one row, to check that all four resolve correctly when
 *  the toolbar's Mode control switches surface. Nothing here sets a mode of
 *  its own — that is the point. */
export const AllVariants: Story = {
  args: { children: 'Book now' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-03">
      <Button {...args} variant="primary" />
      <Button {...args} variant="secondary" />
      <Button {...args} variant="accent" />
      <Button {...args} variant="link" />
    </div>
  ),
};
