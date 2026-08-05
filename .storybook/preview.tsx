import type { Preview } from '@storybook/react-vite'

import '../src/index.css'
import { DocsPage } from '../src/design-docs/DocsPage'

// Mirrors Figma's own Variables panel mode switcher (On Light/On Dark/On
// Feature) — see tokens.css's [data-mode] override blocks and
// design-system-rules.md §7. Surface tokens are mode-invariant by design
// (a surface's own color never changes), so the matching canvas background
// per mode has to be picked here explicitly rather than resolved from a
// single token the way text-*/border-*/action-*/icon-*/state-* are.
const MODE_BACKGROUNDS: Record<string, string> = {
  light: 'var(--color-surface-primary)',
  dark: 'var(--color-surface-secondary)',
  feature: 'var(--color-surface-feature)',
};

const preview: Preview = {
  globalTypes: {
    mode: {
      name: 'Mode',
      description: "Figma variable mode this story's canvas resolves tokens against",
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'On Light' },
          { value: 'dark', title: 'On Dark' },
          { value: 'feature', title: 'On Feature' },
        ],
        dynamicTitle: true,
      },
    },
  },
  // A component that sets its own data-mode (Card -> feature, Button's
  // secondary variant -> dark) always wins over this for its own subtree —
  // CSS custom property scoping means the innermost override applies,
  // exactly matching Figma: a frame with its own explicit mode override
  // stays that mode regardless of what the file/page around it is set to.
  // This decorator is for every component that doesn't self-scope and
  // instead depends on ambient context (the majority — Badge, Checkbox,
  // Input/Select/Textarea, Tab, Button's other three variants), so their
  // stories can actually be previewed under all three modes the way a
  // designer would in Figma, not just their one hardcoded demo context.
  decorators: [
    (Story, context) => {
      const mode = (context.globals.mode as string) ?? 'light';
      return (
        <div
          data-mode={mode}
          style={{
            background: MODE_BACKGROUNDS[mode] ?? MODE_BACKGROUNDS.light,
            padding: '2rem',
            minHeight: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Story />
        </div>
      );
    },
  ],
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
        order: [
          'Foundations',
          ['Colours', 'Typography', 'Spacing', 'Radius', 'Shadows', 'Motion', 'Breakpoints'],
          'Components',
        ],
      },
    },
  },
};

export default preview;