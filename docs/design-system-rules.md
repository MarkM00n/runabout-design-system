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
- **Colour values are generated, not typed (since 2026-10-16).**
  `npm run tokens:generate` writes every colour value in both files — the
  `@theme` values, the mode blocks and the brand blocks — from the latest
  `src/tokens/figma-export-*.json`. A new colour token needs one
  hand-written line in `@theme` with a comment saying what it is for; the
  generator refuses to run until that line exists, then fills in its value.
  `npm run tokens:check` fails if either file has drifted from the export.
- **Don't collapse two tokens into one just because their values currently
  match.** `surface-400` and `surface-section` are the same hex on a light surface
  today but are bound to different Figma variables — aliasing them assumes
  that coincidence is permanent, and `surface-section` alone changes with
  the mode. Keep distinct Figma bindings as distinct tokens, and say so in a
  comment if the duplication looks like a mistake to a future reader.
- **Primitive families were renamed on 2026-09-07** to match Figma's own:
  Sand → **Surface**, Terracotta → **Brand**, Rose → **Soft**, Burgundy →
  **Deep**, Amber → **Accent**, Olive → **Ink**, Grey → **Neutral**, Cream →
  **Paper**, Blue → **Focus**. The light→dark numbering from 2026-08-05 is
  unchanged (50 = lightest). Any code, comment or doc using the old family
  names is stale — resolve against live Figma bindings, never against
  remembered names.
- **Semantic and primitive tokens share the `surface` prefix, on purpose.**
  Figma has both `surface/section` (semantic) and `Surface/400` (primitive),
  and `tokens.css` mirrors that rather than renaming either away from its
  source. They're told apart by whether the final segment is numeric — the
  rule `isPrimitiveColorToken()` and `parseColorHexTokensFromBlock()`'s
  `(?![0-9])` lookahead both apply in `design-sync.js`. A new semantic token
  must therefore never be named with a trailing number.
- **Figma's `Event/*` primitives are deliberately not registered.** They're
  print and campaign colours with no semantic role, so they're recorded in
  `tokens.json` for traceability but kept out of `@theme` — no Tailwind
  utility is generated for them, and no component may use one.
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
- **Never pair `outline-none` with `focus-visible:outline-*` on the same
  element, even scoped to `focus:`.** Tailwind v4 composes every outline
  utility through one shared custom property (`--tw-outline-style`). Any
  class that sets it to `none` — `outline-none`, or `focus:outline-none` —
  permanently wins over `focus-visible:outline`'s attempt to set it back
  to `solid`, regardless of source order or CSS specificity: `outline-width`
  and `outline-color` still compute correctly, but `outline-style` stays
  stuck at `none` and nothing paints. Real incident (2026-08-08): shipped
  in PR #70 with `design-sync` passing clean, only caught by clicking into
  a live Storybook instance and reading `getComputedStyle` — a static
  token-name check cannot see this class of bug. The fix is to not
  suppress the outline at all; `focus-visible:` already scopes correctly
  on its own (see `Tab.tsx`, which never had a suppression utility and
  never had this bug).
- **Disabled is a real attribute, not a style.** Use the native `disabled`
  attribute (blocks focus and interaction for free) and pair it with
  `disabled:cursor-not-allowed disabled:pointer-events-none` so hover states
  can't visually "leak" through on a disabled control.
