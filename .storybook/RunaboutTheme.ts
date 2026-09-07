import { create } from 'storybook/theming';

/**
 * Storybook manager (chrome) theme — the sidebar, toolbar and docs shell that
 * sit *around* the canvas, not the stories themselves.
 *
 * Every value here is a design token resolved to its literal hex, and that
 * duplication is deliberate rather than sloppy. The manager renders in its own
 * iframe-less shell that never loads `src/index.css`, so `var(--color-*)`
 * simply doesn't resolve there — Storybook's `create()` also needs plain
 * strings it can hand to emotion at build time, not custom properties. Each
 * value is annotated with the token it mirrors so a future token change has an
 * obvious second place to land; `npm run design-sync` cannot catch drift here,
 * because this file is chrome, not a component.
 *
 * The manager is deliberately pinned to the On Cream surface. It's the frame
 * around the work, not a fifth surface mode — letting it follow the canvas
 * mode switcher would mean the chrome restyled itself every time someone
 * previewed a component on olive or dark.
 */
export const RunaboutTheme = create({
  base: 'light',

  brandTitle: 'Runabout Design System',
  brandUrl: 'https://markm00n.github.io/runabout-design-system',
  brandImage: './brand/runabout-logo.svg',
  brandTarget: '_self',

  fontBase: '"Manrope", system-ui, sans-serif',
  fontCode: 'ui-monospace, Menlo, monospace',

  colorPrimary: '#a74b24', //   Brand/800 — terracotta
  colorSecondary: '#3d4a2e', // Ink/900 — olive; active nav item, selected state

  appBg: '#f8ebda', //                        Surface/400 — the cream the product sits on
  appContentBg: '#fefbf8', //                 Surface/50
  appPreviewBg: '#f8ebda', //                 Surface/400
  appBorderColor: 'rgba(93, 100, 64, 0.1)', // Alpha/Ink-10 — border-subtle on cream
  appBorderRadius: 8, //                      radius-md

  textColor: '#2a2d1e', //        Ink/950 — text-primary on cream
  textMutedColor: '#4a5435', //   Ink/850 — text-secondary on cream
  textInverseColor: '#faefe1', // Surface/300 — text-primary on the dark surfaces

  barTextColor: '#4a5435', //     Ink/850
  barSelectedColor: '#a74b24', // Brand/800
  barHoverColor: '#7a4e09', //    Accent/950 — text-link on cream
  barBg: '#fefbf8', //            Surface/50

  inputBg: '#fefbf8', //          Surface/50
  inputBorder: '#4a5435', //      Ink/850 — border-default on cream
  inputTextColor: '#2a2d1e', //   Ink/950
  inputBorderRadius: 9999, //     radius-full, matching Input/Text's pill
});

export default RunaboutTheme;
