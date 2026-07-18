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

// Same three-state model as the dashboard and Storybook badges
// (statusFor() in design-sync.js computed `status`; this only presents it).
function statusEmoji(status) {
  if (status === 'fail') return '❌';
  if (status === 'pass-with-warnings') return '⚠️';
  return '✅';
}

function statusLabel(status, warnCount) {
  if (status === 'fail') return 'Fail';
  if (status === 'pass-with-warnings') return `Pass — ${warnCount} warning${warnCount === 1 ? '' : 's'}`;
  return 'Pass';
}

// "N caught and fixed · N open warnings" — never call a warning an "issue".
function summaryLine(fixedCount, failCount, warnCount) {
  const parts = [`${fixedCount} caught and fixed`];
  if (failCount > 0) parts.push(`${failCount} open failure${failCount === 1 ? '' : 's'}`);
  parts.push(`${warnCount} open warning${warnCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
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

  const totalOpenWarn = report.components.reduce(
    (sum, c) => sum + Object.values(c.checks).reduce((s, ch) => s + ch.warn, 0),
    0,
  );

  lines.push('## 🔍 Design System Validation Report');
  lines.push('');
  lines.push(`**Overall: ${statusEmoji(report.status)} ${statusLabel(report.status, totalOpenWarn)}**`);
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
    const warnCount = Object.values(component.checks).reduce((sum, c) => sum + c.warn, 0);
    const openCount = Object.values(component.checks).reduce((sum, c) => sum + c.open.length, 0);
    lines.push(
      `| ${component.component} | ${statusEmoji(component.status)} ${statusLabel(component.status, warnCount)} | ${openCount} | ${component.history.length} |`,
    );
  }
  lines.push('');

  for (const component of report.components) {
    const openIssues = Object.values(component.checks).flatMap((c) => c.open);
    const failCount = Object.values(component.checks).reduce((sum, c) => sum + c.fail, 0);
    const warnCount = Object.values(component.checks).reduce((sum, c) => sum + c.warn, 0);
    if (openIssues.length === 0 && component.history.length === 0) continue;

    lines.push(`<details>`);
    lines.push(
      `<summary>${component.component} — ${summaryLine(component.history.length, failCount, warnCount)}</summary>`,
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