- **Disabled visuals are opacity, not colour swaps (rule changed
  2026-08-05, MD3 pattern).** A disabled control renders its Default
  appearance at reduced opacity via the `opacity-disabled` token (Figma:
  `opacity/disabled`, value 38%) — `disabled:opacity-[38%]` sourced from
  the token, never a hardcoded number and never a separate set of
  disabled fill/text colours. In Figma, every Disabled variant is the
  Default variant's exact bindings with layer opacity bound to
  `opacity/disabled` — generated code must mirror that: same colour
  tokens as the enabled state, opacity applied at the control's root.
  The old `action-disabled`/`state-disabled` fill-swap treatment is
  retired for components (those tokens remain only for standalone
  disabled text outside components). Disabled contrast is exempt under
  SC 1.4.3 — don't "fix" a disabled state's ratio by deviating from
  this rule.
  **Apply it once, at the control's root.** Nesting a second
  `opacity-disabled` inside multiplies rather than replaces. Real incident
  (2026-09-07): `Input/Checkbox`'s four Disabled variants bound it on the
  variant root *and* on the `box` child, rendering the box at ~14% against
  its own label at 38% — a checkbox outline noticeably fainter than the text
  beside it. Caught by reading the bindings rather than the screenshot, since
  both layers were correctly bound to the right variable; the defect was
  that one of them shouldn't have been bound at all. Fixed in Figma in the
  same sync. The tell was inconsistency: the nine other component sets all
  applied it once.
- **Focus visuals are an offset outer ring (token renamed 2026-09-07).**
  Figma's Focused variants carry a `focus-ring` overlay: a 2px
  **`state-focus`** ring offset 2px outside the control's bounds, with the
  control's footprint unchanged. In code that's an `outline` (2px,
  `outline-offset: 2px`, colour from `state-focus`) on `:focus-visible` —
  not a box-shadow hack, not a `ring-*` utility, and not an inset border
  that changes layout. `state-focus` replaces `border-focus` and its three
  retired partners (`-inverse`, `-on-feature`, `-on-highlight`); it resolves
  per surface mode and clears 3:1 on all four — see §7.
  **The 2px gap is load-bearing**, not just spacing: it means the ring's
  adjacent colour is the surface rather than the control's own fill, which
  is what lets one token work even on `Button`'s amber accent variant. An
  inset ring there measured 1.97:1; the offset ring measures against the
  surface at 4.4:1 or better. `Card/Event` is the one deliberate exception,
  stroking its own root with no offset because that's what its Figma Focus
  variant does.
- **A component that has no background must not set `data-mode`.** Under the
  2026-09-07 architecture only surfaces own a mode; everything else
  inherits. Self-scoping a mode onto a control pins its text to a context
  its real backdrop may not share — `Button`'s secondary variant did exactly
  that and had to be unwound. See §7.
- **Mode-context tokens must be flagged, not silently shipped illegible.**
  The Figma variables resolve per surface mode (On Light / On Ink / On
  Dark / On Brand / On Accent / On Soft — see §7). A component that owns a surface carries
  that context in its token *values*; a component that doesn't inherits it
  from whatever it's placed on. Either way the assumption has to be legible
  — supply the matching backdrop in the story rather than rendering
  near-invisible pale-on-light by default.
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

That verification is real and still expected — it's just not automatic.
**Live rendering (Storybook + `getComputedStyle()`) is a separate,
explicit step, run on purpose by whoever's driving the work, or by CI —
never launched automatically as part of generating a component or running
the Ready-for-AI check.** Storybook's startup cost makes firing it on
every build turn a drag on the normal flow; keeping it explicit is what
keeps that flow fast while still leaving the real check available
whenever someone actually wants it.

- **A component isn't verified just because it compiled, "looks right" in
  a screenshot glance, or passes `design-sync`.** `design-sync` is a
  static heuristic — it checks source against token names, not rendered
  output — and its own report says as much. When the live-render step does
  run (on request, or in CI), start a live Storybook instance and pull
  `getComputedStyle()` values (via Playwright, or the Chrome extension if
  connected) for at least: background/border/text color, border-radius,
  height, padding, and font-size — across every size and state variant —
  and diff them against the literal values extracted from Figma.
