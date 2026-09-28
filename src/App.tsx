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

function CycleTimeChart() {
  const rows = data.components
    .filter((c) => c.cycleTimeSeconds != null)
    .sort((a, b) => (a.mergedAt ?? '').localeCompare(b.mergedAt ?? ''));
  const max = Math.max(...rows.map((c) => c.cycleTimeSeconds ?? 0));
  const medianSeconds = data.totals.medianCycleTimeLabel ? medianOf(rows.map((c) => c.cycleTimeSeconds ?? 0)) : null;
  return (
    <div className="cycle-chart" data-mode="cream">
      {rows.map((c) => {
        const pct = ((c.cycleTimeSeconds ?? 0) / max) * 100;
        return (
          <div className="cycle-row" key={c.name} title={`${c.name}: ${formatCycle(c.cycleTimeSeconds)}`}>
            <span className="cycle-name">{c.name}</span>
            <span className="cycle-track">
              {medianSeconds != null && (
                <span className="cycle-median" style={{ left: `${(medianSeconds / max) * 100}%` }} aria-hidden="true" />
              )}
              <span className="cycle-bar" data-mode="terracotta" style={{ width: `${Math.max(pct, 0.6)}%` }} />
              <span className="cycle-value">{formatCycle(c.cycleTimeSeconds)}</span>
            </span>
          </div>
        );
      })}
      {medianSeconds != null && (
        <div className="cycle-legend">
          <span className="cycle-median-key" aria-hidden="true" /> median {formatCycle(medianSeconds)} · mean{' '}
          {data.totals.averageCycleTimeLabel} · wall-clock, not effort
        </div>
      )}
    </div>
  );
}

