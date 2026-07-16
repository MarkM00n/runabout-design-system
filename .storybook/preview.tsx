import type { Preview } from '@storybook/react-vite'

import '../src/index.css'
import { DocsPage } from '../src/design-docs/DocsPage'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },

    // Registering this globally is what makes the design-system docs layout
    // (Description/Usage/Do-Don't/Variants/States/Tokens/A11y/Validation
    // Status/Controls/Code Example) automatic for every autodocs-tagged
    // component — see src/design-docs/DocsPage.tsx and types.ts. This
    // doesn't affect the Foundations/*.mdx pages, which are standalone docs
    // entries (a bare <Meta title="..." /> with no attached component),
    // not synthesized autodocs pages.
    docs: {
      page: DocsPage,
    },

    options: {
      storySort: {
        order: ['Foundations', ['Colours', 'Typography', 'Spacing', 'Radius', 'Shadows', 'Motion'], 'Components'],
      },
    },
  },
};

export default preview;