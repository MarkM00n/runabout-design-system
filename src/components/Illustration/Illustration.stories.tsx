import type { Meta, StoryObj } from '@storybook/react-vite';

import { Illustration } from './Illustration';
import { docs } from './Illustration.docs';
import validation from './Illustration.validation.json';

// Every story renders on the canvas decorator's surface-section, in whatever
// mode and brand the toolbar is set to — the art has no background of its
// own and resolves from what it sits on. Switch Mode and Brand to see each
// colour on each ground; AcrossSurfaces shows all six modes at once.
//
// On Runabout's light surface illustration-primary and -secondary happen to
// resolve to the same value. They're distinct Figma variables that part on
// every other surface and in the other brands, so they stay distinct stories.
const meta = {
  title: 'Components/Illustration',
  component: Illustration,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'select', options: ['sparkle', 'vinyl', 'grapes', 'seal'] },
    colour: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'feature'] },
  },
} satisfies Meta<typeof Illustration>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Illustration/Sparkle, Colour=Primary — the set's default. */
export const SparklePrimary: Story = { args: { name: 'sparkle', colour: 'primary' } };
/** Illustration/Sparkle, Colour=Secondary. */
export const SparkleSecondary: Story = { args: { name: 'sparkle', colour: 'secondary' } };
/** Illustration/Sparkle, Colour=Tertiary. */
export const SparkleTertiary: Story = { args: { name: 'sparkle', colour: 'tertiary' } };

/** Illustration/Vinyl, Colour=Feature — the set's default. The label is
 *  surface-section, so it always shows the ground the record sits on. */
export const VinylFeature: Story = { args: { name: 'vinyl', colour: 'feature', className: 'w-[240px]' } };
/** Illustration/Vinyl, Colour=Primary — for light grounds. */
export const VinylPrimary: Story = { args: { name: 'vinyl', colour: 'primary', className: 'w-[240px]' } };

/** Illustration/Grapes, Colour=Primary — the set's default; the accent cluster. */
export const GrapesPrimary: Story = { args: { name: 'grapes', colour: 'primary', className: 'w-[240px]' } };
/** Illustration/Grapes, Colour=Feature — the large soft cluster. */
export const GrapesFeature: Story = { args: { name: 'grapes', colour: 'feature', className: 'w-[240px]' } };

/** Illustration/Seal — no variants; always illustration-highlight. */
export const Seal: Story = { args: { name: 'seal', className: 'w-[200px]' } };

const MODES = ['light', 'ink', 'dark', 'brand', 'accent', 'soft'] as const;

/** Every illustration and colour on all six surfaces at once. Each tile is a
 *  surface, so it owns its mode; the art inside sets none. The toolbar's
 *  Brand control still applies. */
export const AcrossSurfaces: Story = {
  args: { name: 'sparkle' },
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-02">
      {MODES.map((mode) => (
        <div key={mode} data-mode={mode} className="flex items-center gap-03 rounded-2xl bg-surface-section p-03">
          <span className="w-[56px] font-manrope text-caption text-text-secondary">{mode}</span>
          <Illustration name="sparkle" colour="primary" className="w-[64px]" />
          <Illustration name="sparkle" colour="secondary" className="w-[64px]" />
          <Illustration name="sparkle" colour="tertiary" className="w-[64px]" />
          <Illustration name="vinyl" colour="feature" className="w-[64px]" />
          <Illustration name="vinyl" colour="primary" className="w-[64px]" />
          <Illustration name="grapes" colour="primary" className="w-[64px]" />
          <Illustration name="grapes" colour="feature" className="w-[64px]" />
          <Illustration name="seal" className="w-[64px]" />
        </div>
      ))}
    </div>
  ),
};
