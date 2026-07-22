# Slack notification test

Throwaway file to verify the two-stage Slack notification flow end to end:

1. Marking this PR ready for review should post the "Ready for review"
   message (no Storybook link, just "Storybook available after merge").
2. Merging this PR should trigger `deploy-storybook.yml`, which should
   post the "✅ Merged — Storybook and dashboard updated" follow-up once
   the deploy finishes.

Safe to delete once both messages are confirmed in Slack.
