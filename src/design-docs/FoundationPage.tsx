import { useState } from 'react';
import type { ReactNode } from 'react';

export type TokenCategory = 'color' | 'typography' | 'spacing' | 'radius' | 'motion' | 'shadow';

export interface FoundationTokenRow {
  name: string;
  value: string;
  usage: string;
  consumedBy?: string[];
  literalConsumers?: string[];
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: number;
  duration?: string;
  easing?: string;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: '#7b8290',
  borderBottom: '1px solid #e3e5e8',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 14,
  borderBottom: '1px solid #eef0f3',
  verticalAlign: 'middle',
};

function MotionPreview({ duration, easing }: { duration?: string; easing?: string }) {
  const [on, setOn] = useState(false);
  return (
    <div
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
      title="Hover to preview"
      style={{
        width: 96,
        height: 24,
        borderRadius: 999,
        background: '#eef0f3',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 74 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#1f7a8c',
          transition: `left ${duration ?? '150ms'} ${easing ?? 'ease-out'}`,
        }}
      />
    </div>
  );
}

function Preview({ category, token }: { category: TokenCategory; token: FoundationTokenRow }) {
  switch (category) {
    case 'color':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: '1px solid #e3e5e8',
            background: token.value,
          }}
        />
      );
    case 'typography':
      return (
        <span style={{ fontFamily: token.fontFamily, fontSize: token.fontSize, lineHeight: token.lineHeight }}>
          Ag
        </span>
      );
    case 'spacing': {
      const px = Number.parseInt(token.value, 10) || 0;
      return <div style={{ height: 12, width: px, background: '#1f7a8c', borderRadius: 2 }} />;
    }
    case 'radius': {
      const px = Number.parseInt(token.value, 10) || 0;
      return <div style={{ width: 40, height: 40, background: '#1f7a8c', borderRadius: px }} />;
    }
    case 'motion':
      return <MotionPreview duration={token.duration} easing={token.easing} />;
    default:
      return null;
  }
}

function ConsumedByCell({ token }: { token: FoundationTokenRow }) {
  const named = token.consumedBy ?? [];
  const literal = token.literalConsumers ?? [];
  if (named.length === 0 && literal.length === 0) {
    return <span style={{ color: '#c0392b', fontStyle: 'italic' }}>Not referenced (orphaned)</span>;
  }
  return (
    <span>
      {named.length > 0 && <span>{named.join(', ')}</span>}
      {literal.length > 0 && (
        <span style={{ color: '#7b8290' }}>
          {named.length > 0 ? '; ' : ''}
          {literal.join(', ')}{' '}
          <span style={{ fontStyle: 'italic' }}>(via literal Tailwind value, not yet migrated to this token)</span>
        </span>
      )}
    </span>
  );
}

export function FoundationSection({
  category,
  tokens,
  emptyStateNote,
}: {
  category: TokenCategory;
  tokens: FoundationTokenRow[];
  emptyStateNote?: string;
}) {
  if (tokens.length === 0) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: 20,
          border: '1px dashed #d0d3d8',
          borderRadius: 8,
          color: '#7b8290',
          fontStyle: 'italic',
        }}
      >
        {emptyStateNote ?? 'No tokens defined in this category yet.'}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Preview</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Value</th>
            <th style={thStyle}>Usage</th>
            <th style={thStyle}>Used By</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.name}>
              <td style={tdStyle}>
                <Preview category={category} token={token} />
              </td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{token.name}</td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{token.value}</td>
              <td style={{ ...tdStyle, maxWidth: 360 }}>{token.usage}</td>
              <td style={{ ...tdStyle, maxWidth: 280 }}>
                <ConsumedByCell token={token} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FoundationPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{title}</h1>
      <p style={{ fontSize: 16, color: '#4b5160', maxWidth: '70ch', marginBottom: 24 }}>{description}</p>
      {children}
      <p style={{ marginTop: 32, fontSize: 12, color: '#a0a5ac' }}>
        Generated from src/styles/tokens.css and src/tokens/tokens.json by <code>npm run design-sync</code> — not
        hand-maintained. "Used By" is computed by scanning every component in src/components/ for real usage.
      </p>
    </div>
  );
}
