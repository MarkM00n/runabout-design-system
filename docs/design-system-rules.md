# Design System Validation Rules

Rules for adding or reviewing components in `src/components/`. These aren't
style preferences — every rule here exists because a specific mistake
happened at least once while building this system (the rem-scaling bug, the
Card CTA-stretch bug, the illegible Checkbox story) and got caught by
checking against a rendered instance instead of trusting the code. That's
the posture this whole document assumes: **the source of truth is the
rendered, computed output — not the JSX, not the class list, not "it looks
consistent with the sibling component."**

Stack: React + TypeScript + Tailwind v4 (CSS-first `@theme` config) +
Storybook. Design source: Figma file *Design System*
(`JpFA7KtVlSOrM9fIYYgOsn`), inspected via the Figma MCP `use_figma` tool
(Plugin API), not the REST-based `get_metadata` tool — see
[Sourcing Figma data](#sourcing-figma-data) below.

Pipeline: Figma → Component Generation → **design-sync Validation** →
**Documentation Generation** → Storybook → Prototype. `npm run design-sync`
covers the two bolded stages in one command — see
[§5 Documentation](#5-documentation) below, and
`scripts/design-sync.js` for the implementation.

---

## 1. Token compliance

- **Every color, spacing, radius, and typography value must trace to a
  token** in `src/styles/tokens.css` (the `@theme` block). If you're about
  to write a raw hex code or a raw px value into a component's class list,
  stop and check whether a token already covers it.
- **Never invent a token from a guess.** A token is only added after
  confirming its value against an actual Figma variable binding (via
  `get_variable_defs` or a `use_figma` inspection script) — not typed from
  memory, not eyeballed off a screenshot.
- **New tokens go in both files, kept in sync**: `src/styles/tokens.css`
  (the `@theme` declaration Tailwind consumes) and `src/tokens/tokens.json`
  (the structured source-of-truth record). A token that exists in one but
  not the other is a bug.
- **Don't collapse two tokens into one just because their values currently
  match.** `sand-400` and `surface-primary` are the same hex today but are
  bound to different Figma variables — aliasing them assumes that
  coincidence is permanent. Keep distinct Figma bindings as distinct tokens,
  and say so in a comment if the duplication looks like a mistake to a
  future reader.
- **The root-font-size trap:** `src/index.css` sets the page's root
  font-size to `18px`, not the browser default `16px`. Every one of
  Tailwind's `rem`-based utilities (`h-12`, `w-6`, `rounded-2xl`, `gap-4`,
  the entire default spacing/sizing scale) silently renders **1.125× too
  large** as a result. This has caused real shipped bugs twice (Button's
  height/radius, Checkbox's box size, Select's chevron size). The rule:
  - Custom tokens registered in `tokens.css` are already px-based — safe to
    use (`px-03`, `rounded-2xl`, `text-h6`, etc.).
  - Any dimension pulled directly from Figma that ISN'T backed by a custom
    token (an icon size, a one-off box size) must use Tailwind's arbitrary
    `[Npx]` syntax (`h-[24px]`, `w-[16px]`) — **never** the bare numeric
    scale (`h-6`, `w-4`).
  - When in doubt, verify with `getComputedStyle()` against a live render
    (see [Design parity](#4-design-parity), not by reading the class name.
- **Unbound Figma values stay literal, not aliased.** If a Figma node's
  padding/gap/radius/color isn't bound to a variable (check
  `node.boundVariables` when inspecting), implement it as a literal
  arbitrary value (`p-[48px]`) — even if it happens to match an existing
  token's value. Silently mapping it onto that token claims a relationship
  the design file doesn't actually have, and breaks the moment either value
  changes independently. Leave a comment noting it's unbound.
- **Naming:** component names follow the native HTML element they wrap
  (`Select`, not `Dropdown`; `Textarea`, not `TextBox`), even when that
  differs from Figma's literal component name. Note the Figma source name in
  a comment so the mapping is traceable.

## 2. Accessibility

- **Real native elements, always.** A button is a `<button>`, a text input
  is an `<input>`, a multi-line field is a `<textarea>`, a dropdown is a
  `<select>`, a checkbox is `<input type="checkbox">`. Never a styled `<div>`
  standing in for a semantic control, even if it'd be visually easier.
- **Custom-styled native controls keep the real element in the DOM.** For
  controls that need a fully custom look (`Checkbox`), hide the native input
  visually (`sr-only`), never remove it or set `display:none` /
  `visibility:hidden` — those pull it out of the accessibility tree and
  break keyboard operation. Decorative visual elements standing in for it
  get `aria-hidden="true"`.
- **Focus must be visible and must use `:focus-visible`, not `:focus`.**
  `:focus` also matches mouse clicks, which shows a keyboard-only focus ring
  to mouse users and doesn't match what Figma's "Focused" variant depicts.
- **Disabled is a real attribute, not a style.** Use the native `disabled`
  attribute (blocks focus and interaction for free) and pair it with
  `disabled:cursor-not-allowed disabled:pointer-events-none` so hover states
  can't visually "leak" through on a disabled control.
- **Dark-backdrop tokens must be flagged, not silently shipped illegible.**
  If a component's tokens include something like `text-inverse` or
  `border-default` that's clearly meant for a dark/colored surface, that's
  fine — Figma does this deliberately — but the component (or its story,
  see below) must make that assumption legible rather than rendering
  near-invisible pale-on-white by default.
- **Spot-check contrast, don't assume it.** The default state passing
  contrast doesn't mean the hover or disabled state does — check text-on-fill
  contrast for every state that changes color, especially anything using a
  `-hover` or `-muted` token.
- **Flag small touch targets.** Anything under ~44px in either dimension
  that could plausibly be used on a touch surface (the `small` size variants
  in this system run 32px) is worth a note, not a silent ship.

## 3. Storybook coverage

- **Every component gets a co-located `ComponentName.stories.tsx`** in the
  same folder as the component (`src/components/ComponentName/`), plus an
  `index.ts` barrel re-exporting the component and its types.
- **Stories must cover every variant × size combination that materially
  changes appearance**, plus a `Disabled` story, plus any state that isn't
  purely a CSS pseudo-class Storybook can't demonstrate statically (e.g.
  `Checked`/`Unchecked` for `Checkbox`, since `:hover`/`:focus-visible` are
  fine to leave to manual interaction but `checked` needs its own story).
- **`tags: ['autodocs']` is required** on every component's story meta.
- **If a component's tokens assume a non-default backdrop, its story must
  supply that backdrop via a `decorators` entry** — don't rely on
  Storybook's default white canvas to happen to work. This is a Storybook
  authoring responsibility, not a component bug (see `Checkbox`'s story for
  the pattern).
- **`.storybook/preview.tsx` must import the global stylesheet** (the one
  with `@import 'tailwindcss'` and the tokens import). If you touch preview
  config, verify this import is still present — its absence was a real gap
  caught early in this system's build-out, and it makes every component
  render unstyled in the canvas.

## 4. Design parity

This is the rule that catches what the other three miss: **matching source
code to a Figma screenshot by eye is not verification.** Every bug caught
during this system's build-out (the rem-scaling bug, the Card CTA
stretching to full width, Select's chevron and Checkbox's box both
independently hitting the same rem bug, the illegible Checkbox story) was
found by rendering the component and measuring it, not by reading the JSX.

