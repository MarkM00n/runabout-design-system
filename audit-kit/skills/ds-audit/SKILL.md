---
name: ds-audit
description: Run a read-only audit of a design system across Figma and code — inventory, token compliance, component drift, accessibility, token structure — and write a one-page report. Use when asked to audit, assess or health-check a design system or its adoption.
---

# Design system audit

Read-only. Nothing in the audited repo or Figma file changes. Reports go to
an output folder outside the audited repo.

The kit this skill drives lives in `audit-kit/` (scripts, rules, prompts,
templates). If it's somewhere else, ask once for the path.

## 0. Scope (ask if not given)

- Which repos / packages, and where the design system's components live.
- Where the tokens live (CSS custom properties, JSON, a theme file).
- The Figma file key(s): the library, and one or two product files.
- What "surfaces" means here (apps, squads, products) — findings are grouped
  by it.

## 1. Inventory

Before any check, record: token files and format; component count in code
and in Figma; which products import the system and how (package, alias,
copy-paste); Figma collections and modes. Use the Figma script's
`variables` output for the design side.

## 2. Code

1. Copy `audit.config.example.json` to the output folder as
   `audit.config.json` and fill it in. Use `primitivePattern` only if
   primitives can be told apart by name.
2. Run `node audit-kit/scripts/audit-code.mjs --root <repo> --config <out>/audit.config.json --out <out>`.
3. If "tokens loaded" is 0 or the design-system import table is empty, the
   config is wrong — fix it before reading anything else.
4. Sample three findings from each of the top five checks. Note false
   positives.

## 3. Figma

1. Load the `figma-use` skill.
2. List pages (one read-only call), then run `scripts/figma-audit.js` once
   per relevant page, **in parallel**, with `CONFIG.pageName` set and
   `includeVariables` true on only one of them.
3. Adjust `CONFIG.roleRules` to the file's variable naming first, or the
   role-mismatch check is noise.
4. Spot-check three findings per check by opening the node.

## 4. Contrast

Write the pairs that matter (body text, secondary text, links, borders,
focus ring — on each surface/mode) to `pairs.json` and run
`scripts/contrast.mjs --pairs pairs.json --tokens <tokens.css>`.

## 5. Report

Fill `AUDIT-REPORT-TEMPLATE.md`. Rank the top ten by
**reach × severity × cost to fix**, and name for each whether the fault is
design, code or system. Lead with what's worth keeping — the audit is a
starting point for the team, not a verdict on it.

## Don't

- Don't fix anything, even trivially, without a per-item request.
- Don't present a script count as a verified finding.
- Don't claim a rendered check you couldn't make.
