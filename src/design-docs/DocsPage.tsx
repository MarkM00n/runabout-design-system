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

import type { ComponentDocMeta, ComponentValidationReport } from './types';

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

function Pill({ label, tone }: { label: string; tone: 'neutral' | 'pass' | 'fail' }) {
  const colors = {
    neutral: { bg: '#eef0f3', fg: '#333' },
    pass: { bg: '#e3f1ea', fg: '#1a7a4c' },
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

  const checks: Array<[string, boolean]> = [
    ['Token Compliance', validation.tokenCompliance],
    ['Accessibility', validation.accessibility],
    ['Storybook Coverage', validation.storybookCoverage],
    ['Documentation Coverage', validation.documentationCoverage],
  ];

  return (
    <Section title="Validation Status">
      <div style={{ marginBottom: 12 }}>
        <Pill label={validation.overall ? '✓ PASS' : '✗ FAIL'} tone={validation.overall ? 'pass' : 'fail'} />
      </div>
      <div>
        {checks.map(([label, pass]) => (
          <Pill key={label} label={`${pass ? '✓' : '✗'} ${label}`} tone={pass ? 'pass' : 'fail'} />
        ))}
      </div>

      {/* DesignOps metadata block, per the pipeline spec. */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          border: '1px solid #e3e5e8',
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 1.8,
          background: '#fafafa',
        }}
      >
        <div>Generated From: {validation.component}</div>
        <div>
          Validation Status: {validation.overall ? '✓ PASS' : '✗ FAIL'}
        </div>
        <div>Checks:</div>
        <div style={{ paddingLeft: 16 }}>
          {checks.map(([label, pass]) => (
            <div key={label}>
              {pass ? '✓' : '✗'} {label}
            </div>
          ))}
        </div>
        <div>Last Validated: {validation.lastValidated}</div>
      </div>
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
