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
const { STORYBOOK_BASE_URL, DASHBOARD_URL, PR_NUMBER, PR_TITLE, PR_URL } = process.env;

const contextLines = ['*✅ Merged — Storybook and dashboard updated*'];
if (PR_NUMBER && PR_TITLE) {
  contextLines.push(`PR #${PR_NUMBER}: ${PR_TITLE}`);
}

const buttons = [
  {
    type: 'button',
    action_id: 'view_storybook',
    text: { type: 'plain_text', text: 'Storybook', emoji: true },
    url: STORYBOOK_BASE_URL,
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
