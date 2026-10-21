# Design system rules — audit edition

The rules a component, page or token file is audited against. Each rule
carries one line on why it exists: every one of them comes from a bug that
shipped once, somewhere, because the rule wasn't there.

The posture behind all of them: **the source of truth is the rendered,
computed output** — not the JSX, not the class list, not "it looks like the
component next to it".

Replace the placeholders before use:

- `<tokens.css>` / `<tokens.json>` — where the token values live
- `<design-system-dir>` — where the system's components live
- `<design-file>` — the Figma file that owns the design decisions
- `<mode-attribute>` — how a surface declares its theme/mode in code
  (e.g. `data-theme`, `data-mode`, a class name), if the system has modes

---

## 1. Token compliance

- **Every colour, spacing, radius and type value traces to a token.** A raw
  hex or px value in product code is drift until proven otherwise.
  *Why: a value with no token doesn't change when the system changes.*
- **Never invent a token from a guess.** A token is added only after its
  value is confirmed against a real variable binding in `<design-file>` —
  not typed from memory, not sampled off a screenshot.
- **One value, one place.** If tokens exist in more than one file
  (CSS + JSON, or generated + hand-written), they must agree. A token in one
  but not the other is a bug. Best: generate one from the other and check it
  in CI.
- **Don't merge two tokens because their values match today.** Two tokens
  bound to different variables are a design decision, not a coincidence to
  tidy away. Aliasing them breaks the day one of them moves.
- **Unbound design values stay literal, and say so.** If the design file
  itself doesn't bind a value, implement it as a literal with a comment
  ("unbound in Figma") — don't map it onto a token it happens to match.
  That claims a relationship the design doesn't have.
- **Product code uses semantic tokens, not primitives.** A primitive
  (a raw palette step) used directly skips the layer that carries themes and
  modes. *Why: it's the first thing that breaks in a rebrand or dark mode.*
- **Watch the framework's default scale.** If the root font size isn't the
  browser default, or the token scale isn't the framework's, every
  rem-based default utility renders at the wrong size. Use the system's
  tokens or exact values. *Why: it renders a few percent off — invisible in
  review, wrong everywhere.*

## 2. Accessibility (WCAG 2.2 AA — never AAA)

- **Real native elements.** A button is `<button>`, a link is `<a>`, a
  checkbox is `<input type="checkbox">`. Never a clickable `<div>`.
- **Custom-styled controls keep the native element in the DOM** — visually
  hidden, never `display: none`. Decorative stand-ins get `aria-hidden`.
- **Focus is visible and keyboard-only:** `:focus-visible`, not `:focus`.
  Never remove the outline without a replacement in the same rule set.
  *Why: utility frameworks can let a "none" win over the focus style
  silently — only a computed-style read catches it.*
- **Disabled is a real attribute, not a style.** And disabled visuals are
  one treatment, applied once at the control's root. *Why: nesting an
  opacity treatment multiplies it.*
- **Contrast is computed, never estimated.** Text 4.5:1 (SC 1.4.3), large
  text and UI boundaries 3:1 (SC 1.4.11). Check every state that changes
  colour, not just the default. Compute against the *composited* colour —
  a transparent fill shows whatever is behind it.
- **Touch targets are at least 24×24px (SC 2.5.8).** 44px is AAA; a house
  preference, not the bar.
- **Status colours are for fills, not text** — unless measured on every
  surface they'll sit on.

## 3. Modes and theming (skip if the system has none)

- **Anything with a background owns a mode. Everything else inherits.**
  A surface sets `<mode-attribute>`; buttons, text and icons never do.
  *Why: a control that pins its own mode pins its text to a backdrop it
  may not be sitting on.*
- **Pin both directions.** A light card inside a dark section needs its own
  explicit mode; the default only applies at the root.
- **Scope a mode to the narrowest element that draws the background**, not
  the nearest convenient wrapper.
- **A fixed fill under mode-resolved text is the standing hazard.** If a
  fill doesn't change with the mode and the text on it does, the text can
  walk out from under the fill. Pin the mode alongside the fill.
- **A brand is a set of values, never a set of names.** A second brand
  swaps primitive values behind the same semantic tokens. If a brand seems
  to need its own semantic tokens, look for the missing shared role first.
- **Check themes through the cascade, not by reading the CSS.** Generated
  CSS can be right line by line and wrong in the cascade (a brand selector
  out-specifying a mode selector). Resolve real values on real elements.

## 4. Coverage and documentation

- **Every system component has stories** for each variant × size that
  changes appearance, plus disabled and any state a static story can show.
  Stories that assume a non-default backdrop supply it.
- **Every system component has written usage guidance** — when to use it,
  when not to, accessibility notes, an example. A generated stub with TODOs
  is not documented.
- **Numbers are computed, never hand-maintained.** Token usage, validation
  status and metrics come from a script that reads the source. If a number
  looks wrong, fix the script, not the page that shows it.
- **Don't report a metric you can't compute honestly.** Leave it out and
  say why, rather than backfilling from memory.

## 5. Design parity

- **Matching code to a screenshot by eye is not verification.** Render the
  component and read computed styles (colour, radius, height, padding,
  font size) for every variant and state; compare with the design file's
  bound values; list the numbers.
- **Don't assume siblings share a rule.** Check each component's own design
  data.
- **Take at least one screenshot anyway.** Numbers can match while layout
  is wrong; computed styles can't see layout.

## 6. Where fixes belong

- **Design-originated problems are reported, not patched in code.** An
  unbound value, a wrong variable, an ambiguous variant name, a missing
  behaviour note: say exactly what to change in `<design-file>`, and stop.
- **Code-originated problems are fixed in code.** Wrong element, wrong
  ARIA, a computed style that doesn't match a correctly bound token.
- **A code patch for a design problem only on explicit request**, labelled
  as a temporary workaround in the code and in the report.
- **Telling them apart:** if the design file is verifiably wrong (read the
  bindings, not the picture), it's a design problem — however small the
  code fix would be.

## 7. Consumers outside the system

- **The scan has a boundary; say where it is.** Pages, marketing sites and
  dashboards that consume the system directly are usually outside the
  component checks. A component change can break them silently.
- **When a component's fill, mode handling, focus or disabled treatment
  changes, find every consumer** and re-check any workaround built around
  the old behaviour. Workarounds don't error when their assumption goes;
  they just render wrong.

## 8. Exploration vs the system

- **Prototypes live in their own place**, clearly labelled, out of the
  shipped system.
- **The checks still run there, but report instead of block.** The list of
  violations is the graduation checklist: what the system is missing, or
  what the prototype has to replace before it can ship.
