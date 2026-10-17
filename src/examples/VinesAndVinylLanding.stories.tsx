import type { Meta, StoryObj } from '@storybook/react-vite';

import { VinesAndVinylLanding } from './VinesAndVinylLanding';

// Source: Figma section "06 · Web — Landing page" (1336:396) — the desktop
// (1325:1674), tablet (1328:55) and mobile (1328:2697) frames. A composed
// marketing page, not a reusable design-system component: Input and Button
// are the real components it uses; the art is VinesAndVinylArt.tsx.
//
// The page is fluid, not three fixed layouts (see VinesAndVinylLanding.tsx's
// header). Mobile, Tablet and Desktop pin the viewport to each frame's exact
// width so the render can be compared one-to-one with Figma; Fluid has no
// fixed viewport — resize the canvas to see the in-between widths.
//
// The page pins data-brand="vines-and-vinyl" and every section sets its own
// data-mode, so neither the toolbar's Brand nor its Mode control changes it —
// that's deliberate: this page only exists in the Vines & Vinyl brand.
const FRAME_VIEWPORTS = {
  landingMobile: { name: 'Landing · Mobile (390)', styles: { width: '390px', height: '1991px' }, type: 'mobile' },
  landingTablet: { name: 'Landing · Tablet (768)', styles: { width: '768px', height: '1797px' }, type: 'tablet' },
  landingDesktop: { name: 'Landing · Desktop (1440)', styles: { width: '1440px', height: '1443px' }, type: 'desktop' },
} as const;

const meta = {
  title: 'Examples/Vines & Vinyl/Landing Page',
  component: VinesAndVinylLanding,
  parameters: {
    layout: 'fullscreen',
    viewport: { options: FRAME_VIEWPORTS },
  },
} satisfies Meta<typeof VinesAndVinylLanding>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: { value: 'landingMobile', isRotated: false } },
};

export const Tablet: Story = {
  globals: { viewport: { value: 'landingTablet', isRotated: false } },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'landingDesktop', isRotated: false } },
};

export const Fluid: Story = {};
