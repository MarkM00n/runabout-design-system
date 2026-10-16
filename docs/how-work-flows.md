# How work flows

What actually happens, in CI, between a PR being opened and a component
landing on `main` — as implemented today, not as a plan. The work itself can
start from a local Claude Code session or a cloud session (claude.ai/code,
or a claude.ai chat with the repository attached); everything below runs
the same either way, because it runs in CI. Each stage below
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

## 1b. Every push → visual review (Chromatic)

**`chromatic.yml`** — runs on every push to every branch (`main`
included). Chromatic builds that commit's Storybook, publishes it at its
own URL, and snapshots the stories the change can affect against `main`'s
last accepted state. The workflow then posts — or edits in place — one
sticky "Visual review" comment on the branch's open PR, with two links:

- **This branch's Storybook**: the real rendered components at that
  commit, with the brand and mode toolbar.
- **The Chromatic review**: each changed story side by side with `main`,
  to accept or reject.

**Why it exists.** Before this, the only rendered Storybook was the live
one, which only ever shows `main`. Visual review happened after merge, and
a cloud session — which has no browser — couldn't look at its own work at
all. Now every PR has a link to look at before anyone merges it.

**Advisory, like stage 1.** Visual changes never fail the job
(`exitZeroOnChanges`). A changed story is a question for a person, not an
error. Pushes to `main` auto-accept, so `main` is always the baseline.

**Runs on `push`, not `pull_request`.** Chromatic's own docs recommend
it: `pull_request` builds can lose baselines or compare against the wrong
`main`. The comment step finds the branch's open PR itself; a branch with
no PR yet still gets a build, and its link is in the job log.

**Budget.** Settings live in `chromatic.config.json`. TurboSnap
(`onlyChanged`) snapshots only stories a change can affect, so a typical
PR costs a handful of snapshots against the free tier's 5,000 a month. A
change under `src/styles/`, `src/tokens/` or `src/index.css` forces a full
run (`externals`): a token change can restyle every story, and TurboSnap
can't see that through CSS custom properties. A full run is 78 snapshots
today.

**What it doesn't cover.**

- Snapshots are taken in the default brand (Runabout) and mode (On Light).
  Brand and mode correctness is design-sync's Brand coverage check
  (stage 1), which resolves every token through the cascade. To snapshot a
  specific story in other brands or modes, add Chromatic `modes` to that
  story — each mode is another snapshot per run, so do it for full pages,
  not every component.
- The dashboard (`src/App.tsx`) isn't a Storybook story, so it gets no
  preview. It's still checked by eye after merge, on the live site.

**Setup (once).** Sign in at chromatic.com with GitHub, add this
repository as a project, copy its project token, and add it as a
repository secret named `CHROMATIC_PROJECT_TOKEN` (Settings → Secrets and
variables → Actions). Until that secret exists the job skips with a
warning and stays green. The first run on `main` after setup creates the
baselines.

## 2. PR marked ready for review → Slack notification

**`slack-pr-notification.yml`** — two independent gates decide whether a
message actually reaches Slack:

1. **Draft state** (job-level `if`): the job only runs on `ready_for_review`,
   and on `synchronize` restricted to non-draft PRs (new commits pushed to
   an already-ready PR re-notify; new commits on a still-draft PR don't). A
   PR that's merely opened, or that stays in draft, never triggers this
   workflow at all — the channel only ever sees PRs that want a reviewer.
2. **Check status** (step-level `if` on the Slack-post step): design-sync
   **failing means nothing posts, full stop** — the message is built (so
   its `status` output exists to gate on) but the post step is skipped, and
   a `::notice::` explains why in the run log. It stays with the author on
   the PR — the sticky comment from stage 1 — until design-sync is green.
   A clean pass or a pass-with-warnings both post; a warning is "safe to
   merge, noted, not blocking," never a reason to withhold the ping.

This is a **check-result** gate, not a **git-mergeability** one — those are
different axes. A PR can fail design-sync and still be perfectly
mergeable, or pass design-sync and still have a merge conflict GitHub
flags separately on the PR page. This workflow only ever looks at
design-sync's status; it doesn't inspect, and never claims anything about,
whether the branch is mergeable.

It scopes the validation summary to whichever `src/components/*`
directories the PR's diff actually touches (falling back to the whole
report if the PR doesn't touch any component, e.g. a tokens-only change),
so the message reflects what changed, not the whole design system's
cumulative status.

The message is Slack Block Kit, posted as **Runabout CI** with a bot icon:

- **Header** — the touched component name(s), in full (no truncation), +
  status emoji (✅ / ⚠️ / ❌)
- **Guidance line** — tells the reviewer what to do, not just what
  happened: **"✅ Ready for review."** on a clean pass, **"⚠️ Safe to
  merge — these are noted, not blocking."** on pass-with-warnings. (A
  failing status would read **"❌ Not ready — checks failing."**, but per
  gate 2 above this case never actually posts — it's only reachable by
  running the formatter script directly, e.g. to preview all three states.)
- **Context** — the PR title (bold), the first real line of the PR
  description (skipping markdown headings) if one exists, and a meta line:
  PR number, who triggered it and how (ready-for-review vs. new commits),
  and diff size (files changed, +/−) — enough for a reviewer to judge scope
  and effort before clicking anything
- **Validation summary** — pass/warn/fail counts per check type, scoped to
  the touched components
