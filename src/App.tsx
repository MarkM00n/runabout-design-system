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

function IssueDetailTable({ rows, mode }: { rows: (ValidationIssue | ResolvedIssue)[]; mode: 'open' | 'history' }) {
  if (rows.length === 0) {
    return <p className="issue-empty">None.</p>;
  }
  return (
    <table className="issue-table">
      <thead>
        <tr>
          <th>Check type</th>
          <th>What failed</th>
          <th>Where</th>
          <th>{mode === 'open' ? 'Suggested fix' : 'Fixed'}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((issue, i) => (
          <tr key={i}>
            <td>{CHECK_LABELS[issue.checkType as keyof DashboardData['validationSummary']] ?? issue.checkType}</td>
            <td>{issue.message}</td>
            <td className="issue-where">
              {issue.file}
              {issue.line ? `:${issue.line}` : ''}
            </td>
            <td>
              {mode === 'open' ? issue.fix ?? '—' : `Resolved ${(issue as ResolvedIssue).resolvedAt}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
            <IssueDetailTable rows={openIssues} mode="open" />
          </div>
          <div className="detail-block">
            <h3 className="detail-title">Caught &amp; fixed history ({component.history.length})</h3>
            <IssueDetailTable rows={component.history} mode="history" />
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
          <div className="metric-label">Components taken through the workflow</div>
        </div>

        <div className="metric-tile">
          <div className="metric-number">{data.totals.averageCycleTimeLabel ?? '—'}</div>
          <div className="metric-label">Avg. first commit → merged PR</div>
          <div className="metric-caption">{data.methodologyNotes.cycleTime}</div>
        </div>

        <div className="metric-tile metric-tile-note">
          <div className="metric-label metric-label-primary">First-time pass rate — not tracked</div>
          <div className="metric-caption">{data.methodologyNotes.firstTimePassRate}</div>
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
                  <td className={tally.fail > 0 ? 'text-state-error' : ''}>{tally.fail}</td>
                  <td className={tally.warn > 0 ? 'cell-warn' : ''}>{tally.warn}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="section-caption">
          Read straight from <code>src/design-docs/validation-report.generated.json</code> — the same file
          Storybook badges and PR comments read, generated {formatGeneratedAt(data.validationReportGeneratedAt)}.
          No surface here recomputes these numbers itself.
        </p>
      </section>

      <section className="dashboard-section" aria-label="Component status">
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
