import { Fragment, useState } from 'react';
import dashboardData from './design-docs/dashboard-data.generated.json';
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
  open: ValidationIssue[];
}

interface ComponentRow {
  name: string;
  overall: boolean;
  checks: Record<string, CheckResult>;
  openCount: number;
  fixedCount: number;
  history: ResolvedIssue[];
  lastValidated: string | null;
  storybookUrl: string;
  pr: { number: number; url: string } | null;
  cycleTimeSeconds: number | null;
}

interface CheckTally {
  fail: number;
  warn: number;
}

interface DashboardData {
  generatedAt: string;
  validationReportGeneratedAt: string;
  methodologyNotes: {
    cycleTime: string;
    firstTimePassRate: string;
    caughtAndFixed: string;
  };
  totals: {
    totalComponents: number;
    averageCycleTimeLabel: string | null;
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

const CHECK_LABELS: Record<keyof DashboardData['validationSummary'], string> = {
  tokenCompliance: 'Token Compliance',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook Coverage',
  documentationCoverage: 'Documentation Coverage',
};

function StatusMark({ pass }: { pass: boolean }) {
  return (
    <span
      aria-label={pass ? 'Pass' : 'Fail'}
      className={pass ? 'text-state-success' : 'text-state-error'}
      style={{ fontWeight: 700 }}
    >
      {pass ? '✓' : '✗'}
    </span>
  );
}

function formatGeneratedAt(iso: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
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
  return (
    <span className={`severity-badge severity-${level}`}>
      {level === 'fail' ? '✗ Fail' : '⚠ Warn'}
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
                <span className="severity-badge severity-fixed">✓ Fixed</span> {entry.resolvedAt}
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
      <td colSpan={7}>
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

function App() {
  const checkTypes = Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Runabout DesignOps — Pilot Dashboard</h1>
          <p className="dashboard-subtitle">
            Live snapshot, generated {formatGeneratedAt(data.generatedAt)}
          </p>
        </div>
        <nav className="dashboard-links">
          <a href={data.links.githubRepoUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={data.links.storybookBaseUrl} target="_blank" rel="noreferrer">
            Storybook
          </a>
        </nav>
      </header>

      <section className="dashboard-metrics" aria-label="Headline metrics">
        <div className="metric-tile">
          <div className="metric-number">{data.totals.totalComponents}</div>
          <div className="metric-label">Components in the workflow</div>
        </div>

        <div className="metric-tile">
          <div className="metric-number">{data.totals.averageCycleTimeLabel ?? '—'}</div>
          <div className="metric-label">Avg. commit → merged PR</div>
        </div>

        <div className="metric-tile">
          <div className={`metric-number ${data.totals.totalOpenIssues > 0 ? 'metric-number-warn' : ''}`}>
            {data.totals.totalOpenIssues}
          </div>
          <div className="metric-label">Open issues right now</div>
        </div>

        <div className="metric-tile">
          <div className="metric-number">{data.totals.totalCaughtAndFixed}</div>
          <div className="metric-label">Caught &amp; fixed to date</div>
        </div>

        <div className="metric-tile">
          <div className="metric-number">{data.totals.totalDesignTokens ?? '—'}</div>
          <div className="metric-label">Design tokens documented</div>
        </div>
      </section>

      <section className="dashboard-section" aria-label="Errors caught by validation">
        <h2 className="section-title">Errors caught by validation, by check type</h2>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Check type</th>
              <th>Fail</th>
              <th>Warn</th>
            </tr>
          </thead>
          <tbody>
            {checkTypes.map((key) => {
              const tally = data.validationSummary[key];
              return (
                <tr key={key}>
                  <td>{CHECK_LABELS[key]}</td>
                  <td className={tally.fail > 0 ? 'cell-fail' : ''}>{tally.fail}</td>
                  <td className={tally.warn > 0 ? 'cell-warn' : ''}>{tally.warn}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="dashboard-section component-status-card" aria-label="Component status">
        <h2 className="section-title">Component status</h2>
        <p className="section-caption">{data.methodologyNotes.caughtAndFixed} Click a row to see its issues.</p>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Overall</th>
                <th>Caught &amp; fixed</th>
                <th>Open</th>
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
                    <tr
                      className="component-row"
                      onClick={() => setExpanded(isExpanded ? null : c.name)}
                      aria-expanded={isExpanded}
                    >
                      <td className="cell-component">{c.name}</td>
                      <td>
                        <StatusMark pass={c.overall} />
                      </td>
                      <td>{c.fixedCount}</td>
                      <td className={c.openCount > 0 ? 'cell-warn' : ''}>{c.openCount}</td>
                      <td className="cell-links">
                        <a href={c.storybookUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          Story
                        </a>
                        {c.pr && (
                          <>
                            {' · '}
                            <a
                              href={c.pr.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              PR #{c.pr.number}
                            </a>
                          </>
                        )}
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
      </section>
    </div>
  );
}

export default App;
