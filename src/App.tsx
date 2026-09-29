import { Fragment, useState } from 'react';
import dashboardData from './design-docs/dashboard-data.generated.json';
import foundationsData from './design-docs/foundations-data.generated.json';
import validationReport from './design-docs/validation-report.generated.json';
import type { ValidationStatus } from './design-docs/types';
import { statusLabel, statusTone } from './design-docs/statusFormat';
import './App.css';

interface ValidationIssue {
  level: 'fail' | 'warn';
  checkType: string;
  file: string;
  line: number | null;
  message: string;
  fix: string | null;
  openedAt?: string | null;
}

interface ResolvedIssue {
  checkType: string;
  file: string;
  line: number | null;
  message: string;
  fix: string | null;
  resolvedAt: string;
}

interface CheckResult {
  pass: boolean;
  fail: number;
  warn: number;
  status: ValidationStatus;
  open: ValidationIssue[];
}

interface ComponentRow {
  name: string;
  overall: boolean;
  status: ValidationStatus;
  checks: Record<string, CheckResult>;
  openCount: number;
  openFailCount: number;
  openWarnCount: number;
  fixedCount: number;
  history: ResolvedIssue[];
  lastValidated: string | null;
  storybookUrl: string;
  pr: { number: number; url: string } | null;
  cycleTimeSeconds: number | null;
  mergedAt: string | null;
}

interface CheckTally {
  fail: number;
  warn: number;
}

interface DashboardData {
  generatedAt: string;
  validationReportGeneratedAt: string;
  status: ValidationStatus;
  methodologyNotes: {
    cycleTime: string;
    firstTimePassRate: string;
    caughtAndFixed: string;
  };
  totals: {
    totalComponents: number;
    averageCycleTimeLabel: string | null;
    medianCycleTimeLabel: string | null;
    cycleTimeSampleSize: number;
    totalOpenIssues: number;
    totalCaughtAndFixed: number;
    totalDesignTokens: number | null;
  };
  validationSummary: {
    tokenCompliance: CheckTally;
    accessibility: CheckTally;
    storybookCoverage: CheckTally;
    documentationCoverage: CheckTally;
  };
  components: ComponentRow[];
  links: {
    githubRepoUrl: string;
    storybookBaseUrl: string;
  };
}

const data = dashboardData as DashboardData;

// The real Button component's secondary + small variant, reapplied here
// verbatim (see src/components/Button/Button.tsx) rather than approximated.
// Button renders a <button>, and design-system-rules.md/Button's own docs
// rule out nesting a link inside one ("nested interactive elements —
// screen readers cannot represent nested controls"), so these are real
// anchors carrying the same classes instead of a wrapped Button.
// text-primary resolves correctly here because the dashboard's root
// element carries data-mode="olive" (see the JSX below) — the canvas is
// Ink/900, which is what On Olive means under the 2026-09-07 architecture.
const SECONDARY_LINK_CLASS =
  'inline-flex items-center justify-center gap-01 font-manrope font-normal select-none ' +
  'transition-colors duration-150 ease-out h-[32px] px-02 rounded-xl text-label ' +
  'bg-action-secondary text-text-primary border border-border-strong ' +
  'hover:bg-action-secondary-hover ' +
  // Matches Button's own recipe post-2026-09-07: a 2px state-focus outline
  // offset 2px, and no outline-none anywhere. The old ring-based version
  // paired outline-none with a ring, which worked only because a ring is a
  // box-shadow — swapping to a real outline means the suppression has to go
  // (rules §2).
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-focus';

const CHECK_LABELS: Record<keyof DashboardData['validationSummary'], string> = {
  tokenCompliance: 'Token Compliance',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook Coverage',
  documentationCoverage: 'Documentation Coverage',
};

// Short forms for the meter tiles, where four sit in a row and the long
// label wrapped onto the count. The full label stays on the table and in
// the aria-label, so nothing is lost for a screen reader.
const CHECK_SHORT_LABELS: Record<keyof DashboardData['validationSummary'], string> = {
  tokenCompliance: 'Tokens',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook',
  documentationCoverage: 'Documentation',
};

