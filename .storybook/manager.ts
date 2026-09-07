import { addons } from 'storybook/manager-api';

import { RunaboutTheme } from './RunaboutTheme';

// Storybook 10 ships `create`/`addons` from the `storybook` package itself
// (`storybook/theming`, `storybook/manager-api`); the standalone
// `@storybook/manager-api` package this repo's handover named is the pre-9
// path and isn't installed. Same API, current import specifier.
addons.setConfig({
  theme: RunaboutTheme,
  // Foundations -> Components -> Prototypes, matching preview.tsx's storySort.
  sidebar: {
    showRoots: true,
  },
});
