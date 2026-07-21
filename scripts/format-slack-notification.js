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
 * this only ever runs inside GitHub Actions.
 *
 * Usage: node scripts/format-slack-notification.js > slack-payload.json
 */
import { readFileSync } from 'node:fs';
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
  BASE_SHA,
  HEAD_SHA,
  TRIGGER_EVENT, // 'ready_for_review' | 'synchronize'
  VALIDATION_COMMENT_URL, // '' if no PR comment was found yet
  STORYBOOK_BASE_URL,
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

// Which src/components/* directories this PR's diff actually touches —
// scoping the summary to "what changed" instead of the whole design system.
function changedComponents() {
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
  return [...names].sort();
}

// A component is "new" if its directory didn't exist at the PR's base
// commit — its Storybook page can't exist yet either, since Storybook only
// (re)deploys on push to main (see deploy-storybook.yml).
function existedAtBase(componentName) {
  try {
    const out = git(['ls-tree', '-d', '--name-only', BASE_SHA, `src/components/${componentName}`]);
    return out.trim().length > 0;
  } catch {
    return false;
  }
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

function main() {
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  const touched = changedComponents();
  const scoped = touched.length > 0 ? report.components.filter((c) => touched.includes(c.component)) : report.components;

  const overallStatus = scoped.length > 0 ? worstStatus(scoped.map((c) => c.status)) : report.status;

  const totals = {};
  for (const key of Object.keys(CHECK_LABELS)) totals[key] = { pass: 0, warn: 0, fail: 0 };
  for (const component of scoped) {
    for (const [key, check] of Object.entries(component.checks)) {
      if (check.status === 'fail') totals[key].fail += 1;
      else if (check.status === 'pass-with-warnings') totals[key].warn += 1;
      else totals[key].pass += 1;
    }
  }

  const componentLabel =
    touched.length === 0
      ? 'Runabout Design System'
      : touched.length <= 3
        ? touched.join(', ')
        : `${touched.slice(0, 2).join(', ')} & ${touched.length - 2} more`;

  const newComponents = touched.filter((name) => !existedAtBase(name));
  const storybookLinkAvailable = touched.length === 0 || newComponents.length < touched.length;

  const triggerLine =
    TRIGGER_EVENT === 'synchronize'
      ? `New commits pushed to a ready PR by @${PR_AUTHOR} — "${PR_TITLE}"`
      : `Marked ready for review by @${PR_AUTHOR} — "${PR_TITLE}"`;

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
  if (storybookLinkAvailable) {
    buttons.push({
      type: 'button',
      action_id: 'view_storybook',
      text: { type: 'plain_text', text: 'Storybook', emoji: true },
      url: STORYBOOK_BASE_URL,
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
      text: { type: 'mrkdwn', text: `PR #${PR_NUMBER} · ${triggerLine}` },
    },
    { type: 'divider' },
    { type: 'section', fields },
  ];

  if (!storybookLinkAvailable) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '_Storybook available after merge — new component, no page yet._' }],
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
