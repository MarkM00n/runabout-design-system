#!/usr/bin/env node
/**
 * format-slack-notification — renders a Slack Block Kit payload for a PR
 * that just went ready-for-review (or got new commits while already ready).
 * Same source of truth as the PR comment and dashboard: reads
 * src/design-docs/validation-report.generated.json, scoped down to the
 * component(s) the PR actually touches — a reviewer shouldn't have to
 * mentally filter the whole design system's status out of a per-PR ping.
 *
 * Inputs come from env vars set by the calling workflow step, not flags —
 * this only ever runs inside GitHub Actions. Also writes a `status`
 * (pass | pass-with-warnings | fail) to $GITHUB_OUTPUT when present, which
 * the workflow uses to decide whether to actually post the payload this
 * prints — a failing status is rendered here (so this stays testable
 * standalone) but is never posted; see slack-pr-notification.yml.
 *
 * Usage: node scripts/format-slack-notification.js > slack-payload.json
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(ROOT, 'src', 'design-docs', 'validation-report.generated.json');

const {
  PR_NUMBER,
  PR_TITLE,
  PR_URL,
  PR_AUTHOR,
  PR_BODY,
  PR_ADDITIONS,
  PR_DELETIONS,
  PR_CHANGED_FILES,
  BASE_SHA,
  HEAD_SHA,
  TRIGGER_EVENT, // 'ready_for_review' | 'synchronize'
  VALIDATION_COMMENT_URL, // '' if no PR comment was found yet
} = process.env;

const CHECK_LABELS = {
  tokenCompliance: 'Token Compliance',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook Coverage',
  documentationCoverage: 'Documentation Coverage',
};

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

// Which src/components/* directories this PR's diff actually touches.
function changedComponentsFromFiles() {
  let diffOutput;
  try {
    diffOutput = git(['diff', '--name-only', BASE_SHA, HEAD_SHA, '--', 'src/components']);
  } catch {
    return [];
  }
  const names = new Set();
  for (const line of diffOutput.split('\n')) {
    const match = line.match(/^src\/components\/([^/]+)\//);
    if (match) names.add(match[1]);
  }
  return names;
}

// Which components' actual validation results changed between base and head
// — independent of which files the diff touched. A regenerate-only commit
// (e.g. confirming a Figma-side variable rebind, where the rendered value
// never changed) can leave src/components/ completely untouched while still
// being "about" one specific component. `lastValidated` is stamped to
// today's date on every component on every design-sync run regardless of
// whether that component changed, so it's stripped out before comparing —
// otherwise every component would look "changed" on every PR.
function changedComponentsFromReport(headReport) {
  let baseReport;
  try {
    baseReport = JSON.parse(git(['show', `${BASE_SHA}:src/design-docs/validation-report.generated.json`]));
  } catch {
    return new Set(headReport.components.map((c) => c.component));
  }
  const stableJson = (c) => JSON.stringify({ ...c, lastValidated: undefined });
  const baseByName = new Map(baseReport.components.map((c) => [c.component, stableJson(c)]));

  const names = new Set();
  for (const component of headReport.components) {
    if (baseByName.get(component.component) !== stableJson(component)) {
      names.add(component.component);
    }
  }
  return names;
}

// Union of both signals — scoping the summary to "what changed" instead of
// the whole design system, however that change actually surfaced in the diff.
function changedComponents(headReport) {
  const fromFiles = changedComponentsFromFiles();
  const fromReport = changedComponentsFromReport(headReport);
  return [...new Set([...fromFiles, ...fromReport])].sort();
}

function worstStatus(statuses) {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('pass-with-warnings')) return 'pass-with-warnings';
  return 'pass';
}

function statusEmoji(status) {
  if (status === 'fail') return '❌';
  if (status === 'pass-with-warnings') return '⚠️';
  return '✅';
}

function statusText(status) {
  if (status === 'fail') return 'Failed';
  if (status === 'pass-with-warnings') return 'Passed with warnings';
  return 'All checks passed';
}

// Tells the reviewer what to do, not just what happened. A failing status
// never actually reaches Slack (the calling workflow step is gated on the
// `status` output this script writes below) — this case is kept here so
// the payload stays correct if this script is ever run standalone to
// preview all three states.
function statusGuidance(status) {
  if (status === 'fail') return '❌ Not ready — checks failing.';
  if (status === 'pass-with-warnings') return '⚠️ Safe to merge — these are noted, not blocking.';
  return '✅ Ready for review.';
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// The PR title is a label, not a description — this pulls the first real
// line of the PR body so "what changed" says something beyond the title.
// Skips markdown headings ("## Summary") to land on the first line of
// actual content.
function whatChangedLine() {
  if (!PR_BODY) return null;
  const line = PR_BODY.split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !/^#+\s/.test(l));
  return line ? truncate(line.replace(/^[-*]\s*/, ''), 200) : null;
}

function diffSizeText() {
  const files = Number(PR_CHANGED_FILES);
  const additions = Number(PR_ADDITIONS);
  const deletions = Number(PR_DELETIONS);
  if (!Number.isFinite(files) || !Number.isFinite(additions) || !Number.isFinite(deletions)) return null;
  return `${files} file${files === 1 ? '' : 's'} · +${additions} −${deletions}`;
}

