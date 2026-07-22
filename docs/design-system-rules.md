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
[§5 Documentation](#5-documentation) and [§6 Foundations](#6-foundations)
below, and `scripts/design-sync.js` for the implementation.

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
  Storybook build) and holds, per check category: `pass`, `fail`/`warn`
  counts, and the `open` issues themselves (`checkType`, `file`, `line`,
  `message`, `fix`) — not just a boolean. This is what powers the
  "Validation Status" section and DesignOps metadata block on each docs
  page. Don't hand-edit it.
- **`history` is a real before/after diff, never asserted.** Each run reads
  the *previous* committed report before overwriting it; any issue that was
  open last run but isn't open now gets appended to `history` with a
  `resolvedAt` date. A component's history starts empty and only grows when
  a run actually observes an issue disappear — it is never backfilled from
  memory or written by hand. (The six components this system started with
  have no recoverable pre-history: issue-level detail didn't exist until
  this history mechanism shipped, so their history starts at `[]` regardless
  of what was fixed before then — see the dashboard's own "first-time pass
  rate" note for the fuller explanation.)
- **`src/design-docs/validation-report.generated.json` is the single source
  of truth for validation numbers.** It's the same per-component
  computation as the `ComponentName.validation.json` files, aggregated into
  one file in the same `design-sync` run — not a second, independent
  computation. The dashboard, Storybook's "Validation Status" section, and
  the PR-comment workflow (`.github/workflows/validation-report-comment.yml`)
  all read one of these two files; none of them re-run the checks
  themselves. If a number ever looks wrong, the fix is in `design-sync.js`'s
  check functions, not in whichever surface displayed it.
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

## 6. Foundations

Foundation pages (`src/design-docs/foundations/*.mdx`, one per category:
Colours, Typography, Spacing, Radius, Shadows, Motion, Breakpoints) document
the token scale itself, separately from any one component. `design-sync`
generates `src/design-docs/foundations-data.generated.json` on every run —
the pages render that, they don't hand-list token values.

- **Read from `tokens.css`/`tokens.json`, never re-derive values by another
  path.** A Foundation page's numbers must trace back to the same two files
  every component check already treats as the source of truth.
- **A category gets its `.mdx` page from the shared template, not by hand.**
  `generateFoundationPageStub()` writes any missing required page (see
  `REQUIRED_FOUNDATION_PAGES`/`FOUNDATION_PAGE_CATEGORY` in
  `scripts/design-sync.js`) from one template — Breakpoints was never
  hand-authored, it was generated the first time `design-sync` ran with it
  in the required list. Adding an 8th category means adding one line to
  that list and one branch in `buildFoundationData`, not writing a new MDX
  file.
- **"Used By" is computed, not asserted.** It's built by scanning every
  component's source for real usage (the same suffix-match rule
  `extractTokensUsed` already uses, inverted into a token → components map)
  — never hand-typed, so it can't silently drift from reality.
- **An empty category is a valid, honest state — not something to fill with
  invented values.** Shadows has zero tokens: the Figma file has no effect
  styles (confirmed via `getLocalEffectStylesAsync`) and no component uses
  `box-shadow`. Breakpoints has exactly one, for the same reason applied to
  a different category: no Figma breakpoint variables exist, and only one
  breakpoint value (`1024px`) is used anywhere in this codebase — that gets
  formalized as a real token; a full `sm`/`md`/`lg`/`xl` scale does not get
  invented just because Tailwind ships one by default. Pages say so plainly
  rather than fabricating scale that doesn't exist anywhere in this system.
- **A token can be real and still show zero *named* consumers.** Motion's
  `duration-standard`/`ease-standard` aren't Figma-sourced — they formalize
  a value already used identically via Tailwind's literal
  `duration-150 ease-out` in five components. That literal usage is tracked
  as a distinct "not yet migrated" consumer on the token's row, not hidden
  and not conflated with the named-token usage count.
