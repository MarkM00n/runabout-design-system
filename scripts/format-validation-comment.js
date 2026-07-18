#!/usr/bin/env node
/**
 * format-validation-comment — renders
 * src/design-docs/validation-report.generated.json as a GitHub-flavored
 * markdown PR comment. Pure formatting, no computation: every number here
 * is read straight from the report design-sync.js already wrote — same
 * source the dashboard and Storybook badges read, so a PR comment can never
 * show a different number than either of those.
 *
 * Usage: node scripts/format-validation-comment.js > comment.md
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(ROOT, 'src', 'design-docs', 'validation-report.generated.json');

const CHECK_LABELS = {
  tokenCompliance: 'Token Compliance',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook Coverage',
  documentationCoverage: 'Documentation Coverage',
};

function escapeCell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function issueRows(issues, mode) {
  return issues
    .map((issue) => {
      const where = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      const last = mode === 'open' ? issue.fix ?? '—' : `Resolved ${issue.resolvedAt}`;
      return `| ${CHECK_LABELS[issue.checkType] ?? issue.checkType} | ${escapeCell(issue.message)} | \`${where}\` | ${escapeCell(last)} |`;
    })
    .join('\n');
}

function main() {
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  const lines = [];

  lines.push('## 🔍 Design System Validation Report');
  lines.push('');
  lines.push(`**Overall: ${report.overallStatus ? '✅ PASS' : '❌ FAIL'}**`);
  lines.push('');
  lines.push(
    `Generated ${report.generatedAt} by \`npm run design-sync\` — single source of truth: ` +
      '`src/design-docs/validation-report.generated.json`. The dashboard and Storybook badges read the same file.',
  );
  lines.push('');

  lines.push('| Check type | Fail | Warn |');
  lines.push('|---|---|---|');
  const totals = {
    tokenCompliance: { fail: 0, warn: 0 },
    accessibility: { fail: 0, warn: 0 },
    storybookCoverage: { fail: 0, warn: 0 },
    documentationCoverage: { fail: 0, warn: 0 },
  };
  for (const component of report.components) {
    for (const [key, check] of Object.entries(component.checks)) {
      totals[key].fail += check.fail;
      totals[key].warn += check.warn;
    }
  }
  for (const [key, label] of Object.entries(CHECK_LABELS)) {
    lines.push(`| ${label} | ${totals[key].fail} | ${totals[key].warn} |`);
  }
  lines.push('');

  lines.push('| Component | Status | Open | Caught & fixed |');
  lines.push('|---|---|---|---|');
  for (const component of report.components) {
    const openCount = Object.values(component.checks).reduce((sum, c) => sum + c.open.length, 0);
    lines.push(
      `| ${component.component} | ${component.overall ? '✅' : '❌'} | ${openCount} | ${component.history.length} |`,
    );
  }
  lines.push('');

  for (const component of report.components) {
    const openIssues = Object.values(component.checks).flatMap((c) => c.open);
    if (openIssues.length === 0 && component.history.length === 0) continue;

    lines.push(`<details>`);
    lines.push(
      `<summary>${component.component} — ${openIssues.length} open issue(s), ${component.history.length} caught &amp; fixed</summary>`,
    );
    lines.push('');
    if (openIssues.length > 0) {
      lines.push('**Open**');
      lines.push('');
      lines.push('| Check | What failed | Where | Suggested fix |');
      lines.push('|---|---|---|---|');
      lines.push(issueRows(openIssues, 'open'));
      lines.push('');
    }
    if (component.history.length > 0) {
      lines.push('**Caught & fixed**');
      lines.push('');
      lines.push('| Check | What was wrong | Where | Fixed |');
      lines.push('|---|---|---|---|');
      lines.push(issueRows(component.history, 'history'));
      lines.push('');
    }
    lines.push('</details>');
    lines.push('');
  }

  lines.push(
    '_Not a merge gate — informational only. Run `npm run design-sync` locally to reproduce or fix any FAIL above._',
  );

  console.log(lines.join('\n'));
}

main();
