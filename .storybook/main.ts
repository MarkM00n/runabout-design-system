import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  // Serves the manager's own assets. `.storybook/` isn't served by default,
  // and the manager renders outside the preview iframe, so it can reach
  // neither the preview's bundled CSS nor its fonts — both need real static
  // files at a stable URL.
  //
  // The Manrope faces are mapped straight out of @fontsource rather than
  // copied into the repo: the preview already self-hosts that exact package
  // (see src/index.css), and a committed copy would be a second source of
  // the same font, free to drift the next time the dependency is updated.
  staticDirs: [
    { from: './brand', to: '/brand' },
    { from: '../node_modules/@fontsource/manrope/files', to: '/brand/fonts' },
  ],
};
export default config;
