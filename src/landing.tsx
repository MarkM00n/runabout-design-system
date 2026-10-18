// Standalone entry for the Vines & Vinyl landing page — the public site
// Netlify serves (npm run build:landing, netlify.toml). The page itself is
// src/examples/VinesAndVinylLanding.tsx, the same component Storybook renders;
// this only mounts it. landing.css is index.css — Tailwind, the tokens and
// self-hosted Manrope, exactly what .storybook/preview.tsx loads — plus a
// Tailwind @source, so the live page and the Storybook stories render from
// one stylesheet.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './landing.css';
import { VinesAndVinylLanding } from './examples/VinesAndVinylLanding';

createRoot(document.getElementById('vines-and-vinyl')!).render(
  <StrictMode>
    <VinesAndVinylLanding />
  </StrictMode>,
);