- **"Documented" means a specific note, not just a non-empty string.** Every
  token always renders *something* in its Description column — a per-token
  comment in `tokens.css` if one exists, otherwise a generic per-category
  fallback ("Color token in the 'action' group."). Only the specific case
  counts as `documented: true`; the Foundation Coverage check's "No
  undocumented tokens" flags the generic-fallback case as a WARN nudge to
  write a real one, not a FAIL — a token is never silently blank.
- **Color tokens split into two tiers, mirroring Figma's own two variable
  collections.** "Semantic" tokens (`action`, `border`, `text`, `surface`,
  `state` — Figma's *Semantic* collection) are purpose-named and get the
  full detailed table, same as every other category. "Primitive" tokens
  (`sand`, `terracotta`, `rose`, `burgundy`, `amber`, `olive`, `grey`,
  `cream` — Figma's *Primitives* collection, 71 raw palette steps) render as
  a compact swatch grid grouped by family instead (`PrimitivePaletteGrid` in
  `FoundationPage.tsx`) — 71 individual table rows would be unusable, and a
  raw palette step doesn't carry the kind of purpose-specific usage note a
  semantic token does. `isPrimitiveColorGroup()` in `design-sync.js` is what
  decides which tier a color group belongs to.
- **A primitive's ramp position counts as real documentation, not a
  generic fallback.** Writing 71 individual "this is step 3 of 9" comments
  by hand would be pure busywork — a primitive's position in its ramp *is*
  its complete, honest description. `rampPositionUsage()` generates that
  string automatically ("Sand palette — step 400 (4 of 9 in the ramp).") and
  it's treated as `documented: true`, exempting primitives from the
  otherwise-correct "no undocumented tokens" WARN that semantic tokens still
  get nudged by. Only a handful of primitives that a semantic token
  explicitly aliases into (e.g. `sand-400`, consumed directly by `Card`)
  carry a real per-token comment on top of that fallback.

## 7. Surface pairings

Every text/link/button token pairs with exactly one surface — components
never choose text colours freely; the surface decides. Sourced from Figma's
"Surface Pairings" spec (`Design System` file, node `235:14`) and
cross-checked against a real WCAG 2.1 contrast calculation for every pairing
below, not eyeballed. Regenerated 2026-07-19 from a token sync that darkened
`border-focus`/`text-highlight`/`state-focus` (Amber/100 → Amber/25,
`#df8e10` → `#88570a`) and `surface-feature` (Terracotta/100 darkened,
`#c4582a` → `#a74b24`, specifically so `text-inverse` clears AA on that
surface).

| Surface | Text tokens · contrast ratio |
|---|---|
| `surface-primary` (`#f7e7d2`) | text-primary · 11.5:1 · text-secondary · 5.1:1 · text-muted · 5.6:1 · text-link · 5.1:1 · text-button · 5.1:1 · text-highlight · 5.1:1 · state-error · 5.3:1 · state-success · 5.9:1 |
| `surface-secondary` (`#3d4a2e`) | text-inverse · 8.1:1 · text-link-inverse · 5.0:1 · text-button-inverse · 5.0:1 |
| `surface-tertiary` (`#fefbf8`) | text-primary · 13.5:1 · text-secondary · 6.1:1 · text-muted · 6.6:1 · text-link · 6.0:1 · text-button · 6.0:1 · text-highlight · 6.0:1 · state-error · 6.3:1 · state-success · 6.9:1 |
| `surface-inverse` (`#2f2c28`) | text-inverse · 11.8:1 · text-highlight-inverse · 5.3:1 · text-link-inverse · 7.4:1 · text-button-inverse · 7.4:1 |
| `surface-feature` (`#a74b24`) | text-on-feature · 4.9:1 · text-inverse · 4.9:1 |
| `surface-emphasis` (`#2a2d1e`) | text-inverse · 12.0:1 · text-highlight-inverse · 5.4:1 · text-link-inverse · 7.5:1 · text-button-inverse · 7.5:1 |
| `action-primary` (`#f8ebda`) | text-on-action · 11.8:1 · text-link · 5.2:1 · text-button · 5.2:1 · text-highlight · 5.2:1 |
| `action-highlight` (`#df8e10`) | text-on-highlight · 5.3:1 |
| `state-success` (`#166534`) | text-inverse · 6.1:1 |
| `state-warning` (`#88570a`) | text-inverse · 5.2:1 |
| `state-error` (`#b91c1c`) | text-inverse · 5.5:1 |

- **`surface-feature` has no amber primitive that clears AA against it** — it
  sits at mid-luminance, so no shade of amber (the interactive-text family)
  gets there. That's why it gets its own dedicated `text-on-feature` token
  (aliasing the same value as `text-inverse`, `#f8ebda`) instead of
  `text-link`/`text-button`/`text-highlight`. Links on `surface-feature`
  additionally get an underline for distinction from body copy, since colour
  alone can't separate them here — see Checkbox-style patterns for how a
  non-colour affordance substitutes when contrast rules out a colour one.
- **This table covers text contrast, not border contrast** —
  `border-focus`/`state-focus` (both `#88570a`, Amber/25) aren't in it, but
  the same darkening that produced Amber/25 drops their contrast to ~2.3:1
  against `surface-inverse`/`surface-secondary` — under the WCAG 1.4.11 3:1
  minimum a focus indicator needs against its surroundings.
  `border-focus-inverse` (`#df8e10`, Amber/100 — confirmed by the token's
  creator during PR cross-review, correcting an initial pattern-matched
  guess of Amber/400) exists in the token set as a partial fix: it clears
  3:1 on `surface-inverse`/`surface-secondary`/`surface-emphasis`, but still
  falls short on `surface-feature` (2.18:1 — the Card CTA case). Deliberately
  **not** wired into any component by the 2026-07-19 sync — see that sync's
  validation report before adopting it.
- **`text-on-action`, `text-on-highlight`, `text-on-feature`, and
  `text-highlight-inverse` had no live Figma node binding to confirm their
  hex against at sync time** — Figma's own documentation pages hadn't
  caught up to these tokens yet. Their values were back-solved from the
  ratios in this table against the confirmed primitive ramp (see the
  corresponding `tokens.css` comments for the exact derivation), then
  confirmed exactly right during PR cross-review.

## 8. Where fixes belong

A fix belongs in whichever layer actually owns the mistake. Conflating the
two either hides a design problem behind a code patch — so it silently
recurs the next time the design is touched — or turns a genuine
implementation bug into a demand that a designer go edit Figma for
something Figma never got wrong. The Warning badge's contrast near-miss is
the case that motivated writing this down: `state-warning` was briefly
rebound in Figma to a value (Amber/50) that fails WCAG AA against
`text-inverse`. The right move was to report that to design and get it
rebound — not to quietly swap Badge's text color in code to compensate for
a background value the design file itself didn't actually intend.

- **A design-originated problem gets reported, not patched.** If the root
  cause is in the design — an unbound or wrong token value, a variable
  bound to the wrong thing, an ambiguously named variant or property, a
  missing or unhelpful component description — say so plainly, state
  exactly what needs to change in Figma (which variable, which node, which
  property), and stop. Don't generate code that works around it, and don't
  silently "correct" the value in `tokens.css`/`tokens.json` to something
  the design file doesn't actually say.
- **A code-originated problem gets fixed in code**, same as every other
  rule in this document: a wrong Tailwind class, incorrect ARIA wiring, a
  markup structure using the wrong native element, a computed style that
  doesn't match a token that IS correctly bound in Figma. Nothing about
  this rule changes how those get handled — fix them directly.
- **A code-side patch for a design problem only happens on explicit
  request**, and gets labeled — in a code comment and in whatever's told to
  whoever asked — as a temporary workaround, never presented as the real
  fix. The underlying Figma-side gap stays reported regardless of whether a
  temporary patch also goes in.
- **Telling design from code apart:** if a value, name, or gap is
  verifiably wrong (or verifiably right) in the Figma file itself — checked
  via `get_variable_defs`, `boundVariables`, a component's description
  field, or a live Plugin API read, not eyeballed — the problem lives in
  Figma, full stop, no matter how trivial a code-side fix would be. If
  Figma's value is correct and the generated/rendered code doesn't match
  it, or introduces a bug the design never asked for (bad ARIA, the wrong
  native element, a rem-scaling slip), the problem lives in code.

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