- **Never mark a component done because it compiled or because it "looks
  right" in a screenshot glance.** Run it through a live Storybook instance
  and pull `getComputedStyle()` values (via Playwright, or the Chrome
  extension if connected) for at least: background/border/text color,
  border-radius, height, padding, and font-size — across every size and
  state variant — and diff them against the literal values extracted from
  Figma.
- **Don't assume sibling components share a rule.** `Button`'s radius steps
  down at the `small` size; `Input`, `Select`, and `Textarea` all stay pill
  at both sizes. Assuming "it's probably the same as the last component"
  is exactly how the radius/height bugs shipped — check each component's
  own Figma data independently.
- **A discrepancy gets fixed and re-verified before merge**, not filed as a
  known issue without explicit sign-off from whoever's driving the work.
  Fix → rebuild → re-check the specific value that was wrong → confirm the
  fix didn't disturb anything else nearby.
- **Capture at least one screenshot per component** as a final human-legible
  sanity check on top of the computed-style diffing — numbers can match and
  a layout can still look visually wrong (this is exactly how the Card
  CTA-width bug was caught: the computed styles for color/radius/height were
  all already correct, and the bug was only visible in the screenshot).

## 5. Documentation

Documentation is a pipeline output, not an afterthought bolted on after a
component ships — every component gets a consistent Storybook docs
experience automatically, driven by one shared page template
(`src/design-docs/DocsPage.tsx`, registered globally via
`.storybook/preview.tsx`'s `parameters.docs.page`) rather than hand-authored
per component.

- **Every component gets a co-located `ComponentName.docs.ts`** exporting a
  `ComponentDocMeta` (see `src/design-docs/types.ts`): description, usage
  guidelines, do/don't, variants, states, accessibility notes, and a short
  code example. This is the one thing that *is* hand-authored — prose needs
  human judgment, which is deliberately the one thing `design-sync` won't
  auto-generate.
- **`design-sync` auto-generates a starter `ComponentName.docs.ts` when one
  is missing**, deriving `variants` from the component's exported
  `FooVariant`/`FooSize` union type and `states` from which Tailwind state
  variants (`hover:`, `focus-visible:`, `disabled:`) actually appear in the
  source. Prose fields are left as clearly-marked `TODO` placeholders —
  those fail the *quality* check (WARN, not FAIL, since the structure is
  present) until a human replaces them, but don't block the file from
  existing.
- **"Design Tokens Used" is never hand-maintained.** `design-sync` scans the
  component's source against the registered token names in `tokens.css` and
  writes the result into `ComponentName.validation.json`, which the docs
  page imports directly — the same "don't hand-maintain what can be
  verified against source" posture as §1's token-compliance rule.
- **`ComponentName.validation.json` is a generated, committed artifact.**
  It's regenerated on every `design-sync` run (including in CI before the
  Storybook build) and holds the pass/fail per check category plus a
  `lastValidated` date — this is what powers the "Validation Status" and
  DesignOps metadata block on each docs page. Don't hand-edit it.
