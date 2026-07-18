import type { ValidationStatus } from './types';

/**
 * Shared by the dashboard (App.tsx) and Storybook's DocsPage.tsx so the
 * three-state label/tone/summary wording can't drift between the two —
 * both read `status`/`fail`/`warn` counts straight from the same generated
 * report, this just presents them consistently.
 */

export function statusLabel(status: ValidationStatus, warnCount: number): string {
  if (status === 'fail') return 'Fail';
  if (status === 'pass-with-warnings') return `Pass — ${warnCount} warning${warnCount === 1 ? '' : 's'}`;
  return 'Pass';
}

export function statusTone(status: ValidationStatus): 'pass' | 'warn' | 'fail' {
  if (status === 'fail') return 'fail';
  if (status === 'pass-with-warnings') return 'warn';
  return 'pass';
}

// "N caught and fixed · N open warnings" — precise wording per request:
// never call a warning an "issue". Open failures (rare — none exist in this
// repo today) get their own clause rather than being folded into "warnings".
export function summaryLine(fixedCount: number, openFailCount: number, openWarnCount: number): string {
  const parts = [`${fixedCount} caught and fixed`];
  if (openFailCount > 0) {
    parts.push(`${openFailCount} open failure${openFailCount === 1 ? '' : 's'}`);
  }
  parts.push(`${openWarnCount} open warning${openWarnCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
