import dashboardData from './design-docs/dashboard-data.generated.json';
import './App.css';

interface ComponentWarnings {
  tokenCompliance: number;
  accessibility: number;
  storybookCoverage: number;
  documentationCoverage: number;
}

interface ComponentRow {
  name: string;
  tokenCompliance: boolean;
  accessibility: boolean;
  storybookCoverage: boolean;
  documentationCoverage: boolean;
  warnings: ComponentWarnings;
  overall: boolean;
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
  methodologyNotes: {
    cycleTime: string;
    firstTimePassRate: string;
    errorsByCheckType: string;
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

function App() {
  const checkTypes = Object.keys(data.validationSummary) as (keyof DashboardData['validationSummary'])[];

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
        <p className="section-caption">{data.methodologyNotes.errorsByCheckType}</p>
      </section>

      <section className="dashboard-section" aria-label="Component status">
        <h2 className="section-title">Component status</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Token</th>
                <th>A11y</th>
                <th>Docs</th>
                <th>Storybook</th>
                <th>Links</th>
                <th>Last validated</th>
              </tr>
            </thead>
            <tbody>
              {data.components.map((c) => (
                <tr key={c.name}>
                  <td className="cell-component">{c.name}</td>
                  <td>
                    <StatusMark pass={c.tokenCompliance} />
                    {c.warnings.tokenCompliance > 0 && (
                      <span className="cell-warn-badge"> ⚠ {c.warnings.tokenCompliance}</span>
                    )}
                  </td>
                  <td>
                    <StatusMark pass={c.accessibility} />
                  </td>
                  <td>
                    <StatusMark pass={c.documentationCoverage} />
                  </td>
                  <td>
                    <StatusMark pass={c.storybookCoverage} />
                  </td>
                  <td className="cell-links">
                    <a href={c.storybookUrl} target="_blank" rel="noreferrer">
                      Story
                    </a>
                    {c.pr && (
                      <>
                        {' · '}
                        <a href={c.pr.url} target="_blank" rel="noreferrer">
                          PR #{c.pr.number}
                        </a>
                      </>
                    )}
                  </td>
                  <td>{c.lastValidated ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
