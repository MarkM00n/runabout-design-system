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
- **Always check against live Figma state, never a cached result.** If this
  design was already checked earlier in the conversation — even if it
  failed — re-read the current source and re-run the check fresh before
  reporting or blocking again on a request to build. The user may have
  already fixed the issue in Figma since the last check; never block (or
  pass) on a stale reading. Report only what the live check finds.

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

**Token architecture changed 2026-08-05** — semantic variables now resolve
per surface mode (On Light / On Dark / On Feature), primitives were
renumbered, and several old tokens were deleted. Three build rules that
changed with it (full detail in `docs/design-system-rules.md` §§1–2, 7):

- **Disabled = Default appearance at 38% opacity** via the
  `opacity-disabled` token — never separate disabled colours.
- **Focus = 2px outline offset 2px outside the control** (`outline` +
  `outline-offset` on `:focus-visible`), colour from `border-focus`.
- **`tokens.css`/`tokens.json`'s semantic mode values were spot-verified
  against live Figma on 2026-08-08** (every token the Input family uses,
  across On Light/On Dark/On Feature) and matched exactly — the earlier
  blanket "stale, sync pending" claim no longer holds as a default
  assumption. That wasn't an exhaustive re-check of every token in the
  file; verify anything outside that set against live Figma before
  trusting it. `checkContrastPairings` in `scripts/design-sync.js` parses
  §7's table directly at runtime rather than carrying its own copy, so it
  structurally can't drift from what that section says — §7 in the rules
  doc is still the reference, it's just not "ahead of" the code anymore.

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

## Component changes must also sweep every consumer outside src/components/

Anything outside `src/components/` — `src/App.tsx`/`src/App.css` (the
DesignOps pilot dashboard), `src/examples/*` (landing pages and other
one-off marketing pages built from these components) — consumes the
design system directly but lives where `npm run design-sync` **never
checks**. A change fully handled across every component can still
silently break one of these consumers, and nothing in the normal workflow
catches it.

This isn't only a token-rename problem. A component's own *behavior*
changing — a fill going from solid to transparent, from mode-invariant to
mode-variant, or vice versa — breaks any consumer that added a workaround
(most often a `data-mode` override) to compensate for the old behavior.
The workaround doesn't get an error when the assumption it was built on
disappears; it just quietly produces the wrong result. **Whenever a
component's fill, mode-handling, or focus/disabled treatment changes, grep
the whole repo for that component's imports (not just `App.tsx`) and
re-check every usage — especially any `data-mode` override wrapping it.**