- **Inline issue detail** — when status isn't a clean pass (i.e. the
  pass-with-warnings case that does reach Slack), the actual open issue(s)
  (check type, file:line, message — not just a count), capped at four with
  a "+N more" fallback to the validation report. The norm this workflow
  assumes is that a PR is green *before* it's marked ready, so a warning
  reaching Slack is already the exception — it should be obvious what's
  noted without a click-through, not hidden behind a bare count
- **Buttons** — the pull request, and the validation report (links straight
  to the sticky comment from stage 1, found via the GitHub API).
  Deliberately **no Storybook button at this stage, ever** — the deployed
  site only reflects `main`, not this PR's branch, and only (re)deploys on
  push to `main` (stage 3). Linking it here would either 404 (a component
  newly added in this PR) or silently show pre-PR content (a component this
  PR modifies) — neither is the reviewer's actual diff. Instead, any PR
  that touches at least one component gets a plain context line: *"Storybook
  available after merge."* A PR that touches no components (e.g. this
  workflow's own PR) gets neither a button nor the note — there's no
  component-specific Storybook context to give. The real, PR-accurate
  Storybook link shows up once merged, in stage 4 below.

Separately from the check-status gate above: the act of posting is also
best-effort. A missing `SLACK_WEBHOOK` secret, a bad webhook, or Slack
being down logs a `::warning::` and lets the workflow finish green rather
than fail the run. The notification is not the gate either way — the
sticky PR comment and CI checks are.

Built by `scripts/format-slack-notification.js`, which reads the same
`validation-report.generated.json` the PR comment and dashboard read — a
Slack message can never show a different number than either of those.

**Setup required once per repo:** add a Slack Incoming Webhook URL as a
repository secret named `SLACK_WEBHOOK` (Settings → Secrets and variables →
Actions → New repository secret). Never commit the URL itself.

**Known limitation:** incoming webhooks can only post new messages — they
can't edit an existing one, and they can't thread a reply under one either.
A webhook's response to a post is just `{"ok": true}` in plain text, never
the message's `ts` (timestamp), which is the only handle Slack's API uses
to address a specific message for editing (`chat.update`) or threading
(`thread_ts` on a later `chat.postMessage` call). So "re-post/update" on
new commits means a new Slack message each time, and the merge-complete
follow-up in stage 4 below is a second, separate message too — not a
threaded reply to the ready-for-review one.

Closing this gap needs a **Slack bot token**, not a webhook:

1. Create (or reuse) a Slack app with the `chat:write` bot scope, install
   it to the workspace, and invite the bot to the channel. Store its Bot
   User OAuth Token (`xoxb-…`) as a new repo secret, e.g. `SLACK_BOT_TOKEN`
   — never the same secret as `SLACK_WEBHOOK`, since it's a materially more
   powerful credential (it can post/edit as the bot anywhere it's a
   member, not just push to one fixed channel).
2. Swap the `curl … "$SLACK_WEBHOOK"` posts for `POST
   https://slack.com/api/chat.postMessage` with `Authorization: Bearer
   $SLACK_BOT_TOKEN`. Unlike a webhook, this returns real JSON — capture
   `ts` and `channel` from the response.
3. Persist that `ts`/`channel` somewhere the *next* workflow run (a
   different job, sometimes minutes later, triggered by the merge) can
   read — e.g. a small hidden-comment marker on the PR itself, the same
   pattern `slack-pr-notification.yml` already uses to find its own
   validation-report comment via the GitHub API.
4. In `deploy-storybook.yml`'s merge notification, read that marker back
   and either call `chat.update` on the original `ts` (edit it in place —
   e.g. flip the header to "✅ Merged") or `chat.postMessage` with
   `thread_ts` set to it (a real threaded reply) instead of posting a bare
   second message.

None of this is implemented — stage 2 and stage 4 remain independent,
un-threaded webhook posts until someone does it.

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

Before this workflow's `build` job uploads the Pages artifact, it also
builds the root Vite app (`src/App.tsx`, the "Pilot Dashboard" reading
`dashboard-data.generated.json`) via `npm run build:dashboard` — a relative
(`--base ./`) build, distinct from the plain `npm run build` used for local
preview — and copies its output into `storybook-static/dashboard/`. That
puts the dashboard live at `<storybook-url>/dashboard/`, one path below
Storybook's own root, in the same Pages deploy. There's no separate
dashboard hosting to configure or keep in sync.

## 4. Deploy completes → merge Slack notification

**`deploy-storybook.yml`**'s `notify-merge` job, gated on `needs: deploy`
and `github.event_name == 'push'` (so a manual `workflow_dispatch` re-run
doesn't re-spam the channel) — posts once Storybook and the dashboard have
actually finished deploying: **"✅ Merged — Storybook and dashboard
updated"**, with buttons to both, plus a Pull Request button when a PR is
found associated with the merge commit (via
`repos/{repo}/commits/{sha}/pulls`; a direct push to `main` with no
associated PR just posts without one). Built by
`scripts/format-slack-merge-notification.js`.

Posted to the same `SLACK_WEBHOOK` secret and channel as stage 2, but as
its **own, separate message** — see stage 2's "Known limitation" above for
why an incoming webhook can't thread this under, or edit, the
ready-for-review post, and what a bot-token upgrade would take to fix
that. Best-effort like stage 2's post: a missing secret or a failed POST
logs a `::warning::` and leaves the workflow green.
