# Validate one component

Audit a single component against `rules/design-system-rules.md` and
`rules/figma-readiness.md`. Read-only. Fill in the placeholders:

- `<Component>` — the component's name in code
- `<component-path>` — its folder or file
- `<design-file-key>` / `<node-id>` — its Figma component set

---

You are validating `<component-path>` against the rules in
`rules/design-system-rules.md`. Read that file first. Don't validate from
memory or from the JSX alone: inspect the Figma source, render the
component, and measure computed output.

## 1. Figma source

Read `<node-id>` in `<design-file-key>` with a live `use_figma` script. Walk
every variant. Record each variant's bound variables (fills, strokes, text,
padding, gap, radius), text styles and description. If there's no Figma
source, say so and do a code-only review (skip §6).

## 2. Token compliance

List every colour, spacing, radius and type value in the component's source.
For each: a token (name it), or a literal with a comment explaining why. Flag
raw values with no explanation, primitives used directly, and default-scale
utilities that don't match the system's scale.

## 3. Accessibility

Native element for its role; custom controls keep the native input
(visually hidden); `:focus-visible`; no outline removed without replacement;
`disabled` as an attribute; decorative SVGs `aria-hidden`; touch target ≥ 24px.

## 4. Stories

A story per variant × size that changes appearance, plus disabled and any
static state. Backdrop supplied where tokens assume one.

## 5. Documentation

Usage guidance, dos and don'ts, accessibility notes, an example — real
prose, no TODOs.

## 6. Design parity

Render each variant and state. Read `getComputedStyle` for background,
border, text colour, radius, height, padding, font size. Compare with the
Figma values from §1 and list the numbers, matching or not. If the system
has modes or brands, repeat in each. Take one screenshot.

**If you can't render** (no browser), do the comparison from code and Figma
values, say plainly that the rendered check is not done, and name the
stories someone needs to open.

## Output

Group by the section headings above. For each finding: pass or fail; if
fail, the exact value and what it should be; and whether the fault is in
**design**, **code** or the **system**. Don't fix anything — hand failures
to `prompts/fix-validation-errors.md`.
