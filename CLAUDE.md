# Runabout Design System — project instructions

## Every Figma-to-code request starts with a Ready-for-AI check

Before generating any component code from a Figma design (a frame,
component, or component set), check that design against
`docs/ready-for-ai.md` — first, before anything else in this file, every
time, even if the request doesn't mention the check by name.

- **If the design fails any criterion in that file:** stop. Don't generate
  any component code. Report exactly what's wrong in plain language a
  designer can act on — which criterion failed and on which layer or
  property — then offer to fix it.
- **If it passes:** say so briefly, then continue straight into the normal
  build workflow below.

A design that isn't ready for AI makes every rule below impossible to
satisfy honestly — there's nothing to check token compliance or parity
against if the source itself is ambiguous.

## Fixes belong where the source of truth is

Before fixing anything — a bad value, a mismatch, a bug — work out whether
the root cause is in the Figma design or in the code. See
`docs/design-system-rules.md` §8 for the full rule and how to tell the two
apart; don't skip reading it just because the fix looks obvious.

- **Design-originated** (a token value or binding, a variant name, a
  missing behavior note): report it in plain language a designer can act
  on, say exactly what to change in Figma, and stop — don't write a
  code-side workaround that papers over it.
- **Code-originated** (implementation, markup, accessibility of the
  generated output): fix it in code as normal.
- **Only patch a design problem in code if explicitly asked to**, and label
  the patch clearly as a temporary workaround — never present it as the
  real fix.

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

## Generated files never get hand-merged

`src/design-docs/*.generated.json` and every component's
`*.validation.json` are fully derived from `tokens.css`/`tokens.json` (and,
for dashboard-data, git history) — never hand-edit them, and never resolve
a merge conflict in one by picking lines from either side. Two branches
that each ran `npm run design-sync`/`npm run dashboard-data` independently
will produce two different snapshots of the same computed file, and a
line-based merge of those is never the right answer regardless of which
side "wins."

The fix is two-layered:

- **`.gitattributes`** marks these paths `merge=ours`, so a local merge or
  rebase touching them never produces conflict markers — git just keeps
  the current side and moves on. `package.json`'s `prepare` script
  registers the `ours` driver in `.git/config` automatically on
  `npm install`/`npm ci` (silently no-ops outside a git repo); without
  that one-time registration `.gitattributes` alone doesn't do anything —
  git warns and falls back to a normal merge.
- **Regenerate after, always.** `merge=ours` picking a side is never
  itself the correct answer — it just guarantees the merge doesn't block
  on these paths. After merging or rebasing anything that touches
  `tokens.css`/`tokens.json`, run `npm run design-sync && npm run
  dashboard-data` and commit whatever changes. `.github/workflows/
  deploy-storybook.yml` does this automatically on every push to `main`,
  which keeps `main` from ever carrying a stale snapshot into the next
  branch that merges — that staleness is what turns an unrelated PR into a
  generated-file conflict in the first place.