// Three states, not two: a component that passes every check but still has
// open warnings isn't a clean pass, so it gets its own amber state rather
// than being shown identical to a component with nothing open at all.
function StatusBadge({ status, warnCount }: { status: ValidationStatus; warnCount: number }) {
  return (
    <span className={`status-badge status-${statusTone(status)}`}>
      <span className="status-dot" aria-hidden="true" />
      {statusLabel(status, warnCount)}
    </span>
  );
}

// Seconds → "28m" / "18h 38m". Whole minutes only: the pipeline's own
// resolution is a git timestamp, and a seconds column would imply precision
// the sample doesn't carry.
function formatCycle(seconds: number | null) {
  if (seconds == null) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function checkLabel(checkType: string) {
  return CHECK_LABELS[checkType as keyof DashboardData['validationSummary']] ?? checkType;
}

// Full repo-relative paths are redundant inside a panel that's already
// scoped to one component (src/components/Card/Card.tsx:50 vs. just
// Card.tsx:50) — the basename plus line number is what's actually scannable
// at speed, and the full path is still one click away via the file's own
// story/PR links elsewhere in the row.
function whereLabel(file: string, line: number | null) {
  const basename = file.split('/').pop() ?? file;
  return line ? `${basename}:${line}` : basename;
}

function SeverityBadge({ level }: { level: 'fail' | 'warn' }) {
  // Icon only, per request — but the label doesn't disappear, it moves to
  // aria-label, so the distinction (not just the icon shape) still reaches
  // screen readers rather than being dropped outright.
  return (
    <span className={`status-badge severity-badge severity-${level}`}>
      <span className="status-dot" aria-hidden="true" />
      {level === 'fail' ? 'Fail' : 'Warn'}
    </span>
  );
}

function OpenIssuesTable({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return <p className="issue-empty">No open issues.</p>;
  }
  // Worst-first so the thing most worth fixing is the first row, not
  // whatever order the check functions happened to run in.
  const sorted = [...issues].sort((a, b) => (a.level === b.level ? 0 : a.level === 'fail' ? -1 : 1));
  return (
    <div className="issue-table-scroll">
      <table className="issue-table">
        <thead>
          <tr>
            <th className="issue-col-severity">Severity</th>
            <th className="issue-col-check">Check type</th>
            <th>What failed</th>
            <th className="issue-col-where">Where</th>
            <th>Suggested fix</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((issue, i) => (
            <tr key={i}>
              <td className="issue-col-severity">
                <SeverityBadge level={issue.level} />
              </td>
              <td className="issue-col-check">{checkLabel(issue.checkType)}</td>
              <td>{issue.message}</td>
              <td className="issue-col-where issue-where">{whereLabel(issue.file, issue.line)}</td>
              <td>{issue.fix ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ entries }: { entries: ResolvedIssue[] }) {
  if (entries.length === 0) {
    return <p className="issue-empty">No issues caught and fixed yet.</p>;
  }
  return (
    <div className="issue-table-scroll">
      <table className="issue-table">
        <thead>
          <tr>
            <th className="issue-col-check">Check type</th>
            <th>What was wrong</th>
            <th className="issue-col-where">Where</th>
            <th className="issue-col-fixed">Fixed</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td className="issue-col-check">{checkLabel(entry.checkType)}</td>
              <td>{entry.message}</td>
              <td className="issue-col-where issue-where">{whereLabel(entry.file, entry.line)}</td>
              <td className="issue-col-fixed">
                <span className="status-badge severity-badge severity-fixed">
                  <span className="status-dot" aria-hidden="true" />
                  Fixed
                </span>{' '}
                {entry.resolvedAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComponentRowDetail({ component }: { component: ComponentRow }) {
  const openIssues = Object.values(component.checks).flatMap((c) => c.open);
  return (
    <tr className="detail-row">
      <td colSpan={8}>
        <div className="detail-panel">
          <div className="detail-block">
            <h3 className="detail-title">Open issues ({openIssues.length})</h3>
            <OpenIssuesTable issues={openIssues} />
          </div>
          <div className="detail-block">
            <h3 className="detail-title">Caught &amp; fixed history ({component.history.length})</h3>
            <HistoryTable entries={component.history} />
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// A control panel for whoever runs the system. Read top to bottom:
//   Status    — did the last run pass, when, what's open, when Figma last synced
//   Issues    — the work queue, worst first, with the fix and where to look
//   Inventory — what's in the system: components, tokens by category, modes, checks
//   Coverage  — n of N components passing each check
//   Activity  — recent merges through the pipeline
//   Library   — the full component table, collapsed
// ---------------------------------------------------------------------------


// Each category links to its Foundations page in Storybook, so the
// inventory is an index into the system, not just a count.
const TOKEN_CATEGORIES: [keyof typeof foundationsData, string, string][] = [
  ['color', 'Colour', 'foundations-colours--docs'],
  ['typography', 'Type', 'foundations-typography--docs'],
  ['spacing', 'Spacing', 'foundations-spacing--docs'],
  ['radius', 'Radius', 'foundations-radius--docs'],
  ['motion', 'Motion', 'foundations-motion--docs'],
  ['breakpoint', 'Breakpoints', 'foundations-breakpoints--docs'],
];

// Every gate work passes through, with the rule it enforces. Three groups:
// the design check in Figma before anything is built, the four per-component
// checks, and the two whole-system checks. The per-component and system
// results come from the last design-sync run; the Figma gate runs in the
// Claude app before a build and has no result to show here.
type Gate = { name: string; what: string; rule: string; result?: boolean | null; detail?: string };
const RULES = 'docs/design-system-rules.md';
const systemPass = (validationReport as { categoryPass: Record<string, boolean> }).categoryPass;
const GATE_GROUPS: { title: string; note: string; gates: Gate[] }[] = [
  {
    title: 'In Figma, before build',
    note: 'Ready for AI · in the Claude app, on request',
    gates: [
      { name: 'Library components', what: 'nothing detached', rule: 'docs/ready-for-ai.md#1-uses-library-components-not-detached', result: null },
      { name: 'Colours', what: 'bound to variables', rule: 'docs/ready-for-ai.md#2-colours-bound-to-variables', result: null },
      { name: 'Text styles', what: 'applied, every variant', rule: 'docs/ready-for-ai.md#3-text-styles-applied', result: null },
      { name: 'Spacing', what: 'bound to variables', rule: 'docs/ready-for-ai.md#4-spacing-bound-to-variables', result: null },
      { name: 'Variants', what: 'properties clearly named', rule: 'docs/ready-for-ai.md#5-variant-properties-clearly-named', result: null },
      { name: 'Behaviour notes', what: 'in the description', rule: 'docs/ready-for-ai.md#6-behaviour-notes-in-the-description', result: null },
      { name: 'Accessibility', what: 'contrast and touch targets', rule: 'docs/ready-for-ai.md#7-accessibility-basics', result: null },
    ],
  },
  {
    title: 'Per component',
    note: 'design-sync, every pull request',
    gates: [
      { name: 'Tokens', what: 'values trace to tokens', rule: `${RULES}#1-token-compliance` },
      { name: 'Accessibility', what: 'AA contrast, every mode', rule: `${RULES}#2-accessibility` },
      { name: 'Storybook', what: 'a story per variant', rule: `${RULES}#3-storybook-coverage` },
      { name: 'Documentation', what: 'docs from the code', rule: `${RULES}#5-documentation` },
    ],
  },
  {
    title: 'Whole system',
    note: 'design-sync, every pull request',
    gates: [
      { name: 'Foundations', what: 'every token documented, nothing documented that is missing', rule: `${RULES}#6-foundations`, result: systemPass['Foundation Coverage'] },
      { name: 'Dashboard', what: 'this page uses only tokens and classes that exist', rule: 'CLAUDE.md#component-changes-must-also-sweep-every-consumer-outside-srccomponents', result: systemPass['Dashboard Coverage'] },
      { name: 'Builds', what: 'Storybook and the dashboard build clean', rule: 'prompts/validate-component.md', result: systemPass['Storybook Coverage'] && systemPass['Dashboard Coverage'] },
    ],
  },
];
const GATE_COUNT = GATE_GROUPS.reduce((n, g) => n + g.gates.length, 0);

// Surface modes and brand overrides are declared in src/styles/tokens.css
// ([data-mode=…] and [data-brand=…] blocks). Counted here by name so the
// panel says what the CSS actually carries.
const SURFACE_MODES = ['cream', 'olive', 'dark', 'terracotta'];
const BRANDS = ['northline'];

// Figma export date, read from the export file's name so it can't drift.
const figmaExportName = Object.keys(import.meta.glob('./tokens/figma-export-*.json'))[0] ?? '';
const FIGMA_SYNCED = figmaExportName.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;

function openIssues() {
  const items = data.components.flatMap((c) =>
    Object.values(c.checks).flatMap((check) => check.open.map((issue) => ({ component: c, issue }))),
  );
  return items.sort((a, b) => {
    if (a.issue.level !== b.issue.level) return a.issue.level === 'fail' ? -1 : 1;
    return (a.issue.openedAt ?? '9999').localeCompare(b.issue.openedAt ?? '9999');
  });
}

function shortTime(iso: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

// "22 days" / "today" from a YYYY-MM-DD, against the report's own run date
// so the age is the pipeline's clock, not the viewer's.
function ageLabel(openedAt: string | null | undefined) {
  if (!openedAt) return null;
  const from = new Date(`${openedAt}T00:00:00Z`).getTime();
  const to = new Date(data.validationReportGeneratedAt.slice(0, 10) + 'T00:00:00Z').getTime();
  const days = Math.max(0, Math.round((to - from) / 86400000));
  return days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`;
}

function shortDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

function healthSummary() {
  const items = openIssues();
  const failing = items.filter((i) => i.issue.level === 'fail').length;
  const warning = items.length - failing;
  const tone: 'pass' | 'warn' | 'fail' = failing > 0 ? 'fail' : warning > 0 ? 'warn' : 'pass';
  const text = failing > 0 ? `${failing} blocking` : warning > 0 ? `Healthy · ${warning} warning${warning === 1 ? '' : 's'}` : 'Healthy';
  return { items, failing, warning, tone, text };
}

function Status() {
  const { items, failing, warning } = healthSummary();
  const checksPassing = (Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[]).filter(
    (k) => data.validationSummary[k].fail === 0,
  ).length;
  const passingAll = data.components.filter((c) => c.overall).length;
  void passingAll;
  const facts: { label: string; value: string; tone?: 'pass' | 'warn' | 'fail'; sub: string }[] = [
    { label: 'Last run', value: data.status === 'fail' ? 'Failed' : 'Passed', tone: data.status === 'fail' ? 'fail' : 'pass', sub: `${shortDate(data.validationReportGeneratedAt)}, ${shortTime(data.validationReportGeneratedAt)}` },
    { label: 'Checks passing', value: `${checksPassing} / 4`, tone: checksPassing === 4 ? 'pass' : 'fail', sub: 'every pull request' },
    { label: 'Open issues', value: String(items.length), tone: failing > 0 ? 'fail' : warning > 0 ? 'warn' : 'pass', sub: failing > 0 ? `${failing} blocking` : `${warning} warning` },
    { label: 'Figma sync', value: FIGMA_SYNCED ? shortDate(FIGMA_SYNCED) : '—', sub: 'tokens exported' },
  ];
  return (
    <section className="status-tiles span-12" aria-label="Status">
      {facts.map((f) => (
        <div className={`card inv-card ${f.tone ? `tile-${f.tone}` : ''}`} data-mode="cream" key={f.label}>
          <div className="eyebrow tile-eyebrow">
            {f.label}
            {f.tone && <span className="status-dot tile-dot" aria-hidden="true" />}
          </div>
          <div className="inv-big">{f.value}</div>
          <div className="inv-sub">{f.sub}</div>
        </div>
      ))}
    </section>
  );
}

const ISSUES_SHOWN = 5;

// The work queue. Each issue is a row with a severity rail down its left
// edge, the component and check as the title, the problem in one line, and
// a right-hand column with the age and the file. Blocking rows sit first.
function Issues() {
  const { items, failing, warning } = healthSummary();
  const [all, setAll] = useState(false);
  if (items.length === 0) return null;
  const shown = all ? items : items.slice(0, ISSUES_SHOWN);
  return (
    <section className="dashboard-section" aria-label="Issues">
      <div className="section-head">
        <h2 className="section-title">Issues</h2>
        <span className="section-stat">
          {failing > 0 && <strong className="tone-fail-text">{failing} blocking</strong>}
          {failing > 0 && warning > 0 && ' · '}
          {warning > 0 && <span>{warning} warning{warning === 1 ? '' : 's'}</span>}
        </span>
      </div>
      <ul className="issue-list">
        {shown.map(({ component, issue }, i) => {
          const age = ageLabel(issue.openedAt);
          const stale = (age ?? '').endsWith('days') && parseInt(age ?? '0') >= 14;
          return (
            <li className={`issue-row issue-${issue.level}`} key={i}>
              <span className={`status-badge severity-badge severity-${issue.level}`}>
                <span className="status-dot" aria-hidden="true" />
                {issue.level === 'fail' ? 'Blocking' : 'Warning'}
              </span>
              <div className="issue-body">
                <div className="issue-title">
                  <a href={component.storybookUrl} target="_blank" rel="noreferrer" className="issue-component">{component.name}</a>
                  <span className="issue-check"> · {CHECK_SHORT_LABELS[issue.checkType as keyof DashboardData['validationSummary']] ?? issue.checkType}</span>
                  <span className="issue-where">{whereLabel(issue.file, issue.line)}</span>
                </div>
                <p className="issue-msg">{issue.message}</p>
                <div className="issue-meta">
                  <a href={component.storybookUrl} target="_blank" rel="noreferrer">Open story</a>
                  {component.pr && <a href={component.pr.url} target="_blank" rel="noreferrer">PR #{component.pr.number}</a>}
                  <span>Fix in the component row below</span>
                </div>
              </div>
              <span className={`issue-age-pill ${stale ? 'issue-age-stale' : ''}`}>
                <span className="issue-age-n">{age ?? '—'}</span>
                {issue.openedAt && <span className="issue-age-d">since {shortDate(issue.openedAt)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {items.length > ISSUES_SHOWN && (
        <button type="button" className="show-all" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

function Inventory() {
  const passingAll = data.components.filter((c) => c.overall).length;
  const counts = TOKEN_CATEGORIES.map(([k, label, path]) => ({ k, label, path, n: Array.isArray(foundationsData[k]) ? (foundationsData[k] as unknown[]).length : 0 }));
  const maxCount = Math.max(...counts.map((c) => c.n));
  const numbers: [string, string, string][] = [
    [String(data.totals.totalComponents), 'Components', `${passingAll} pass every check`],
    [String(data.totals.totalDesignTokens ?? '—'), 'Tokens', `${counts.length} categories`],
    [String(SURFACE_MODES.length), 'Surface modes', `${BRANDS.length} brand override`],
    [String(GATE_COUNT), 'Gates', 'on every change'],
  ];
  return (
    <>
      <section className="inv-row span-12" aria-label="Inventory">
        {numbers.map(([v, l, sub]) => (
          <div className="card inv-card" data-mode="cream" key={l}>
            <div className="eyebrow">{l}</div>
            <div className="inv-big">{v}</div>
            <div className="inv-sub">{sub}</div>
          </div>
        ))}
      </section>
      <section className="card panel span-6" data-mode="cream" aria-label="Tokens by category">
        <h2 className="panel-title">Tokens by category</h2>
        <ul className="tok-list">
          {counts.map((c) => (
            <li className="tok-row" key={c.k}>
              <a className="tok-label" href={`${data.links.storybookBaseUrl}?path=/docs/${c.path}`} target="_blank" rel="noreferrer">{c.label}</a>
              <span className="tok-track"><span className="tok-bar" data-mode="terracotta" style={{ width: `${Math.max((c.n / maxCount) * 100, 2)}%` }} /></span>
              <span className="tok-n">{c.n}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card panel span-6" data-mode="cream" aria-label="Surface modes">
        <h2 className="panel-title">Surface modes</h2>
        <ul className="mode-list mode-list-4">
          {SURFACE_MODES.map((m) => (
            <li key={m}><span className="mode-swatch" data-mode={m} aria-hidden="true" /><span className="mode-name">{m}</span></li>
          ))}
          {BRANDS.map((b) => (
            <li key={b}><span className="mode-swatch" data-brand={b} data-mode="terracotta" aria-hidden="true" /><span className="mode-name">{b}<span className="mode-tag">brand</span></span></li>
          ))}
        </ul>
        <p className="mode-rule">A surface owns a mode; everything else inherits.</p>
      </section>
    </>
  );
}

function Gates() {
  const checkTypes = Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[];
  return (
    <>
      {GATE_GROUPS.map((g) => (
        <section className="card panel span-4" data-mode="cream" key={g.title} aria-label={g.title}>
          <h2 className="panel-title">{g.title}</h2>
          <div className="panel-sub">{g.note}</div>
          <ul className="check-list">
            {g.gates.map((gate) => {
              const perComponent = checkTypes.find((k) => CHECK_SHORT_LABELS[k] === gate.name);
              const t = perComponent ? data.validationSummary[perComponent] : null;
              const tone = gate.result === null ? 'none' : t ? (t.fail > 0 ? 'fail' : t.warn > 0 ? 'warn' : 'pass') : gate.result ? 'pass' : 'fail';
              const result = gate.result === null ? 'Before build' : t ? (t.fail > 0 ? `${t.fail} failing` : t.warn > 0 ? `${t.warn} warning` : 'Pass') : gate.result ? 'Pass' : 'Fail';
              return (
                <li key={gate.name} className={`check-row${gate.result === null ? ' check-row-compact' : ''}`}>
                  <span className="check-text">
                    <a href={`${data.links.githubRepoUrl}/blob/main/${gate.rule}`} target="_blank" rel="noreferrer">{gate.name}</a>
                    <span className="inv-sub">{gate.what}</span>
                  </span>
                  {tone !== 'none' && (
                    <span className={`status-badge check-pill tone-${tone}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {result}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}


function Activity() {
  // One row per merge (a PR can land several components at once).
  const byPr = new Map<number, { pr: NonNullable<ComponentRow['pr']>; mergedAt: string; names: string[]; cycle: number | null; status: ValidationStatus }>();
  for (const c of data.components) {
    if (!c.pr || !c.mergedAt) continue;
    const cur = byPr.get(c.pr.number);
    if (cur) {
      cur.names.push(c.name);
      if (c.status === 'fail' || (c.status === 'pass-with-warnings' && cur.status === 'pass')) cur.status = c.status;
    } else byPr.set(c.pr.number, { pr: c.pr, mergedAt: c.mergedAt, names: [c.name], cycle: c.cycleTimeSeconds, status: c.status });
  }
  const rows = [...byPr.values()].sort((a, b) => b.mergedAt.localeCompare(a.mergedAt)).slice(0, 10);
  return (
    <section className="dashboard-section" aria-label="Activity">
      <div className="section-head">
        <h2 className="section-title">Activity · last {rows.length} merges</h2>
        <span className="section-stat">
          median time to merge <strong>{data.totals.medianCycleTimeLabel}</strong>
        </span>
      </div>
      <div className="table-scroll card" data-mode="cream">
        <table className="dashboard-table plain-table">
          <thead>
            <tr>
              <th>Merged</th>
              <th>Pull request</th>
              <th>Components</th>
              <th>Checks</th>
              <th className="col-num">First commit → merged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pr.number}>
                <td>{shortDate(r.mergedAt)}</td>
                <td>
                  <a href={r.pr.url} target="_blank" rel="noreferrer">PR #{r.pr.number}</a>
                </td>
                <td className="cell-prose">{r.names.join(', ')}</td>
                <td><StatusBadge status={r.status === 'pass-with-warnings' ? 'pass' : r.status} warnCount={0} /></td>
                <td className="col-num cell-cycle">{formatCycle(r.cycle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Per-squad adoption. Rows are the team's product squads; every value is a
// placeholder until the checks run against that squad's repo, so the shape
// is visible without any number being invented.
const SQUADS = ['Engage', 'Operate', 'Platform', 'Data Intelligence', 'Growth'];

function Squads() {
  return (
    <section className="dashboard-section" aria-label="Squads">
      <div className="section-head">
        <h2 className="section-title">Squads · {SQUADS.length}</h2>
        <span className="section-stat">not connected yet</span>
      </div>
      <div className="table-scroll card" data-mode="cream">
        <table className="dashboard-table plain-table squads-table">
          <thead>
            <tr>
              <th>Squad</th>
              <th>On-system UI</th>
              <th className="col-num">Issues</th>
              <th>Last merge</th>
            </tr>
          </thead>
          <tbody>
            {SQUADS.map((name) => (
              <tr key={name} className="squad-row squad-row-pending">
                <td className="cell-component">{name}</td>
                <td>
                  <span className="squad-meter" aria-hidden="true"><span className="squad-meter-fill" /></span>
                </td>
                <td className="col-num squad-dash">—</td>
                <td className="squad-dash">not connected</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Library({ expanded, setExpanded }: { expanded: string | null; setExpanded: (v: string | null) => void }) {
  return (
    <section className="dashboard-section table-card" aria-label="All components">
      <details className="lib-details">
        <summary className="lib-summary"><span className="lib-summary-title">All components</span><span className="lib-summary-count">{data.totals.totalComponents} · click to expand</span></summary>
        <div className="table-scroll" data-mode="cream">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Overall</th>
                <th className="col-num">Caught &amp; fixed</th>
                <th className="col-num">Open</th>
                <th className="col-num">Cycle time</th>
                <th>Links</th>
                <th>Last validated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.components.map((c) => {
                const isExpanded = expanded === c.name;
                return (
                  <Fragment key={c.name}>
                    <tr className="component-row" onClick={() => setExpanded(isExpanded ? null : c.name)} aria-expanded={isExpanded}>
                      <td className="cell-component">{c.name}</td>
                      <td><StatusBadge status={c.status} warnCount={c.openWarnCount} /></td>
                      <td className="col-num">{c.fixedCount}</td>
                      <td className="col-num">{c.openCount}</td>
                      <td className="col-num cell-cycle">{formatCycle(c.cycleTimeSeconds)}</td>
                      <td className="cell-links">
                        <a href={c.storybookUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Story</a>
                        {c.pr && (<>{' · '}<a href={c.pr.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>PR #{c.pr.number}</a></>)}
                      </td>
                      <td>{c.lastValidated ?? '—'}</td>
                      <td className="cell-expand-toggle">{isExpanded ? '▾' : '▸'}</td>
                    </tr>
                    {isExpanded && <ComponentRowDetail component={c} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function HealthPill() {
  const { tone, text } = healthSummary();
  return (
    <span className={`run-pill run-pill-${tone}`}>
      <span className="run-pill-dot" aria-hidden="true" />
      {text} · {shortTime(data.validationReportGeneratedAt)}
    </span>
  );
}

function App() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="dashboard dashboard-light" data-mode="cream">
      <header className="band" data-mode="terracotta">
        <div className="band-inner">
          <div>
            <h1 className="dashboard-title">Runabout System Status</h1>
            <p className="dashboard-subtitle">Health, inventory and activity, regenerated on every merge.</p>
          </div>
          <div className="band-right">
            <HealthPill />
            <nav className="dashboard-links">
              <a href={data.links.githubRepoUrl} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>GitHub</a>
              <a href={data.links.storybookBaseUrl} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>Storybook</a>
            </nav>
          </div>
        </div>
      </header>
      <div className="dashboard-inner grid">
        <Status />
        <div className="span-12"><Issues /></div>
        <div className="span-12"><Activity /></div>
        <div className="span-12"><Squads /></div>
        <Inventory />
        <Gates />
        <div className="span-12"><Library expanded={expanded} setExpanded={setExpanded} /></div>
      </div>
    </div>
  );
}

export default App;
