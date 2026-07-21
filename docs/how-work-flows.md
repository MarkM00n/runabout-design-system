# How work flows

What actually happens, in CI, between a PR being opened and a component
landing on `main` — as implemented today, not as a plan. Each stage below
maps to a workflow file under `.github/workflows/`; read the workflow for
exact mechanics, this doc for why the stages exist and how they connect.

## 1. PR opened → validation comment (draft or not)

**`validation-report-comment.yml`** — runs on every `opened`, `synchronize`,
and `reopened` event, draft or not. It runs `npm run design-sync` fresh
against the PR's code and posts (or edits in place) a single sticky PR
comment summarizing token compliance, accessibility, Storybook coverage,
and documentation coverage — pass/warn/fail counts per check, plus an open
issues table per component.

This is informational, never a merge gate: a FAIL shows up as a red ❌ in
the comment, not a blocked check. A PR that intentionally introduces a
FAIL (e.g. a work-in-progress component) should still get an honest
comment, not a pipeline that looks broken.

## 2. PR marked ready for review → Slack notification

**`slack-pr-notification.yml`** — fires only on `ready_for_review`, and on
`synchronize` gated to non-draft PRs (new commits pushed to an
already-ready PR re-notify; new commits on a still-draft PR don't). A PR
that's merely opened, or that stays in draft, never posts here — the
channel only sees PRs that are actually ready for a human.

It scopes the validation summary to whichever `src/components/*`
directories the PR's diff actually touches (falling back to the whole
report if the PR doesn't touch any component, e.g. a tokens-only change),
so the message reflects what changed, not the whole design system's
cumulative status.

The message is Slack Block Kit, posted as **Runabout CI** with a bot icon:

- **Header** — the touched component name(s) + status emoji (✅ / ⚠️ / ❌)
- **One line of context** — what triggered it (ready-for-review vs. new
  commits) and who
- **Validation summary** — pass/warn/fail counts per check type, scoped to
  the touched components
- **Buttons** — the pull request, the validation report (links straight to
  the sticky comment from stage 1, found via the GitHub API), and one
  Storybook button per *existing* component the PR modifies — deep-linked
  to that component's own docs page (e.g. `?path=/docs/components-badge--docs`,
  read from its story's `title`), not the Storybook homepage, since the
  reviewer's actual use for it is comparing the PR's diff against the
  component's current live rendering. A component newly added in this PR
  gets a "Storybook available after merge" note instead, since Storybook
  only (re)deploys on push to `main` (stage 3) — linking a page that
  doesn't exist yet would 404. A PR that touches no components (e.g. this
  workflow's own PR) gets neither a button nor a note — there's no
  component-specific Storybook context to give.

Posting is best-effort: a missing `SLACK_WEBHOOK` secret, a bad webhook,
or Slack being down logs a `::warning::` and lets the workflow finish
green. The notification is not the gate — the sticky PR comment and CI
checks are.

Built by `scripts/format-slack-notification.js`, which reads the same
`validation-report.generated.json` the PR comment and dashboard read — a
Slack message can never show a different number than either of those.

**Setup required once per repo:** add a Slack Incoming Webhook URL as a
repository secret named `SLACK_WEBHOOK` (Settings → Secrets and variables →
Actions → New repository secret). Never commit the URL itself.

**Known limitation:** incoming webhooks can only post new messages, not
edit an existing one — so "re-post/update" on new commits means a new
Slack message each time, not an edited one. Editing in place would need a
Slack bot token and `chat.update`, not a webhook.

## 3. Merge to `main` → design-sync, dashboard data, Storybook deploy

**`deploy-storybook.yml`** — runs on push to `main`. `npm run design-sync`
re-validates everything and builds `storybook-static/`; `npm run
dashboard-data` regenerates the dashboard's derived JSON from token files
and git history. If either regeneration changed a `*.generated.json` or
`*.validation.json` file, that gets committed straight back to `main`
(`chore: regenerate derived data [skip ci]`) before Storybook deploys to
GitHub Pages — so `main` never carries a stale snapshot into whatever PR
merges next (see `.gitattributes`' `merge=ours` for the other half of that
guarantee, and `CLAUDE.md` for the full rule on generated files).

This is also the point at which a newly-added component's Storybook page
actually goes live — which is why stage 2 waits until after merge to link
it.
