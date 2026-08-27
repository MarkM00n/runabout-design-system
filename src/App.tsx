import { Fragment, useState } from 'react';
import dashboardData from './design-docs/dashboard-data.generated.json';
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
// text-inverse (used here pre-2026-08-05) is retired — no successor, the
// mode resolves what it used to hand-pick. text-primary is the mode-aware
// replacement; it resolves correctly here because the dashboard's root
// element now carries data-mode="dark" (see the JSX below), same pattern
// as Card/Button-secondary in the component sync.
const SECONDARY_LINK_CLASS =
  'inline-flex items-center justify-center gap-01 font-manrope font-normal select-none ' +
  'transition-colors duration-150 ease-out h-[32px] px-02 rounded-xl text-label ' +
  'bg-transparent text-text-primary border border-border-default ' +
  'hover:bg-action-secondary-hover hover:border-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-transparent focus-visible:border-border-focus focus-visible:ring-border-focus';

const CHECK_LABELS: Record<keyof DashboardData['validationSummary'], string> = {
  tokenCompliance: 'Token Compliance',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook Coverage',
  documentationCoverage: 'Documentation Coverage',
};

// Three states, not two: a component that passes every check but still has
// open warnings isn't a clean pass, so it gets its own amber state rather
// than being shown identical to a component with nothing open at all.
function StatusBadge({ status, warnCount }: { status: ValidationStatus; warnCount: number }) {
  const icon = status === 'fail' ? '✗' : status === 'pass-with-warnings' ? '⚠' : '✓';
  return (
    <span className={`status-badge status-${statusTone(status)}`}>
      {icon} {statusLabel(status, warnCount)}
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
  // Icon only, per request — but the label doesn't disappear, it moves to
  // aria-label, so the distinction (not just the icon shape) still reaches
  // screen readers rather than being dropped outright.
  return (
    <span className={`severity-badge severity-${level}`} aria-label={level === 'fail' ? 'Fail' : 'Warn'}>
      {level === 'fail' ? '✗' : '⚠'}
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
    // data-mode="dark" — this page's canvas (surface-secondary) is a
    // permanent dark surface, same reasoning as Card's data-mode="feature":
    // every nested text-*/border-*/action-* token needs the On Dark column,
    // not the ambient default. The two .table-card sections below override
    // this back to data-mode="light" for their own light zebra-row content.
    <div className="dashboard" data-mode="dark">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Runabout DesignOps — Pilot Dashboard</h1>
          <p className="dashboard-subtitle">
            Live snapshot, generated {formatGeneratedAt(data.generatedAt)}
          </p>
        </div>
        <nav className="dashboard-links">
          <a href={data.links.githubRepoUrl} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>
            GitHub
          </a>
          <a href={data.links.storybookBaseUrl} target="_blank" rel="noreferrer" className={SECONDARY_LINK_CLASS}>
            Storybook
          </a>
        </nav>
      </header>

      {/* data-mode="light" is on each tile, never on the <section>. The
          section is only a grid container — it has no text and no fill of
          its own, so it stays on the page's ambient dark canvas, and the
          override reaches exactly the elements whose surface is actually
          light. This is the narrowest-element rule from the 2026-08-05
          .section-title incident, applied up front rather than after the
          fact.

          All five tiles share one fill, surface-subtle — NOT
          surface-tertiary. Both are cream under On Light, but only
          surface-subtle is redefined by [data-mode='dark'];
          surface-tertiary is a fixed #fefbf8 in every mode. Pairing a
          mode-invariant light fill with mode-resolved text is exactly how
          the VinesAndVinyl Hero Input went to 1.18:1 (2026-08-08): the
          fill stayed put while the ink moved. With surface-subtle, losing
          this data-mode="light" would degrade to a dark card with cream
          text — quiet and legible — instead of dark-on-cream or
          cream-on-cream. */}
      <section className="stat-header" aria-label="Headline metrics">
        {/* Median leads, mean is demoted to the caption. The sample is 8
            components and splits 4/4 — three shipped in 36 minutes plus Tab
            at 41, against four that sat open overnight — so neither figure
            describes a typical PR, and showing them as two equal-weight
            tiles implied a precision the data doesn't have. One hero with
            the mean alongside reads as "here is the number, and here is its
            spread", which is what the data actually supports. */}
        <div className="stat-hero" data-mode="light">
          <div className="stat-hero-value">{data.totals.medianCycleTimeLabel ?? '—'}</div>
          <div className="stat-hero-label">
            <span className="stat-accent" aria-hidden="true" />
            Median cycle time, first commit → merged
          </div>
          <div className="stat-hero-caption">
            mean {data.totals.averageCycleTimeLabel ?? '—'} · across {data.totals.cycleTimeSampleSize} components
          </div>
        </div>

        <div className="stat-tile" data-mode="light">
          <div className="stat-value">{data.totals.totalCaughtAndFixed}</div>
          <div className="stat-label">Caught &amp; fixed</div>
        </div>

        {/* Zero open issues is a result, not a measurement — it reads as a
            status line rather than a stat. The tick carries state-success
            (6.28:1 on surface-subtle) and is aria-hidden, so the meaning
            still comes from the number and its label for a screen reader
            rather than from colour or a glyph alone. */}
        <div className="stat-tile" data-mode="light">
          <div className="stat-value stat-value-good">
            <span className="stat-tick" aria-hidden="true">
              ✓
            </span>
            {data.totals.totalOpenIssues}
          </div>
          <div className="stat-label">Open issues</div>
        </div>

        <div className="stat-tile" data-mode="light">
          <div className="stat-value">{data.totals.totalComponents}</div>
          <div className="stat-label">Components</div>
        </div>

        <div className="stat-tile" data-mode="light">
          <div className="stat-value">{data.totals.totalDesignTokens ?? '—'}</div>
          <div className="stat-label">Tokens documented</div>
        </div>
      </section>

      {/* data-mode="light" lives on .table-scroll specifically, not the
          whole <section> — it overrides the page's ambient dark mode back
          to light for the table's own zebra-row content, which needs it
          (text-primary would otherwise inherit the dark-mode value and
          become nearly invisible against the light rows). .section-title
          sits visually on the dark canvas above the table box, not inside
          it — scoping data-mode="light" to the whole section previously
          pulled the heading into that override too, rendering dark text
          on the dark canvas (near-invisible, filed 2026-08-05). */}
      <section className="dashboard-section table-card" aria-label="Errors caught by validation">
        <h2 className="section-title">Errors caught by validation</h2>
        <div className="table-scroll" data-mode="light">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Check type</th>
                <th>Fail</th>
                <th>Warn</th>
              </tr>
            </thead>
            <tbody>
              {checkTypes.map((key, i) => {
                const tally = data.validationSummary[key];
                return (
                  <tr key={key} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td>{CHECK_LABELS[key]}</td>
                    <td className={tally.fail > 0 ? 'cell-fail' : ''}>{tally.fail}</td>
                    <td className={tally.warn > 0 ? 'cell-warn' : ''}>{tally.warn}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section table-card" aria-label="Component status">
        <h2 className="section-title">Component status</h2>
        <div className="table-scroll" data-mode="light">
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
              {data.components.map((c, i) => {
                const isExpanded = expanded === c.name;
                return (
                  <Fragment key={c.name}>
                    <tr
                      className={`component-row ${i % 2 === 0 ? 'row-even' : 'row-odd'}`}
                      onClick={() => setExpanded(isExpanded ? null : c.name)}
                      aria-expanded={isExpanded}
                    >
                      <td className="cell-component">{c.name}</td>
                      <td>
                        <StatusBadge status={c.status} warnCount={c.openWarnCount} />
                      </td>
                      <td>{c.fixedCount}</td>
                      <td className={c.openFailCount > 0 ? 'cell-fail' : c.openWarnCount > 0 ? 'cell-warn' : ''}>
                        {c.openCount}
                      </td>
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
