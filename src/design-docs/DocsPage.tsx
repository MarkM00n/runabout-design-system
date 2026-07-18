import type { ReactNode } from 'react';
import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
  useOf,
} from '@storybook/addon-docs/blocks';

import type { CheckResult, ComponentDocMeta, ComponentValidationReport } from './types';
import { statusLabel, statusTone, summaryLine } from './statusFormat';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items || items.length === 0) {
    return <p style={{ opacity: 0.6, fontStyle: 'italic' }}>{empty}</p>;
  }
  return (
    <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Pill({ label, tone }: { label: string; tone: 'neutral' | 'pass' | 'warn' | 'fail' }) {
  const colors = {
    neutral: { bg: '#eef0f3', fg: '#333' },
    pass: { bg: '#e3f1ea', fg: '#1a7a4c' },
    warn: { bg: '#fbf0da', fg: '#966a1a' },
    fail: { bg: '#fbe4e4', fg: '#c0392b' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontFamily: 'monospace',
        background: colors.bg,
        color: colors.fg,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {label}
    </span>
  );
}

const CHECK_LABELS: Record<string, string> = {
  tokenCompliance: 'Token Compliance',
  accessibility: 'Accessibility',
  storybookCoverage: 'Storybook Coverage',
  documentationCoverage: 'Documentation Coverage',
};

function IssueTable({ rows, mode }: { rows: Array<{ label: string; row: Record<string, unknown> }>; mode: 'open' | 'history' }) {
  if (rows.length === 0) return null;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e3e5e8' }}>Check</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e3e5e8' }}>What</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e3e5e8' }}>Where</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e3e5e8' }}>
            {mode === 'open' ? 'Suggested fix' : 'Fixed'}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, row }, i) => (
          <tr key={i}>
            <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{label}</td>
            <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{String(row.message)}</td>
            <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace' }}>
              {String(row.file)}
              {row.line ? `:${row.line}` : ''}
            </td>
            <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
              {mode === 'open' ? String(row.fix ?? '—') : `Resolved ${String(row.resolvedAt)}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// One card, not two: the status pills and what used to be a separate grey
// metadata box below now say each thing exactly once. Every text color here
// is set explicitly rather than left to inherit — the previous metadata box
// picked up Storybook's muted docs-page text color by default, which read
// as light grey and was flagged as hard to read.
function SummaryCard({
  validation,
  checkEntries,
  openFailCount,
  openWarnCount,
  fixedCount,
}: {
  validation: ComponentValidationReport;
  checkEntries: [string, CheckResult][];
  openFailCount: number;
  openWarnCount: number;
  fixedCount: number;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: '1px solid #e3e5e8',
        borderRadius: 8,
        background: '#fafafa',
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <Pill label={statusLabel(validation.status, openWarnCount)} tone={statusTone(validation.status)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        {checkEntries.map(([key, c]) => (
          <Pill key={key} label={`${CHECK_LABELS[key] ?? key}: ${statusLabel(c.status, c.warn)}`} tone={statusTone(c.status)} />
        ))}
      </div>
      {/* Real counts, read straight from the report (see
          docs/design-system-rules.md §5 on how history is derived), not
          asserted. Warnings are never called "issues" here. */}
      <p style={{ margin: '0 0 10px', fontSize: 14, color: '#1a1a1a' }}>
        {summaryLine(fixedCount, openFailCount, openWarnCount)}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: '#555' }}>
        {validation.component} · last validated {validation.lastValidated}
      </p>
    </div>
  );
}

function ValidationStatusSection({ validation }: { validation?: ComponentValidationReport }) {
  if (!validation) {
    return (
      <Section title="Validation Status">
        <p style={{ opacity: 0.6, fontStyle: 'italic' }}>
          No validation report found. Run <code>npm run design-sync</code> to generate one.
        </p>
      </Section>
    );
  }

  const checkEntries = Object.entries(validation.checks);
  const openFailCount = checkEntries.reduce((sum, [, c]) => sum + c.fail, 0);
  const openWarnCount = checkEntries.reduce((sum, [, c]) => sum + c.warn, 0);
  const openCount = openFailCount + openWarnCount;
  const fixedCount = validation.history.length;

  const openRows = checkEntries.flatMap(([key, c]) =>
    c.open.map((issue) => ({ label: CHECK_LABELS[key] ?? key, row: issue as unknown as Record<string, unknown> })),
  );
  const historyRows = validation.history.map((entry) => ({
    label: CHECK_LABELS[entry.checkType] ?? entry.checkType,
    row: entry as unknown as Record<string, unknown>,
  }));

  return (
    <Section title="Validation Status">
      <SummaryCard
        validation={validation}
        checkEntries={checkEntries}
        openFailCount={openFailCount}
        openWarnCount={openWarnCount}
        fixedCount={fixedCount}
      />

      {openCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Open warnings</h3>
          <IssueTable rows={openRows} mode="open" />
        </div>
      )}

      {fixedCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Caught & fixed history</h3>
          <IssueTable rows={historyRows} mode="history" />
        </div>
      )}
    </Section>
  );
}

/**
 * Custom Autodocs page, registered globally via
 * `.storybook/preview.tsx`'s `parameters.docs.page` — this is what makes
 * the documentation structure automatic for every `autodocs`-tagged
 * component rather than something authored per component. A component only
 * has to export `parameters.designSystem` (see types.ts) to get the full
 * layout; everything else (Props/Controls, live variant rendering) comes
 * from Storybook's own Autodocs blocks.
 */
export const DocsPage = () => {
  const resolved = useOf('meta');
  const parameters = resolved.type === 'meta' ? resolved.preparedMeta.parameters : {};
  const docs: ComponentDocMeta | undefined = parameters?.designSystem;
  const validation: ComponentValidationReport | undefined = parameters?.designSystemValidation;

  return (
    <>
      <Title />
      <Subtitle />

      <Section title="Description">
        {docs?.description ? <p>{docs.description}</p> : <Description />}
      </Section>

      <Primary />

      <Section title="Usage Guidelines">
        <BulletList items={docs?.usageGuidelines ?? []} empty="No usage guidelines documented yet." />
      </Section>

      <Section title="Do / Don't">
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <h3 style={{ fontSize: 14, color: '#1a7a4c', marginBottom: 8 }}>Do</h3>
            <BulletList items={docs?.dos ?? []} empty="No guidance documented yet." />
          </div>
          <div style={{ flex: '1 1 240px' }}>
            <h3 style={{ fontSize: 14, color: '#c0392b', marginBottom: 8 }}>Don't</h3>
            <BulletList items={docs?.donts ?? []} empty="No guidance documented yet." />
          </div>
        </div>
      </Section>

      <Section title="Variants">
        {docs?.variants?.length ? (
          <div>
            {docs.variants.map((v) => (
              <Pill key={v} label={v} tone="neutral" />
            ))}
          </div>
        ) : (
          <p style={{ opacity: 0.6, fontStyle: 'italic' }}>This component has no distinct variants.</p>
        )}
      </Section>

      <Section title="States">
        {docs?.states?.length ? (
          <div>
            {docs.states.map((s) => (
              <Pill key={s} label={s} tone="neutral" />
            ))}
          </div>
        ) : (
          <p style={{ opacity: 0.6, fontStyle: 'italic' }}>No states documented yet.</p>
        )}
      </Section>

      <Section title="Design Tokens Used">
        {validation?.tokensUsed?.length ? (
          <div>
            {validation.tokensUsed.map((t) => (
              <Pill key={t} label={t} tone="neutral" />
            ))}
          </div>
        ) : (
          <p style={{ opacity: 0.6, fontStyle: 'italic' }}>
            No token usage on record — run <code>npm run design-sync</code> to detect it.
          </p>
        )}
      </Section>

      <Section title="Accessibility Notes">
        <BulletList items={docs?.accessibilityNotes ?? []} empty="No accessibility notes documented yet." />
      </Section>

      <ValidationStatusSection validation={validation} />

      <Section title="Props / Controls">
        <Controls />
      </Section>

      <Section title="Code Example">
        {docs?.codeExample ? (
          <pre
            style={{
              background: '#1e1e1e',
              color: '#e6e6e6',
              padding: 16,
              borderRadius: 8,
              overflowX: 'auto',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <code>{docs.codeExample}</code>
          </pre>
        ) : (
          <p style={{ opacity: 0.6, fontStyle: 'italic' }}>No code example documented yet.</p>
        )}
      </Section>

      <Section title="All Variants">
        <Stories />
      </Section>
    </>
  );
};
