import { useState } from 'react';
import type { ReactNode } from 'react';

export type TokenCategory = 'color' | 'typography' | 'spacing' | 'radius' | 'motion' | 'shadow' | 'breakpoint';

export interface FoundationTokenRow {
  type: string;
  tier?: 'primitive' | 'semantic';
  name: string;
  tokenPath: string;
  value: string;
  usage: string;
  documented?: boolean;
  consumedBy?: string[];
  literalConsumers?: string[];
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: number;
  fontWeight?: number;
  letterSpacing?: string;
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

function BreakpointPreview({ value }: { value: string }) {
  const px = Number.parseInt(value, 10) || 0;
  // Scaled down (viewport px / 8) so a 1024px breakpoint renders as a
  // reasonably sized bar rather than overflowing the table cell.
  const barWidth = Math.min(Math.round(px / 8), 200);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: barWidth, height: 14, background: '#1f7a8c', borderRadius: 2 }} />
      <span style={{ fontSize: 11, color: '#7b8290' }}>{'↔'}</span>
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
        <span
          style={{
            fontFamily: token.fontFamily,
            fontSize: token.fontSize,
            lineHeight: token.lineHeight,
            fontWeight: token.fontWeight,
            letterSpacing: token.letterSpacing,
          }}
        >
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
    case 'breakpoint':
      return <BreakpointPreview value={token.value} />;
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

function DetailedTokenTable({ category, tokens }: { category: TokenCategory; tokens: FoundationTokenRow[] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Preview</th>
            <th style={thStyle}>Token Name</th>
            <th style={thStyle}>Token Value</th>
            <th style={thStyle}>Token Type</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Used By</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.name}>
              <td style={tdStyle}>
                <Preview category={category} token={token} />
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: 'monospace' }}>{token.tokenPath}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#a0a5ac' }}>{token.name}</div>
              </td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{token.value}</td>
              <td style={tdStyle}>{token.type}</td>
              <td style={{ ...tdStyle, maxWidth: 340 }}>
                {token.usage}
                {token.documented === false && (
                  <span style={{ color: '#a0a5ac', fontStyle: 'italic' }}> (general — not token-specific yet)</span>
                )}
              </td>
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

// 71 individual table rows would be unusable — primitives render as compact
// swatch strips grouped by palette family instead, each swatch carrying its
// step/hex/tokenPath/usage in a native title tooltip rather than a table row.
function PrimitivePaletteGrid({ tokens }: { tokens: FoundationTokenRow[] }) {
  const families = new Map<string, FoundationTokenRow[]>();
  for (const token of tokens) {
    const family = token.tokenPath.split('.')[1] ?? 'unknown';
    if (!families.has(family)) families.set(family, []);
    families.get(family)!.push(token);
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[...families.entries()].map(([family, swatches]) => (
        <div key={family}>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#7b8290', marginBottom: 6, textTransform: 'capitalize' }}>
            {family}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {swatches.map((token) => {
              const step = token.tokenPath.split('.')[2];
              return (
                <div
                  key={token.name}
                  title={`${token.tokenPath} — ${token.value}\n${token.usage}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56 }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      border: '1px solid #e3e5e8',
                      background: token.value,
                    }}
                  />
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#a0a5ac', marginTop: 4 }}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p style={{ fontSize: 12, color: '#a0a5ac', fontStyle: 'italic', marginTop: 4 }}>
        Hover a swatch for its token path, hex value, and ramp position. Most primitives are not directly consumed by
        a component — several semantic tokens above alias into these ramps instead (see each one's Description).
      </p>
    </div>
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

  if (category === 'color') {
    const semanticTokens = tokens.filter((t) => t.tier !== 'primitive');
    const primitiveTokens = tokens.filter((t) => t.tier === 'primitive');
    return (
      <>
        {semanticTokens.length > 0 && <DetailedTokenTable category={category} tokens={semanticTokens} />}
        {primitiveTokens.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Primitives</h3>
            <p style={{ fontSize: 13, color: '#7b8290', marginBottom: 0 }}>
              The raw palette ramps underneath the semantic tokens above (Figma's "Primitives" variable collection).
            </p>
            <PrimitivePaletteGrid tokens={primitiveTokens} />
          </div>
        )}
      </>
    );
  }

  return <DetailedTokenTable category={category} tokens={tokens} />;
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
