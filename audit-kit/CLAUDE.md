# Design system audit — instructions for Claude

Copy this file to the root of the workspace where the audit runs (or append
it to an existing `CLAUDE.md`). Replace the placeholders first:

- `<design-file-key>` — the Figma file that owns the design decisions
- `<codebase>` — the repo(s) being audited
- `<audit-output>` — where reports go (outside the audited repo by default)

## This is an audit: read, measure, report. Don't fix.

- **Change nothing in `<codebase>` or the Figma file** unless explicitly
  asked, per item. An audit that edits what it measures can't be trusted.
- **Write reports to `<audit-output>`**, never into the audited repo.
- **Separate what you measured from what you inferred.** Every finding
  says how it was found: a script count, a live Figma read, a computed
  contrast ratio, or a judgement. Judgements are labelled as such.
- **Never report a number you didn't compute.** If a metric can't be
  measured honestly, leave it out and say why.

## Rules

- Code is audited against `rules/design-system-rules.md`.
- Figma is audited against `rules/figma-readiness.md`.
- Token structure is compared with `tokens/token-architecture.md`.
- Read the rule's "why" before judging an edge case; it usually settles it.

## Method

1. **Inventory before judging.** Where are the tokens, which components
   exist, which products consume them, which Figma libraries are added to
   which files. Record it; most audits get the boundary wrong.
2. **Run the scripts** (`scripts/audit-code.mjs`, `scripts/figma-audit.js`,
   `scripts/contrast.mjs`). They give counts and locations.
3. **Sample, then confirm.** For each top finding, open three real
   instances and confirm the script is right. Note false positives and how
   often they occurred.
4. **Render what matters.** Where a finding depends on what the browser
   computes (focus rings, modes, contrast on real surfaces), check a live
   render and read computed styles. If you can't render, say so plainly —
   never imply a visual check you didn't make.
5. **Fill in `AUDIT-REPORT-TEMPLATE.md`.**

## Where the fault lives

Classify every finding: **design** (the Figma file is wrong or ambiguous),
**code** (the implementation diverges from a correct design), or **system**
(the system has no answer — a missing token, component or rule). This
decides who owns the fix. Read the bindings before deciding; a screenshot
isn't evidence.

## Reading Figma

- Live Plugin API reads (`use_figma`), one page per call, pages in
  parallel. Walk every variant; never trust merged summaries.
- Use Figma's words in anything a designer will read: "bound to a
  variable", "detached", "text style applied".

## Tone

Plain words. Say what the thing is and what it does. Report drift to rank
work, not to blame people — most drift is the normal residue of shipping.
