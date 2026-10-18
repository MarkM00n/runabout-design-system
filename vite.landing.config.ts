// Build target for the public Vines & Vinyl landing page (npm run
// build:landing → dist-landing/, which netlify.toml publishes). Separate from
// vite.config.ts so the dashboard build, Storybook and its vitest setup are
// untouched. Root is landing/ (its index.html + public/favicon.svg); the page
// code comes from src/.
//
// VITE_SIGNUP_ENDPOINT is read at build time. Netlify sets it to
// /api/subscribe; without it the page falls back to the sign-up mock (see
// src/examples/submitSignup.ts).
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./landing', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL('./dist-landing', import.meta.url)),
    emptyOutDir: true,
  },
});
