import type { Meta, StoryObj } from '@storybook/react-vite';

import { CardProducer } from './CardProducer';
import { docs } from './CardProducer.docs';
import validation from './CardProducer.validation.json';
import hero from '../../assets/hero.png';

const meta = {
  title: 'Components/CardProducer',
  component: CardProducer,
  parameters: {
    layout: 'centered',
    designSystem: docs,
    designSystemValidation: validation,
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CardProducer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Producer names are kept to unaccented Latin characters on purpose — see
// the note on --font-recoleta in tokens.css. The Recoleta cut installed on
// this machine is a DEMO licence that substitutes a "latinotype" watermark
// glyph for anything outside its subset, so "Léonine" renders as
// "L[watermark]onine" at roughly 2.3x the width of a real letter.
export const Default: Story = {
  args: {
    category: 'WINE',
    name: 'Domaine Leonine',
    location: 'Roussillon, France',
    imageSrc: hero,
    imageAlt: '',
  },
};

/** Location is optional — the name and category carry the card without it. */
export const WithoutLocation: Story = {
  args: {
    category: 'CIDER',
    name: 'Oliver’s Orchard',
    imageSrc: hero,
    imageAlt: '',
  },
};

/** A longer name, to check the display face still sits correctly on the
 *  scrim once it wraps to two lines. */
export const LongName: Story = {
  args: {
    category: 'NATURAL WINE',
    name: 'Clos des Vignes du Maynes',
    location: 'Burgundy, France',
    imageSrc: hero,
    imageAlt: '',
  },
};
