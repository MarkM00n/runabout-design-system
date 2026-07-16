# Validate Component

Use this prompt to audit one component in `src/components/` against
`/docs/design-system-rules.md`. Fill in `{{COMPONENT}}` with the component's
name (e.g. `Button`, `Checkbox`) before running.

---

You are validating `src/components/{{COMPONENT}}/` against the rules in
`/docs/design-system-rules.md`. Read that file first — it is the source of
truth for every check below, and it explains *why* each rule exists, which
matters for judging edge cases the checklist doesn't spell out explicitly.

Do not validate from memory or from reading the component's JSX in
isolation. This system's whole design-parity discipline exists because
reading code and eyeballing a screenshot both miss real bugs — follow the
same process that's caught bugs before: inspect the actual Figma source,
render the actual component, and measure the actual computed output.

## 1. Identify the Figma source

- Find the Figma component/component set this maps to. If the mapping isn't
  obvious from the component's file header comment, search the Figma file
  (`use_figma`, not `get_metadata` alone — see the rules doc's note on why)
  for a component set with a matching or related name.
- If no corresponding Figma component exists, say so explicitly and skip to
  a code-only review (sections 2–4 below still apply; section 5 doesn't).

## 2. Token compliance

- Read `src/components/{{COMPONENT}}/{{COMPONENT}}.tsx` and list every
  color, spacing, radius, and font-size value used (both token utilities
  like `bg-action-primary` and any arbitrary values like `h-[24px]`).
- For each one, confirm it traces to either:
  - a token defined in `src/styles/tokens.css`, or
  - a documented literal (comment explaining it's an unbound Figma value).
- Flag any raw hex/px value with no token and no comment.
- Flag any use of Tailwind's default numeric scale (`h-6`, `w-4`, `gap-8`,
  etc.) for a dimension that should be pixel-exact — this repo's root
  font-size (18px) makes these render 1.125× too large. Every instance of
  this found in this system so far has been a real, shipped-then-fixed bug.
- Cross-check `tokens.css` and `tokens.json` — any token used here should
  exist in both files with matching values.

## 3. Accessibility

- Confirm the component renders a real native element for its role (not a
  styled `<div>`).
- If it's a custom-styled native control (checkbox/radio/switch-style),
  confirm the real input is `sr-only`, not `hidden`/`display:none`, and that
  decorative visual elements are `aria-hidden`.
- Confirm focus styling uses `:focus-visible`, not `:focus`.
- Confirm `disabled` is a real HTML attribute, paired with
  `disabled:pointer-events-none` and `disabled:cursor-not-allowed`.
- If any token used here (e.g. `text-inverse`) implies a dark/colored
  backdrop, confirm that's documented — either in the component's own
  comments or in how its story supplies a backdrop (see next section).

## 4. Storybook coverage

- Confirm `{{COMPONENT}}.stories.tsx` exists, co-located, with an `index.ts`
  barrel.
- List every variant/size/state combination the component supports, and
  check each has a corresponding story (or is covered by an argType control
  on an existing story).
- Confirm a `Disabled` story exists if the component supports disabling.
- Confirm `tags: ['autodocs']` is set.
- If §3 flagged a dark-backdrop assumption, confirm the story provides a
  `decorators` entry supplying that backdrop — don't accept "it renders
  fine on the default canvas" without checking, since pale-on-white
  illegibility is easy to miss in a quick glance.

## 5. Design parity (skip if no Figma source was found in §1)

Start a Storybook dev server if one isn't already running, and use
Playwright (or the Chrome extension if connected) to load each story's
rendered output. For each size/state variant:

- Pull `getComputedStyle()` for background-color, border-color, color,
  border-radius, height, padding, and font-size.
- Compare against the literal values bound in the Figma source (re-inspect
  via `use_figma` if you don't already have them from §1 — don't rely on
  values from a previous session's memory, they may be stale).
- Note every match and every mismatch explicitly — don't summarize as
  "looks correct," list the actual numbers compared.
- Capture at least one screenshot of a representative variant.

## Output

Report findings grouped by the four section headers above (Token
compliance / Accessibility / Storybook coverage / Design parity). For each
finding: state whether it passes or fails, and if it fails, state the
specific value/line/behavior that's wrong and what the correct value should
be (not just "doesn't match Figma" — the actual numbers). If everything
passes, say so plainly rather than padding the report with restated rules.

Do not fix anything in this pass — if failures are found, hand off to
`/prompts/fix-validation-errors.md` with this report as input.