- **Real incident (2026-08-08):** the Input-family mode/token sync (PR
  #70/#71) correctly changed `Input`'s fill from a fixed, mode-invariant
  light cream (`bg-surface-primary`) to a genuinely transparent
  `action-secondary`. `src/examples/VinesAndVinylLanding.tsx` wraps its
  Hero email `Input` in `data-mode="light"` — load-bearing against the
  *old* fill, since forcing On Light was the only way to get a readable
  pairing against a fixed light backdrop. Once the fill went transparent,
  that same override put dark ink/olive text and border directly on
  Hero's terracotta background showing through the field: measured
  1.18:1 (placeholder) and 1.66:1 (border), both far under AA. Neither
  `design-sync` nor the component-level Ready-for-AI work touched this
  file — same blind spot as the dashboard, a second real instance of it.

The dashboard specifically also has this additional wrinkle: it consumes
`tokens.css`/`tokens.json` directly — the same `--color-*`/`--spacing-*`/etc.
custom properties every component uses.

- **Whenever a change touches `tokens.css`/`tokens.json`** (a rename, a
  retired token, a new mode, a re-numbered primitive — not just a normal
  component build), grep `src/App.tsx` and `src/App.css` for every
  `--color-*`/`--spacing-*`/etc. reference and Tailwind color-token
  utility class, and check each one still resolves to something real and
  correctly toned. Don't assume "design-sync passed" covers this file —
  it structurally can't.
- **Verify visually, not just by grep.** A token can still exist and
  still be *wrong for its context* — e.g. inheriting the wrong
  `data-mode` from an ancestor that scopes more broadly than the element
  visually sits within. Load the dashboard (`npm run dev`) and actually
  look at it before calling a token sync done; don't rely on the token
  merely existing.
- **Real incident (2026-08-05):** the mode-based token architecture sync
  retired `text-inverse` (no successor) and left several dashboard
  elements referencing it directly — missed entirely by `design-sync`,
  caught only when the user reported it. The fix that followed
  (`data-mode="dark"` on the dashboard's root, `data-mode="light"`
  overrides for its two light-content tables) then shipped its own bug:
  `data-mode="light"` was scoped to the whole `<section>` instead of just
  the light-colored table inside it, pulling `.section-title` — which
  sits visually on the dark canvas, not inside the light table — into
  the wrong mode too. Rendered near-black text on a dark green
  background. Caught only because the user looked at the live deployed
  site and reported it; nothing automated flagged either bug. When
  scoping a `data-mode` override, scope it to the narrowest element that
  actually needs it, not the nearest convenient wrapper — check what the
  element visually contains, not just what's structurally nested inside
  it in the JSX.

## Durable instructions go in project files, not memory

Never save a durable rule, instruction, or behaviour for this project to
assistant memory. If asked to remember something like that, it goes into
the appropriate project file instead — this file for a standing rule that
shapes how work gets done here, or the relevant rules file (e.g.
`docs/design-system-rules.md`, `docs/ready-for-ai.md`) when the content
belongs there instead. One source of truth beats a memory copy that can
drift out of sync with it.

- **Before writing it anywhere, confirm which file it's going into** — ask,
  don't assume.

## Say what Slack will and won't do

`.github/workflows/slack-pr-notification.yml` only posts to Slack when a PR
is marked ready for review (or gets new commits while already ready) *and*
two gates both clear: `design-sync` isn't failing on the PR's touched
component(s), and the PR actually touches something design-relevant
(`src/components/`, or a changed validation-report entry — see the
workflow's own header comment for the exact three gates). A draft PR, or
one that only touches docs/CI/unrelated files, produces no Slack message at
all — and without this rule, nothing said so at the moment it mattered.

- **State it in the same message as the action, every time** — opening a
  PR, pushing to one, flipping it to ready-for-review, or merging. Say
  plainly whether Slack will fire.
- **If it will skip, say why**, using the workflow's actual gates (draft
  state, a failing check, or no design-relevant files touched) — never
  leave someone watching a channel for a ping that was never coming.
- **Derive the reason from the workflow's real conditions, don't guess.**
  Check `slack-pr-notification.yml` (and, if relevant,
  `scripts/format-slack-notification.js`'s `should_post`/`status` outputs)
  for the gate that actually applies. The workflow also posts its own
  sticky PR comment when it skips ("Post or update Slack-skip notice") —
  that catches anyone reading the PR later; this rule catches the person
  watching live, at the moment they'd otherwise be left waiting.

## Verify the deploy actually fired after a merge to main

`.github/workflows/deploy-storybook.yml` is `on: push: branches: [main]` —
it should fire automatically on every merge, rebuilding and redeploying
both Storybook and the dashboard. It doesn't always: GitHub Actions has, on
this repo, silently failed to trigger the `push` event at least twice in
one session while `workflow_dispatch` (manual trigger) worked instantly
both times — so the gap is in event delivery, not the workflow itself.

- **After merging to main, confirm a new `deploy-storybook.yml` run
  actually started** — `gh run list --workflow deploy-storybook.yml
  --limit 3` and check the timestamp is newer than the merge, not just
  that some earlier run once succeeded.
- **If nothing fired within a couple of minutes**, don't just wait
  indefinitely: run `gh workflow run deploy-storybook.yml` to trigger it
  manually. This rebuilds from current `main` and redeploys; it does not
  re-fire the Slack merge notification, since `notify-merge` is gated to
  `if: github.event_name == 'push'` and a manual dispatch is a
  `workflow_dispatch` event.
- **Real incident (2026-08-05):** PR #66 merged cleanly but its push never
  triggered a deploy. The live Storybook and dashboard kept serving the
  pre-merge build for 20+ minutes — showing 2 stale validation warnings on
  Button that were already fixed and merged — until the user noticed and a
  manual `workflow_dispatch` cleared it. Nothing about the merge itself was
  wrong; the deployed site was just silently out of date.

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