- **A stub with `TODO` markers is not "documented."** `design-sync`'s
  documentation check parses the actual `docs.ts` object (not just "does
  the file exist") and treats unresolved `TODO` content as incomplete.
  Passing documentation coverage means real prose, not a scaffold.
- **Autodocs stays wired globally, not per component.** The whole point of
  the shared `DocsPage` template is that a new component gets the full
  section layout for free by exporting the right shape — if a future
  component needs a *different* docs layout, that's a signal to extend the
  shared template with a conditional section, not to fork a bespoke MDX
  file for that one component.

## Sourcing Figma data

- Use the `use_figma` tool (Plugin API) for inspection, not `get_metadata`
  (REST API) alone. `get_metadata` under-reported this file's page list (1
  of 7 actual pages) during this system's build-out — `figma.root.children`
  via `use_figma` is the authoritative source for what pages/components
  exist.
- Pull `node.boundVariables` directly rather than inferring a token from a
  visually-matching hex value — two Figma colors can be identical by
  coincidence while being bound to different variables (see the
  token-compliance rule on not collapsing tokens above).
- When a component has multiple variants (size × state, or more), sample
  enough of them to confirm the pattern holds — don't inspect one variant
  and assume the rest follow the same rule linearly (Checkbox's Disabled
  state recoloring both the checkmark *and* the label, not just the border,
  was only caught by checking a real Disabled sample rather than assuming
  it was "the same treatment, dimmed").