function medianOf(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function App() {
  const checkTypes = Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    // data-mode="olive" — this page's canvas is Ink/900, which is exactly
    // what On Olive resolves surface-section to. Under the 2026-09-07 rule
    // "anything with a background owns a mode", the dashboard root is a
    // surface and declares one:
    // every nested text-*/border-*/action-* token needs the On Dark column,
    // not the ambient default. The two .table-card sections below override
    // this back to data-mode="cream" for their own light zebra-row content.
    <div className="dashboard" data-mode="olive">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Runabout DesignOps</h1>
          <p className="dashboard-subtitle">
            Live from the pipeline · updates on every merge · last run {formatGeneratedAt(data.generatedAt)}
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

      {/* data-mode="cream" is on each tile, never on the <section>. The
          section is only a grid container — it has no text and no fill of
          its own, so it stays on the page's ambient dark canvas, and the
          override reaches exactly the elements whose surface is actually
          light. This is the narrowest-element rule from the 2026-08-05
          .section-title incident, applied up front rather than after the
          fact.

          All five tiles fill with surface-card, which is Surface/50 in
          every mode — it does not vary. That makes the data-mode="cream"
          on each tile load-bearing rather than decorative: pairing a
          mode-invariant light fill with mode-resolved ink is exactly how
          the VinesAndVinyl Hero Input went to 1.18:1 (2026-08-08), the
          fill staying put while the text moved out from under it. The
          mode is what keeps text-primary resolving to dark ink here.
          It is the same pairing, and the same reasoning, as Modal. */}
      <section className="stat-header" aria-label="Headline metrics">
        {/* Median leads, mean is demoted to the caption. The sample is 8
            components and splits 4/4 — three shipped in 36 minutes plus Tab
            at 41, against four that sat open overnight — so neither figure
            describes a typical PR, and showing them as two equal-weight
            tiles implied a precision the data doesn't have. One hero with
            the mean alongside reads as "here is the number, and here is its
            spread", which is what the data actually supports. */}
        <div className="stat-hero" data-mode="cream">
          <div className="stat-hero-value">{data.totals.medianCycleTimeLabel ?? '—'}</div>
          <div className="stat-hero-label">
            <span className="stat-accent" data-mode="terracotta" aria-hidden="true" />
            Median cycle time, first commit → merged
          </div>
          <div className="stat-hero-caption">
            mean {data.totals.averageCycleTimeLabel ?? '—'} · {data.totals.cycleTimeSampleSize} components ·{' '}
            {data.totals.totalDesignTokens ?? '—'} tokens documented
          </div>
        </div>

        <div className="stat-tile" data-mode="cream">
          <div className="stat-value">{data.totals.totalComponents}</div>
          <div className="stat-label">Components, all through the pipeline</div>
        </div>

        <div className="stat-tile" data-mode="cream">
          <div className="stat-value stat-value-good">
            <span className="stat-tick" aria-hidden="true">
              ✓
            </span>
            {data.components.filter((c) => c.overall).length}
            <span className="stat-value-of">of {data.totals.totalComponents}</span>
          </div>
          <div className="stat-label">Passing every check</div>
        </div>

        <div className="stat-tile" data-mode="cream">
          <div className="stat-value">{data.totals.totalCaughtAndFixed}</div>
          <div className="stat-label">Caught &amp; fixed by the checks</div>
        </div>

        {/* Zero open issues is a result, not a measurement — it reads as a
            status line rather than a stat. The tick carries state-success
            (6.28:1 on surface-card) and is aria-hidden, so the meaning
            still comes from the number and its label for a screen reader
            rather than from colour or a glyph alone. */}
        <div className="stat-tile" data-mode="cream">
          <div className={`stat-value ${data.totals.totalOpenIssues === 0 ? 'stat-value-good' : 'stat-value-warn'}`}>
            {data.totals.totalOpenIssues}
          </div>
          <div className="stat-label">Open issues</div>
        </div>
      </section>

      {/* data-mode="cream" lives on .table-scroll specifically, not the
          whole <section> — it overrides the page's ambient dark mode back
          to light for the table's own zebra-row content, which needs it
          (text-primary would otherwise inherit the dark-mode value and
          become nearly invisible against the light rows). .section-title
          sits visually on the dark canvas above the table box, not inside
          it — scoping data-mode="cream" to the whole section previously
          pulled the heading into that override too, rendering dark text
          on the dark canvas (near-invisible, filed 2026-08-05). */}
      {/* One meter per check, read from each component's own result. A table
          of zeros said "nothing happened"; four full meters say "everything
          passes", which is the actual state. The fill is a state token — it
          is a status, not a series — and the number beside it carries the
          meaning, so nothing here depends on colour alone. */}
      <section className="dashboard-section" aria-label="Checks passing">
        <h2 className="section-title">Checks, on every pull request</h2>
        <div className="meter-grid">
          {checkTypes.map((key) => {
            const passing = passingCount(key);
            const total = data.totals.totalComponents;
            const tally = data.validationSummary[key];
            const tone = tally.fail > 0 ? 'fail' : tally.warn > 0 ? 'warn' : 'pass';
            return (
              <div className="meter" data-mode="cream" key={key}>
                <div className="meter-head">
                  <span className="meter-label">{CHECK_SHORT_LABELS[key]}</span>
                  <span className={`meter-count meter-count-${tone}`}>
                    {passing} <span className="meter-of">of {total}</span>
                  </span>
                </div>
                <div className="meter-track" role="img" aria-label={`${CHECK_LABELS[key]}: ${passing} of ${total} components passing`}>
                  <div className={`meter-fill meter-fill-${tone}`} style={{ width: `${(passing / total) * 100}%` }} />
                </div>
                <div className="meter-foot">
                  {tally.fail > 0 ? `${tally.fail} failing` : tally.warn > 0 ? `${tally.warn} warning` : 'All passing'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cycle time per component, oldest merge at the top. One series, so
          one hue and no legend; every bar is labelled because thirteen values
          are the point, not a trend. Linear scale on purpose: the first PRs
          sat open overnight and everything since ships inside an hour, and a
          log scale would hide exactly that. */}
      <section className="dashboard-section" aria-label="Cycle time per component">
        <h2 className="section-title">Cycle time per component, first commit → merged</h2>
        <CycleTimeChart />
      </section>

      <section className="dashboard-section table-card" aria-label="Component status">
        <h2 className="section-title">Component status</h2>
        <div className="table-scroll" data-mode="cream">
          <table className="dashboard-table">
            {/* data-mode="dark" on the header row only: it is a fixed dark
                band inside an otherwise cream table, so it is its own
                surface and owns its own mode. Scoped to the <thead>, not
                the table — the narrowest element that actually needs it. */}
            <thead data-mode="dark">
              <tr>
                <th>Component</th>
                <th>Overall</th>
                <th>Caught &amp; fixed</th>
                <th>Open</th>
                <th>Cycle time</th>
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
                      <td className="cell-cycle">{formatCycle(c.cycleTimeSeconds)}</td>
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
