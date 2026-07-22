#!/usr/bin/env node
/**
 * format-slack-merge-notification — renders the Slack Block Kit payload
 * posted once a merge to `main` finishes deploying: design-sync re-run,
 * dashboard data regenerated, Storybook and the dashboard both published
 * (see deploy-storybook.yml). This is the point at which the links the
 * ready-for-review message (format-slack-notification.js) deliberately
 * withheld — "Storybook available after merge" — actually resolve.
 *
 * Posted as a second, separate message via the same incoming webhook, not
 * a threaded reply to the ready-for-review message: an incoming webhook's
 * response is just "ok", never the posted message's `ts`, so there's no
 * thread_ts this workflow (a different job, a different run, sometimes
 * minutes later) could have captured to thread against. Real threading —
 * or editing the original message in place instead of posting a second one
 * — needs a Slack bot token and chat.postMessage/chat.update, not a
 * webhook. See docs/how-work-flows.md for what that upgrade would involve.
 *
 * Usage: node scripts/format-slack-merge-notification.js > slack-payload.json
 */
const { STORYBOOK_BASE_URL, DASHBOARD_URL, PR_NUMBER, PR_TITLE, PR_URL, CHANGED_COMPONENTS } = process.env;

const contextLines = ['*✅ Merged — Storybook and dashboard updated*'];
if (PR_NUMBER && PR_TITLE) {
  contextLines.push(`PR #${PR_NUMBER}: ${PR_TITLE}`);
}

// Deep-links the Storybook button straight to the changed component's docs
// page instead of Storybook's root, when the merged PR touched exactly the
// kind of file that means "this component changed" (see the workflow step
// that computes CHANGED_COMPONENTS — *.validation.json doesn't count).
// Storybook's autodocs page id is predictable from a story's own
// `title: 'Components/Name'` meta — verified directly against the live
// deployed Storybook's index.json (every entry follows
// components-<name-lowercase>--docs, e.g. components-card--docs) rather
// than assumed from Storybook's docs. A PR touching more than one component
// links the first (alphabetically, matching how the workflow step sorts
// the list) and names the rest in a line under the buttons; a PR touching
// none (docs/tooling/CI-only) keeps the plain root link.
const changedComponents = (CHANGED_COMPONENTS ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

let storybookUrl = STORYBOOK_BASE_URL;
let storybookButtonText = 'Storybook';
if (changedComponents.length > 0) {
  const [firstComponent, ...restComponents] = changedComponents;
  storybookUrl = `${STORYBOOK_BASE_URL}?path=/docs/components-${firstComponent.toLowerCase()}--docs`;
  storybookButtonText = `Storybook: ${firstComponent}`;
  if (restComponents.length > 0) {
    contextLines.push(`Also touched: ${restComponents.join(', ')}`);
  }
}

const buttons = [
  {
    type: 'button',
    action_id: 'view_storybook',
    text: { type: 'plain_text', text: storybookButtonText, emoji: true },
    url: storybookUrl,
  },
  {
    type: 'button',
    action_id: 'view_dashboard',
    text: { type: 'plain_text', text: 'Dashboard', emoji: true },
    url: DASHBOARD_URL,
  },
];
if (PR_URL) {
  buttons.push({
    type: 'button',
    action_id: 'view_pull_request',
    text: { type: 'plain_text', text: 'Pull Request', emoji: true },
    url: PR_URL,
  });
}

const payload = {
  username: 'Runabout CI',
  icon_emoji: ':robot_face:',
  blocks: [
    { type: 'section', text: { type: 'mrkdwn', text: contextLines.join('\n') } },
    { type: 'actions', elements: buttons },
  ],
};

console.log(JSON.stringify(payload));
