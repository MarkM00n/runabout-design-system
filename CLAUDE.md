# Runabout Design System — project instructions

## Component work always follows the design system rules

Any request to build, add, modify, or refactor a component under
`src/components/` is governed by `docs/design-system-rules.md` — read it
before starting, every time, even if the request doesn't mention it or the
rules file by name. Its rules aren't style preferences: every one exists
because a specific bug already shipped once from skipping it (the
rem-scaling bug, the Card CTA-stretch bug, the illegible Checkbox story —
see that file's intro). Apply all of it: token compliance (§1),
accessibility (§2), Storybook coverage (§3), design parity (§4),
documentation (§5), and foundations (§6) where relevant to the change.

## Every component request must include

Alongside the component code itself, produce or update:

- **`ComponentName.stories.tsx`** — co-located in the component's folder,
  `tags: ['autodocs']`, a story per variant × size combination that
  materially changes appearance, a `Disabled` story if the component
  supports disabling, and an `index.ts` barrel export. Rules doc §3.
- **`ComponentName.docs.ts`** — real prose (description, usage guidelines,
  dos/don'ts, accessibility notes, a code example), not a `TODO`-stub left
  unresolved. `npm run design-sync` auto-generates a stub when one's
  missing, but a stub is a starting point to fill in, not a finished
  deliverable. Rules doc §5.
- **Tests** — this repo has `@storybook/addon-vitest`,
  `@vitest/browser-playwright`, and `@vitest/coverage-v8` installed as
  dependencies, but as of this writing there is **no wired-up
  `vitest.config.ts`, no `test` script in `package.json`, and no existing
  `*.test.tsx` file** to follow as a pattern. Don't silently skip tests and
  don't invent one-off test scaffolding to paper over the gap either —
  flag it to the user explicitly and ask how they want it handled before
  proceeding, rather than guessing either direction.

## Before calling component work done

Run `npm run design-sync` and resolve every `FAIL` it reports (`WARN`s are
worth a look but don't block). This is the same gate
`.github/workflows/deploy-storybook.yml` runs in CI — catching a failure
locally is strictly better than catching it there.

`docs/design-system-rules.md` is the source of truth for *why* each rule
exists, including edge cases this summary doesn't spell out — read it, not
just this file, before making a judgment call it might already cover.