// Surfaces the actual issue, not just a count — the point of a warn/fail
// count with no content is that a reviewer has to click through to the
// Validation Report to learn anything, even for something trivial.
function issueBullets(scopedComponents, multiComponent) {
  const issues = [];
  for (const component of scopedComponents) {
    for (const check of Object.values(component.checks)) {
      for (const issue of check.open) {
        issues.push({ ...issue, component: component.component });
      }
    }
  }
  issues.sort((a, b) => (a.level === b.level ? 0 : a.level === 'fail' ? -1 : 1));

  const CAP = 4;
  const shown = issues.slice(0, CAP);
  const lines = shown.map((issue) => {
    const emoji = issue.level === 'fail' ? '❌' : '⚠️';
    const where = issue.line ? `${issue.file}:${issue.line}` : issue.file;
    const prefix = multiComponent ? `*${issue.component}* · ` : '';
    return `• ${prefix}${emoji} *${CHECK_LABELS[issue.checkType] ?? issue.checkType}* — \`${where}\`: ${truncate(issue.message, 140)}`;
  });
  if (issues.length > CAP) lines.push(`_+${issues.length - CAP} more — see Validation Report_`);
  return lines;
}

function main() {
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  const touched = changedComponents(report);
  const scoped = touched.length > 0 ? report.components.filter((c) => touched.includes(c.component)) : report.components;

  const overallStatus = scoped.length > 0 ? worstStatus(scoped.map((c) => c.status)) : report.status;

  // Step outputs for the calling workflow to gate the actual Slack post on —
  // this script computes status, but "does this PR post at all" is a firing
  // decision the workflow makes, not this renderer.
  //
  // touched.length === 0 means neither signal in changedComponents() found a
  // design-relevant change: no src/components/ file in the diff, and no
  // component's report entry differs from base. That's a PR with nothing
  // design-system-related to report (tooling, CI, docs, unrelated app code)
  // — posting the whole repo's current status here would attach unrelated
  // components' pre-existing warnings to a PR that never touched them, which
  // is the exact confusion this scoping exists to prevent. should_post=false
  // tells the workflow to skip Slack for this PR entirely rather than fall
  // back to a whole-design-system view.
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `should_post=${touched.length > 0}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `status=${overallStatus}\n`);
  }

  const totals = {};
  for (const key of Object.keys(CHECK_LABELS)) totals[key] = { pass: 0, warn: 0, fail: 0 };
  for (const component of scoped) {
    for (const [key, check] of Object.entries(component.checks)) {
      if (check.status === 'fail') totals[key].fail += 1;
      else if (check.status === 'pass-with-warnings') totals[key].warn += 1;
      else totals[key].pass += 1;
    }
  }

  const componentLabel = touched.length === 0 ? 'Runabout Design System' : touched.join(', ');

  const triggerVerb = TRIGGER_EVENT === 'synchronize' ? 'New commits pushed to a ready PR' : 'Marked ready for review';
  const metaParts = [`PR #${PR_NUMBER}`, `${triggerVerb} by @${PR_AUTHOR}`];
  const sizeText = diffSizeText();
  if (sizeText) metaParts.push(sizeText);

  const contextLines = [`*${PR_TITLE}*`];
  const whatChanged = whatChangedLine();
  if (whatChanged) contextLines.push(whatChanged);
  contextLines.push(metaParts.join(' · '));

  const fields = Object.entries(CHECK_LABELS).map(([key, label]) => ({
    type: 'mrkdwn',
    text: `*${label}*\n${totals[key].pass} pass · ${totals[key].warn} warn · ${totals[key].fail} fail`,
  }));

  const buttons = [
    {
      type: 'button',
      action_id: 'view_pull_request',
      text: { type: 'plain_text', text: 'Pull Request', emoji: true },
      url: PR_URL,
    },
  ];
  if (VALIDATION_COMMENT_URL) {
    buttons.push({
      type: 'button',
      action_id: 'view_validation_report',
      text: { type: 'plain_text', text: 'Validation Report', emoji: true },
      url: VALIDATION_COMMENT_URL,
    });
  }
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${componentLabel} — ${statusEmoji(overallStatus)} ${statusText(overallStatus)}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${statusGuidance(overallStatus)}*` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: contextLines.join('\n') },
    },
    { type: 'divider' },
    { type: 'section', fields },
  ];

  if (overallStatus !== 'pass') {
    const bullets = issueBullets(scoped, touched.length > 1);
    if (bullets.length > 0) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: bullets.join('\n') } });
    }
  }

  // Never link Storybook at this stage: the deployed site only reflects
  // main, not this PR's branch, and only (re)deploys on merge (see
  // deploy-storybook.yml) — a link here would either 404 (new component) or
  // silently show pre-PR content (modified component). The merge-complete
  // Slack message (format-slack-merge-notification.js) is where a real,
  // PR-accurate Storybook link shows up.
  if (touched.length > 0) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '_Storybook available after merge._' }],
    });
  }

  blocks.push({ type: 'actions', elements: buttons });

  const payload = {
    username: 'Runabout CI',
    icon_emoji: ':robot_face:',
    blocks,
  };

  console.log(JSON.stringify(payload));
}

main();