- **If the component touches a mode-variant token, verify all six modes
  (On Light, On Ink, On Dark, On Brand, On Accent, On Soft) live, not just whichever one
  Figma's reference happens to show at the time.** Checking token values against
  Figma is necessary but not sufficient — the values can be correct in
  `tokens.css` for every mode and the component can still render wrong at
  runtime for reasons no token diff would catch (the `outline-none`
  footgun above is exactly this: right tokens, wrong computed output).
  Drive Storybook's mode-switcher decorator directly via URL globals
  (`?globals=mode:ink`, `mode:dark`, `mode:brand`, `mode:accent`,
  `mode:soft`) and re-check computed styles, not just the default On Light.
  For a full page, also switch `brand:northline` and `brand:vines-and-vinyl`. This was once only done
  after being asked a second time — it should be routine, not a follow-up
  question.
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
  all already correct, and the bug was only visible in the screenshot). Like
  the rest of this section, this happens during the explicit live-render
  step, not automatically.

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
Colours, Typography, Spacing, Radius, Motion, Breakpoints) document
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
- **A nearly-empty category is a valid, honest state — not something to
  fill with invented values.** Breakpoints has exactly one token: no Figma
  breakpoint variables exist, and only one breakpoint value (`1024px`) is
  used anywhere in this codebase. That gets formalized as a real token; a
  full `sm`/`md`/`lg`/`xl` scale does not get invented just because Tailwind
  ships one by default. The page says so plainly rather than fabricating
  scale that doesn't exist in this system.
- **A category with nothing in it and no prospect of anything gets
  retired, not kept as an empty page.** Shadows was this document's own
  example of an honest empty category until 2026-09-07. An empty page is
  honest only while something might one day fill it — and the Figma file has
  never had an effect style (re-confirmed against the 2026-09-07 export,
  which carries no effect group) and no component has ever used
  `box-shadow`. The page, its `shadow` category and the `shadow` key in
  `tokens.json` were all removed. Adding shadows back means adding effect
  styles in Figma first, then one line to `REQUIRED_FOUNDATION_PAGES` and
  one branch in `buildFoundationData` — the same route any new category
  takes.
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
  `state` — Figma's *Semantic* collection, 26 purpose-named tokens) get the
  full detailed table, same as every other category. "Primitive" tokens
  (Figma's *Primitives* collection, 95 raw palette steps across Surface,
  Brand, Soft, Deep, Accent, Ink, Neutral, Paper, Green, Red, Focus, Alpha
  and Event) render as a compact swatch grid grouped by family instead
  (`PrimitivePaletteGrid` in `FoundationPage.tsx`) — 95 individual table
  rows would be unusable, and a raw palette step doesn't carry the kind of
  purpose-specific usage note a semantic token does.
  **Tier is decided per token, not per group**, because since the
  2026-09-07 rename the two tiers genuinely share a group name (`surface`
  holds both `section` and `400`). `isPrimitiveColorToken()` in
  `design-sync.js` treats a numeric final segment as the primitive marker,
  plus `alpha` and `event`, whose steps aren't numeric and which have no
  semantic members.
- **A primitive's ramp position counts as real documentation, not a
  generic fallback.** Writing 95 individual "this is step 3 of 9" comments
  by hand would be pure busywork — a primitive's position in its ramp *is*
  its complete, honest description. `rampPositionUsage()` generates that
  string automatically ("Surface palette — step 400 (5 of 9 in the ramp).")
  — counting only the group's numeric steps, so a merged group's semantic
  siblings don't inflate the denominator — and
  it's treated as `documented: true`, exempting primitives from the
  otherwise-correct "no undocumented tokens" WARN that semantic tokens still
  get nudged by. Only a handful of primitives carry a real per-token comment
  on top of that fallback — the alpha and scrim steps a semantic token
  aliases into, `Focus/900`, and the `Event/*` group, whose note is the one
  place the "print only, never registered in `@theme`" rule is recorded
  against the tokens themselves.

