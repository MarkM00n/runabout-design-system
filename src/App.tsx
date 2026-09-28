import { Fragment, useState } from 'react';
import dashboardData from './design-docs/dashboard-data.generated.json';
import foundationsData from './design-docs/foundations-data.generated.json';
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

function formatGeneratedAt(iso: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
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

// "n of N components pass this check" — read from each component's own
// check result, never from the tally, so the meter and the table can't
// disagree.
function passingCount(checkType: string) {
  return data.components.filter((c) => c.checks[checkType]?.pass).length;
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

// The rule file each check enforces, in the repo.
const CHECK_RULE_FILES: Record<keyof DashboardData['validationSummary'], string> = {
  tokenCompliance: 'docs/design-system-rules.md#1-token-compliance',
  accessibility: 'docs/design-system-rules.md#2-accessibility',
  storybookCoverage: 'docs/design-system-rules.md#3-storybook-coverage',
  documentationCoverage: 'docs/design-system-rules.md#5-documentation',
};

// Surface modes and brand overrides are declared in src/styles/tokens.css
// ([data-mode=…] and [data-brand=…] blocks). Counted here by name so the
// panel says what the CSS actually carries.
const SURFACE_MODES = ['cream', 'olive', 'dark', 'terracotta'];
const BRANDS = ['northline'];

// Figma export date, read from the export file's name so it can't drift.
const figmaExportName = Object.keys(import.meta.glob('./tokens/figma-export-*.json'))[0] ?? '';
const FIGMA_SYNCED = figmaExportName.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;

const CHECK_DESCRIPTIONS: Record<keyof DashboardData['validationSummary'], string> = {
  tokenCompliance: 'Every colour, space, radius and type value traces to a token',
  accessibility: 'Text and focus contrast at WCAG 2.2 AA in every mode',
  storybookCoverage: 'A story for every component and variant',
  documentationCoverage: 'Usage docs present and generated from the code',
};

function openIssues() {
  const items = data.components.flatMap((c) =>
    Object.values(c.checks).flatMap((check) => check.open.map((issue) => ({ component: c, issue }))),
  );
  return items.sort((a, b) => (a.issue.level === b.issue.level ? 0 : a.issue.level === 'fail' ? -1 : 1));
}

function shortDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

function Status() {
  const items = openIssues();
  const failing = items.filter((i) => i.issue.level === 'fail').length;
  const warning = items.length - failing;
  const runTone = data.status === 'fail' ? 'fail' : data.status === 'pass-with-warnings' ? 'warn' : 'pass';
  const checksPassing = (Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[]).filter(
    (k) => data.validationSummary[k].fail === 0,
  ).length;
  const facts: { label: string; value: string; tone?: 'pass' | 'warn' | 'fail'; sub?: string }[] = [
    { label: 'Last run', value: runTone === 'fail' ? 'Failed' : 'Passed', tone: runTone === 'fail' ? 'fail' : 'pass', sub: `checks ${formatGeneratedAt(data.validationReportGeneratedAt)} · page ${formatGeneratedAt(data.generatedAt)}` },
    { label: 'Checks', value: `${checksPassing} of 4`, tone: checksPassing === 4 ? 'pass' : 'fail', sub: 'no blocking failures' },
    { label: 'Open issues', value: String(items.length), tone: failing > 0 ? 'fail' : warning > 0 ? 'warn' : 'pass', sub: `${failing} blocking · ${warning} warning` },
    { label: 'Components', value: String(data.totals.totalComponents), sub: `${data.components.filter((c) => c.overall).length} pass every check` },
    { label: 'Figma sync', value: FIGMA_SYNCED ? shortDate(FIGMA_SYNCED) : '—', sub: 'tokens exported from the file' },
  ];
  return (
    <section className="status card" data-mode="cream" aria-label="Status">
      {facts.map((f) => (
        <div className="status-item" key={f.label}>
          <div className="eyebrow">{f.label}</div>
          <div className={`status-value ${f.tone ? `tone-${f.tone}` : ''}`}>
            {f.tone && <span className="status-dot" aria-hidden="true" />}
            {f.value}
          </div>
          {f.sub && <div className="status-sub">{f.sub}</div>}
        </div>
      ))}
    </section>
  );
}

function Issues() {
  const items = openIssues();
  if (items.length === 0) return null;
  return (
    <section className="dashboard-section" aria-label="Issues">
      <h2 className="section-title">Issues · {items.length}</h2>
      <div className="table-scroll card issues" data-mode="cream">
        <table className="dashboard-table plain-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Component</th>
              <th>Check</th>
              <th>What's wrong</th>
              <th>Suggested fix</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ component, issue }, i) => (
              <tr key={i}>
                <td>
                  <span className={`status-badge severity-badge severity-${issue.level}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {issue.level === 'fail' ? 'Blocking' : 'Warning'}
                  </span>
                </td>
                <td className="cell-component">
                  <a href={component.storybookUrl} target="_blank" rel="noreferrer">
                    {component.name}
                  </a>
                </td>
                <td>{checkLabel(issue.checkType)}</td>
                <td className="cell-prose">{issue.message}</td>
                <td className="cell-prose">{issue.fix ?? '—'}</td>
                <td className="issue-where">{whereLabel(issue.file, issue.line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Inventory() {
  const checkTypes = Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[];
  return (
    <section className="dashboard-section" aria-label="Inventory">
      <h2 className="section-title">Inventory</h2>
      <div className="inv-grid">
        <div className="card inv-card" data-mode="cream">
          <div className="eyebrow">Components</div>
          <div className="inv-big">{data.totals.totalComponents}</div>
          <ul className="inv-list">
            <li><span>Passing every check</span><span>{data.components.filter((c) => c.overall).length}</span></li>
            <li><span>With open issues</span><span>{data.components.filter((c) => c.openCount > 0).length}</span></li>
            <li><span>Issues caught &amp; fixed</span><span>{data.totals.totalCaughtAndFixed}</span></li>
            <li><span>Last validated</span><span>{shortDate(data.validationReportGeneratedAt)}</span></li>
          </ul>
        </div>
        <div className="card inv-card" data-mode="cream">
          <div className="eyebrow">Tokens</div>
          <div className="inv-big">{data.totals.totalDesignTokens ?? '—'}</div>
          <ul className="inv-list">
            {TOKEN_CATEGORIES.map(([k, label, path]) => (
              <li key={k}>
                <span>
                  <a href={`${data.links.storybookBaseUrl}?path=/docs/${path}`} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                </span>
                <span>{Array.isArray(foundationsData[k]) ? (foundationsData[k] as unknown[]).length : 0}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card inv-card" data-mode="cream">
          <div className="eyebrow">Modes and brands</div>
          <div className="inv-big">{SURFACE_MODES.length}</div>
          <ul className="inv-list inv-list-stack">
            <li><span>Surface modes</span><span className="inv-desc">{SURFACE_MODES.join(' · ')}</span></li>
            <li><span>Brand overrides</span><span className="inv-desc">{BRANDS.join(' · ')}</span></li>
            <li><span>The rule</span><span className="inv-desc">A surface owns a mode; everything else inherits.</span></li>
          </ul>
        </div>
        <div className="card inv-card" data-mode="cream">
          <div className="eyebrow">Checks, every pull request</div>
          <div className="inv-big">{checkTypes.length}</div>
          <ul className="inv-list inv-list-stack">
            {checkTypes.map((k) => (
              <li key={k}>
                <span>
                  <a href={`${data.links.githubRepoUrl}/blob/main/${CHECK_RULE_FILES[k]}`} target="_blank" rel="noreferrer">
                    {CHECK_LABELS[k]}
                  </a>
                </span>
                <span className="inv-desc">{CHECK_DESCRIPTIONS[k]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Coverage() {
  const checkTypes = Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[];
  const total = data.totals.totalComponents;
  return (
    <section className="dashboard-section" aria-label="Coverage">
      <h2 className="section-title">Coverage</h2>
      <div className="meter-grid">
        {checkTypes.map((key) => {
          const passing = passingCount(key);
          const tally = data.validationSummary[key];
          const tone = tally.fail > 0 ? 'fail' : tally.warn > 0 ? 'warn' : 'pass';
          return (
            <div className="meter card" data-mode="cream" key={key}>
              <div className="meter-head">
                <span className="meter-label">{CHECK_SHORT_LABELS[key]}</span>
                <span className={`meter-count meter-count-${tone}`}>
                  {passing} <span className="meter-of">of {total}</span>
                </span>
              </div>
              <div className="meter-track" role="img" aria-label={`${CHECK_LABELS[key]}: ${passing} of ${total} components passing`}>
                <div className={`meter-fill meter-fill-${tone}`} style={{ width: `${(passing / total) * 100}%` }} />
              </div>
              <div className="meter-foot">{tally.fail > 0 ? `${tally.fail} failing` : tally.warn > 0 ? `${tally.warn} warning` : 'All passing'}</div>
            </div>
          );
        })}
      </div>
    </section>
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

function Library({ expanded, setExpanded }: { expanded: string | null; setExpanded: (v: string | null) => void }) {
  return (
    <section className="dashboard-section table-card" aria-label="All components">
      <details className="lib-details">
        <summary className="lib-summary">All components · {data.totals.totalComponents}</summary>
        <div className="table-scroll" data-mode="cream">
          <table className="dashboard-table">
            <thead data-mode="dark">
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

function App() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="dashboard" data-mode="olive">
      <header className="band" data-mode="terracotta">
        <div className="band-inner">
          <div>
            <h1 className="dashboard-title">Runabout DesignOps</h1>
            <p className="dashboard-subtitle">The design system, reporting on itself · updates on every merge</p>
          </div>
          <nav className="dashboard-links">
            <a href={data.links.githubRepoUrl} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>GitHub</a>
            <a href={data.links.storybookBaseUrl} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>Storybook</a>
          </nav>
        </div>
      </header>
      <div className="dashboard-inner">
        <Status />
        <Issues />
        <Inventory />
        <Coverage />
        <Activity />
        <Library expanded={expanded} setExpanded={setExpanded} />
      </div>
    </div>
  );
}

export default App;