- **No single word on a paragraph's last line — ever (2026-10-18).** A
  paragraph, list item, caption or heading never ends with one word alone
  on its last line, at any width. This is a standing typographic rule, not
  a per-component nicety.
  - **Web:** handled once, in `src/index.css`'s base layer —
    `text-wrap: pretty` on `p`, `li`, `dd`, `figcaption`, `blockquote`;
    `text-wrap: balance` on `h1`–`h6`. Don't override it with `text-wrap`
    utilities unless the element genuinely isn't prose (a code block, a
    one-line label that must not reflow). Supported in Chromium and current
    Safari; older browsers fall back to normal wrapping, which is accepted.
  - **Email:** clients ignore `text-wrap` (Gmail strips it), so join the
    last two words of every paragraph with `&nbsp;`. Kit's rich-text editor
    silently converts `&nbsp;` back to a normal space, so copy that must
    hold it goes in an **HTML block** (see `email/vines-and-vinyl/README.md`).
  - **Figma:** check the mobile frame, the narrowest — that's where a lone
    last word shows up first. Fix it with copy or width there, not with a
    manual line break, which breaks at every other width.
  - **Real incident:** the sign-up success message ("…early birds go
    live.") and the confirmation email both shipped ending on one word on
    mobile; caught only by eye on a phone.

## 7. Surface pairings

**Regenerated 2026-10-16** from `src/tokens/figma-export-2026-10-16.json`.
The four modes of 2026-09-07 were renamed by role and two were added:
On Cream → **On Light**, On Olive → **On Ink**, On Terracotta → **On Brand**,
plus **On Accent** and **On Soft**. Appearance names stopped being true once
there was a second brand — "terracotta" is teal under Northline.

The rule is unchanged:

> **Anything with a background owns a mode. Everything else inherits.**

A surface — a section, card, modal or panel — fills with `surface-section`
and picks its colour by setting its `data-mode`. Buttons, inputs, tabs,
badges, text and icons never carry a mode; they resolve from whatever they
sit on. There is one token per role, and the surface's mode answers the rest.

The six modes and the surface each one means (Runabout values):

| `data-mode` | Figma mode | `surface-section` (Runabout) |
|---|---|---|
| `light` | On Light | `#f8ebda` Surface/400 |
| `ink` | On Ink | `#3d4a2e` Ink/900 |
| `dark` | On Dark | `#2f2c28` Neutral/800 |
| `brand` | On Brand | `#a74b24` Brand/800 |
| `accent` | On Accent | `#e39b2b` Accent/700 |
| `soft` | On Soft | `#eaadae` Soft/400 |

`light` is both the `@theme` default and an explicit block. `@theme` only
sets the initial value; a light card inside a dark section needs a rule of
its own to reset.

`surface-card` (`#fefbf8`, Surface/50) is the one other surface token. It is
**mode-invariant**, which is why `Modal`, the only component that uses it,
pins itself to `light`. See the "mode-invariant fill" warning below.

### Text and boundary tokens, per mode

Resolved Runabout value and its ratio against `surface-section` in that
mode, computed from the export with the WCAG relative-luminance formula.

| Token | On Light | On Ink | On Dark | On Brand | On Accent | On Soft |
|---|---|---|---|---|---|---|
| `text-primary` | `#2a2d1e` · 12.0:1 | `#faefe1` · 8.3:1 | `#faefe1` · 12.2:1 | `#faefe1` · 5.0:1 | `#2a2d1e` · 6.0:1 | `#2a2d1e` · 7.4:1 |
| `text-secondary` | `#4a5435` · 6.9:1 | `#c9cbbf` · 5.8:1 | `#c9cbbf` · 8.5:1 | `#f6e3cb` · 4.6:1 | `#2a2d1e` · 6.0:1 | `#2a2d1e` · 7.4:1 |
| `text-link` | `#7a4e09` · 6.1:1 | `#edc07a` · 5.6:1 | `#edc07a` · 8.2:1 | `#fbf2e4` · 5.1:1 | `#1d1b19` · 7.4:1 | `#1d1b19` · 9.1:1 |
| `text-accent` | `#a74b24` · 4.9:1 | `#edc07a` · 5.6:1 | `#edc07a` · 8.2:1 | `#faefe1` · 5.0:1 | `#1d1b19` · 7.4:1 | `#1d1b19` · 9.1:1 |
| `border-default` | `#4a5435` · 6.9:1 | `#c9cbbf` · 5.8:1 | `#c9cbbf` · 8.5:1 | `#faefe1` · 5.0:1 | `#4a5435` · 3.4:1 | `#4a5435` · 4.2:1 |
| `border-strong` | `#2a2d1e` · 12.0:1 | `#fbf3e9` · 8.6:1 | `#fbf3e9` · 12.6:1 | `#fbf3e9` · 5.2:1 | `#2a2d1e` · 6.0:1 | `#2a2d1e` · 7.4:1 |
| `state-focus` (SC 1.4.11, 3:1) | `#2563eb` · 4.4:1 | `#b3d1ff` · 6.1:1 | `#b3d1ff` · 8.9:1 | `#b3d1ff` · 3.7:1 | `#1d1b19` · 7.4:1 | `#1d1b19` · 9.1:1 |

Every text row clears 4.5:1 (SC 1.4.3) in every mode; every boundary row
clears 3:1 (SC 1.4.11). The tightest pairing is still `text-secondary` on
brand at 4.6:1 — no headroom, re-measure if either token moves.

`text-secondary` and `border-default` used to share one row. They now
differ in On Accent and On Soft: on those saturated grounds secondary text
takes the darkest ink (Ink/950) to clear 4.5:1, while the border stays at
Ink/850, which clears the 3:1 a boundary needs.

### Component-internal pairings (a fill and the text on it)

These don't depend on the surrounding surface, because the fill travels with
the text:

- `action-primary` + `text-on-action` flip together per mode — **11.5:1 in
  all six**, by construction.
- `action-highlight` + `text-on-highlight` — 5.3:1 light, 6.6:1 ink and
  dark, 8.2:1 brand, 12.2:1 accent, 5.3:1 soft.
- `illustration-highlight` + `text-on-highlight` (the date seal) — 5.3:1
  light, 6.6:1 ink, dark and brand, 12.2:1 accent, 5.3:1 soft.
- `state-*` fills + `text-on-state` — 6.28:1 error, 6.92:1 success, 6.97:1
  warning, identical in every mode.

### Illustration tokens are fills, never text

`illustration-primary`, `-secondary`, `-tertiary` and `-feature` colour the
brand illustrations — sparkles, grapes, vinyl. They resolve per mode so an
illustration stays visible on any surface, but nothing measures them as
text and nothing should be. `illustration-highlight` is the exception: it is
built to carry `text-on-highlight`, and is checked as a pair above.

`surface-media` sits behind photos and media. It is what shows while an
image loads, or when there is none. It is not a text background.

### Scrims are mode-variant now

`surface-scrim-start` → `surface-scrim-end` is the gradient over a photo
with text on it. In every mode except brand it fades transparent to 85%
Neutral/900. In **On Brand** it fades from the brand colour at 0% to solid
`Brand/800` — the same value as that mode's `surface-section`. So text below
the fade sits on a surface whose contrast is already in the table above,
and a brand section's photo fades into that brand's own colour.

Direction and stop positions are layout, not tokens. They live with the
component. Text over the photo part of the gradient — above the solid
point — is **not** covered by any automated check: its contrast depends on
the photo. Check it by eye at every breakpoint, and again whenever the image
changes.

### The status colours are fills, not text

`state-error`, `state-success` and `state-warning` are **mode-invariant** —
one value on every surface, so a status colour keeps meaning the same thing
wherever it appears. Correct for a `Badge` fill; a trap for text:

| Used as text on… | `state-error` | `state-success` | `state-warning` |
|---|---|---|---|
| light | 5.5:1 | 6.1:1 | 6.1:1 |
| ink | **1.5:1** | **1.3:1** | **1.3:1** |
| dark | **2.1:1** | **1.9:1** | **1.9:1** |
| brand | **1.1:1** | **1.2:1** | **1.3:1** |
| accent | **2.8:1** | **3.1:1** | **3.1:1** |
| soft | **3.4:1** | **3.8:1** | **3.8:1** |

**Use a `state-*` token as a fill, paired with `text-on-state`. Only put it
on text on a light surface.** Error text on a dark form is the obvious way to
get bitten — put the message on `text-primary` and carry the error meaning
with an icon, a border, or a `Badge`.

### A mode-invariant fill under mode-resolved ink is the standing hazard

`surface-card`, the `state-*` fills and `action-secondary` do not change
with the mode. Every text token does. Pair one of the first group with the
second and the ink can walk out from under the fill while the fill stays put
— which is exactly how the Vines & Vinyl Hero input reached 1.18:1
(2026-08-08) and why `Modal` and the dashboard's stat tiles both pin
`data-mode="light"` alongside their `surface-card` fill. Whenever you set a
fill that doesn't vary, ask what the mode is doing for the text on top of
it, and pin the mode if the answer is "nothing".

### Brands: a separate axis, checked through the cascade

Brand is independent of mode. `data-brand="northline"` or
`data-brand="vines-and-vinyl"` swaps values, never names; Runabout sets no
attribute. Every brand uses the same six modes and the same token names.
`scripts/generate-brand-overrides.js` writes both the mode blocks and the
brand blocks from the Figma export.

`design-sync`'s **Brand coverage** check (`checkBrandCoverage`) does two
things for every brand × mode:

1. **Resolves every token through the real cascade** — a section inside a
   brand root, brand and mode on one element, a section nested inside
   another mode, and a brand root with no mode — and fails if any token
   comes out different from the Figma value. This exists because generated
   CSS can be correct line by line and still lose in the cascade: from
   2026-09-07 to 2026-10-16 a bare `[data-brand='northline']` rule beat
   `[data-mode='dark']` on elements carrying both attributes, leaking
   Northline's light hover tint and subtle border onto its dark surfaces.
   The brand root is now `[data-brand='x']:not([data-mode])`.
2. **Measures the contrast pairs** in `BRAND_CONTRAST_PAIRS`: the text and
   boundary rows above against `surface-section`, plus the three internal
   pairs.

Worst case per brand across all six modes:

| Brand | `text-primary` | `text-secondary` | `text-accent` | `state-focus` |
|---|---|---|---|---|
| Runabout | 5.03 (brand) | 4.56 (brand) | 4.87 (light) | 3.67 (brand) |
| Northline | 4.86 (accent) | 4.86 (accent) | 5.78 (ink) | 4.57 (brand) |
| Vines & Vinyl | 4.59 (brand) | 4.74 (brand) | 4.56 (light) | 3.81 (brand) |

### Known exceptions

Failures that are known and owned report as WARN, not FAIL, so they don't
block unrelated work. Anything not listed here fails. Each lives in
`KNOWN_BRAND_CONTRAST_EXCEPTIONS` in `scripts/design-sync.js` with its reason.
Remove the entry the moment the cause is fixed.

| Brand | Mode | Pair | Ratio | Why |
|---|---|---|---|---|
| Northline | light, soft | `text-on-highlight` on `action-highlight` | 3.51:1 | Accent/800 `#2b7fd4` is a mid blue: dark text 3.5:1, white 4.1:1. No text colour clears it. A Northline palette decision. |
| Northline | light, soft | `text-on-highlight` on `illustration-highlight` | 3.51:1 | Same cause. |

### Rules that fall out of the architecture

- **A surface declares its mode; nothing else does.** If a component has no
  background, it must not set `data-mode`. `Button`'s secondary variant
  used to self-scope to dark and no longer does; `Badge` never has.
- **Scope a mode to the narrowest element that owns the background.** Not
  the nearest convenient wrapper — that shipped once and rendered
  `.section-title` near-black on dark green (2026-08-05).
- **Focus is covered everywhere.** `state-focus` clears 3:1 against all six
  surfaces. On accent and soft it is near-black, because the blue ring
  measures 2.2:1 and 2.7:1 on those grounds. The ring is drawn 2px outside
  the control with a 2px gap, so its adjacent colour is the surface, not
  the control's fill.
- **`border-default` is a legitimate boundary.** It clears 3:1 in every
  mode, so the Input family rests on it.
- **Disabled is exempt and opacity-based** — see §2.
- **This table is read at runtime, not duplicated.** `checkContrastPairings`
  in `scripts/design-sync.js` parses the per-mode table above directly
  (`parseSurfacePairingsTable`), so it cannot drift from what is written
  here. The column count moves in lockstep with `SURFACE_MODES`; it went
  from four to six on 2026-10-16.

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
- **Check `paint.opacity`, not just `paint.color`, on every fill and
  stroke.** A fill can be correctly bound to the right variable and still
  render nothing, because its own paint opacity is `0` — a fully
  legitimate, deliberate pattern (a bordered "ghost" control with no real
  background) that looks identical to a bug if you only read `.color`.
  Real incident (2026-08-08): `Input`/`Select`/`Textarea`/`Checkbox`'s
  field fill (`action/secondary`) was read as `#ffffff` and assumed solid,
  which led to "fixing" a contrast problem that didn't exist by forcing an
  explicit variable mode onto the field — the fill was actually
  `rgba(255,255,255,0)`, and the real backdrop showing through it was
  what needed to be read correctly, not overridden. The forced mode then
  produced a real, different bug (dark-on-dark) that had to be reverted.
  Always compute contrast against the *composited* result
  (`opacity × fill.color + (1 − opacity) × whatever's actually behind
  it`), never against `fill.color` alone.
- When a component has multiple variants (size × state, or more), sample
  enough of them to confirm the pattern holds — don't inspect one variant
  and assume the rest follow the same rule linearly (Checkbox's Disabled
  state recoloring both the checkmark *and* the label, not just the border,
  was only caught by checking a real Disabled sample rather than assuming
  it was "the same treatment, dimmed").

## 9. The prototype lane (`src/prototypes/`)

`src/prototypes/` is exploratory work — spikes, one-off explorations,
things being tried out — that is explicitly **not** part of the shipped
design system. It's a separate lane from `src/components/`, not a relaxed
version of it:

- **Flat files, no component contract.** A prototype is a single
  `Name.tsx` directly under `src/prototypes/` (optionally paired with a
  `Name.stories.tsx`) — no `ComponentName/` folder, no `index.ts` barrel,
  no `Name.docs.ts`, no `Name.validation.json`. Those exist to satisfy
  §3 (Storybook coverage) and §5 (Documentation), which only apply to
  `src/components/`.
- **Token compliance and accessibility/contrast rules still run**
  (`npm run design-sync` — see the script's own "Prototypes" section),
  but as a report, not a gate: violations print as a checklist, never
  fail the build or block a merge. That checklist is, by construction,
  what would need to be true before the prototype could graduate into
  `src/components/` and start being held to the full rule set above.
- **Storybook sidebar:** give a prototype's story `title:
  'Prototypes/Name'` — a separate, visually distinct top-level section
  (see `.storybook/preview.tsx`), not nested under `Components`. Every
  story under that title automatically gets a banner making clear it's
  exploratory, not shipped.
- **Graduating a prototype** means moving it into a real
  `src/components/ComponentName/` folder and building out everything
  this document requires — it isn't a location a component can stay in
  once it ships.
