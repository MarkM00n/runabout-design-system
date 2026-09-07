/**
 * Brand-styled building blocks for the Foundations and Brand docs pages.
 *
 * Everything here is styled from tokens.css custom properties, never from
 * Storybook's theme, so a page reads as the product rather than as a docs
 * tool. The layout mirrors the portfolio deck: a header bar with the
 * wordmark, overline → headline → one paragraph, then the thing itself,
 * then a compact reference table, then engineering notes folded away.
 *
 * The page sets data-mode="cream" on its own root so every var() inside
 * resolves against the cream surface regardless of the toolbar — docs pages
 * are not stories and shouldn't restyle when the mode switcher moves.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { Wordmark } from './Wordmark';

export const font = {
  sans: 'var(--font-manrope)',
  mono: 'ui-monospace, Menlo, monospace',
};

const T = {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  link: 'var(--color-text-link)',
  rule: 'var(--color-border-subtle)',
  ruleStrong: 'var(--color-border-strong)',
  surface: 'var(--color-surface-section)',
  card: 'var(--color-surface-card)',
};

export const PAGE_MAX = 1120;

/** Section eyebrow, Manrope/Overline: 11px, 8% tracking, uppercase. */
export function Overline({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: font.sans,
        fontSize: 11,
        lineHeight: 1.45,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: T.secondary,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function HeaderBar({ crumb, title }: { crumb: string; title: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '28px 0 24px',
        borderBottom: `1px solid ${T.rule}`,
        marginBottom: 56,
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ color: T.secondary }}>{crumb}</div>
        <div style={{ color: T.primary }}>{title}</div>
      </div>
      <div style={{ color: T.primary, display: 'flex', alignItems: 'center' }}>
        <Wordmark height={22} />
      </div>
      <div style={{ fontFamily: font.sans, fontSize: 13, lineHeight: 1.45, textAlign: 'right' }}>
        <div style={{ color: T.secondary }}>Runabout</div>
        <div style={{ color: T.primary }}>Design System</div>
      </div>
    </div>
  );
}

export function DocPage({
  crumb = 'Runabout / Foundations',
  title,
  overline,
  headline,
  lead,
  children,
  notes,
}: {
  crumb?: string;
  title: string;
  overline: string;
  headline: string;
  lead?: ReactNode;
  children: ReactNode;
  notes?: ReactNode;
}) {
  return (
    <div
      data-mode="cream"
      className="runabout-doc"
      style={{
        fontFamily: font.sans,
        color: T.primary,
        background: T.surface,
        margin: '-4rem -4rem 0',
        padding: '0 64px 80px',
      }}
    >
      {/* Storybook caps docs content at 1000px and paints it with the theme
          colour; the page widens it to the deck's 1120 grid and lets the
          cream run edge to edge behind the header bar. */}
      <style>{`
        .sbdocs.sbdocs-content { max-width: ${PAGE_MAX + 128}px; }
        .sbdocs.sbdocs-wrapper { background: var(--color-surface-section); }
        .runabout-doc * { box-sizing: border-box; }
        .runabout-doc p { margin: 0; }
        .runabout-doc details > summary { list-style: none; cursor: pointer; }
        .runabout-doc details > summary::-webkit-details-marker { display: none; }
        .runabout-doc details[open] > summary .chev { transform: rotate(90deg); }
        /* Storybook's docs stylesheet zebra-stripes tables and boxes <code>;
           neither belongs on a brand page. */
        .runabout-doc table, .runabout-doc table tr, .runabout-doc table td, .runabout-doc table th { background: transparent !important; border-left: 0 !important; border-right: 0 !important; }
        .runabout-doc table tr:nth-of-type(even) { background: transparent !important; }
        .runabout-doc code { background: transparent !important; border: 0 !important; padding: 0 !important; color: inherit; }
        .runabout-doc h1 { border: 0; padding: 0; }
      `}</style>
      <div style={{ maxWidth: PAGE_MAX, margin: '0 auto' }}>
        <HeaderBar crumb={crumb} title={title} />
        <div style={{ maxWidth: 720 }}>
          <Overline>{overline}</Overline>
          <h1
            style={{
              fontFamily: font.sans,
              fontWeight: 400,
              fontSize: 40,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: T.primary,
              margin: '12px 0 16px',
            }}
          >
            {headline}
          </h1>
          {lead && (
            <p
              style={{
                fontFamily: font.sans,
                fontSize: 18,
                lineHeight: 1.65,
                color: T.secondary,
                maxWidth: '64ch',
              }}
            >
              {lead}
            </p>
          )}
        </div>
        {children}
        {notes && (
          <Section label="Implementation notes" collapsible>
            {notes}
          </Section>
        )}
      </div>
    </div>
  );
}

/** A ruled section with an overline label. `collapsible` folds it into <details>. */
export function Section({
  label,
  aside,
  children,
  collapsible = false,
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const head = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingTop: 20,
        borderTop: `1px solid ${T.rule}`,
      }}
    >
      <Overline>
        {collapsible && (
          <span className="chev" style={{ display: 'inline-block', marginRight: 8, transition: 'transform 150ms ease-out' }}>
            ▸
          </span>
        )}
        {label}
      </Overline>
      {aside && <span style={{ fontSize: 13, color: T.secondary }}>{aside}</span>}
    </div>
  );
  if (collapsible) {
    return (
      <details style={{ marginTop: 56 }}>
        <summary>{head}</summary>
        <div style={{ marginTop: 20 }}>{children}</div>
      </details>
    );
  }
  return (
    <section style={{ marginTop: 56 }}>
      {head}
      <div style={{ marginTop: 24 }}>{children}</div>
    </section>
  );
}

/** Body copy inside a section — Paragraph Small on secondary. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.65, color: T.secondary, maxWidth: '64ch', marginBottom: 12 }}>
      {children}
    </p>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code style={{ fontFamily: font.mono, fontSize: 12.5, color: T.primary }}>{children}</code>;
}

/** Compact reference table: 40px rows, one line per cell, hairline rules. */
export function RefTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string; width?: number | string; align?: 'left' | 'right' }>;
  rows: Array<Record<string, ReactNode>>;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: font.sans }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? 'left',
                  width: c.width,
                  padding: '0 12px 10px 0',
                  borderBottom: `1px solid ${T.rule}`,
                }}
              >
                <Overline>{c.label}</Overline>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    height: 40,
                    padding: '0 12px 0 0',
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: T.primary,
                    borderBottom: `1px solid ${T.rule}`,
                    whiteSpace: 'nowrap',
                    textAlign: c.align ?? 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Used by" as quiet chips; empty is a dash, never a warning. */
export function UsedBy({ names }: { names?: string[] }) {
  if (!names || names.length === 0) return <span style={{ color: T.secondary }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {names.map((n) => (
        <span
          key={n}
          style={{
            fontSize: 11,
            lineHeight: 1,
            padding: '5px 8px',
            border: `1px solid ${T.ruleStrong}`,
            borderRadius: 999,
            color: T.primary,
          }}
        >
          {n}
        </span>
      ))}
    </span>
  );
}

/** A colour chip that resolves a semantic token *inside* a given surface mode. */
export function ModeSwatch({
  cssVar,
  mode,
  size = 24,
}: {
  cssVar: string;
  mode: 'cream' | 'olive' | 'dark' | 'terracotta';
  size?: number;
}) {
  return (
    <span data-mode={mode} style={{ display: 'inline-block', lineHeight: 0 }}>
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: 6,
          background: `var(${cssVar})`,
          boxShadow: `inset 0 0 0 1px var(--color-border-subtle)`,
        }}
      />
    </span>
  );
}

/** A plain hex chip for primitives. */
export function HexSwatch({ hex, size = 30, radius = 4 }: { hex: string; size?: number; radius?: number }) {
  return (
    <span
      title={hex}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: radius,
        background: hex,
        boxShadow: `inset 0 0 0 1px var(--color-border-subtle)`,
      }}
    />
  );
}

/** Two-column Do / Don't lists in the deck's style. */
export function DoDont({ dos, donts }: { dos: string[]; donts: string[] }) {
  const List = ({ label, items }: { label: string; items: string[] }) => (
    <div>
      <Overline>{label}</Overline>
      <div style={{ marginTop: 8 }}>
        {items.map((it) => (
          <div key={it} style={{ padding: '10px 0', borderBottom: `1px solid ${T.rule}`, fontSize: 15, lineHeight: 1.45 }}>
            {it}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, maxWidth: 720 }}>
      <List label="Do" items={dos} />
      <List label="Don’t" items={donts} />
    </div>
  );
}

/** Hover-to-animate preview used on the Motion page. */
export function MotionDemo() {
  const [on, setOn] = useState(false);
  return (
    <div
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        cursor: 'pointer',
      }}
    >
      {(['cream', 'olive', 'dark', 'terracotta'] as const).map((mode) => (
        <div
          key={mode}
          data-mode={mode}
          style={{
            background: 'var(--color-surface-section)',
            borderRadius: 12,
            padding: 24,
            boxShadow: 'inset 0 0 0 1px var(--color-border-subtle)',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            On {mode}
          </div>
          <div
            style={{
              height: 40,
              borderRadius: 999,
              background: on ? 'var(--color-action-primary-hover)' : 'var(--color-action-primary)',
              transition: 'background var(--duration-standard) var(--ease-standard)',
            }}
          />
          <div
            style={{
              marginTop: 12,
              height: 40,
              borderRadius: 999,
              border: `1px solid ${on ? 'var(--color-border-strong)' : 'var(--color-border-default)'}`,
              background: on ? 'var(--color-action-secondary-hover)' : 'var(--color-action-secondary)',
              transition: 'background var(--duration-standard) var(--ease-standard), border-color var(--duration-standard) var(--ease-standard)',
            }}
          />
        </div>
      ))}
    </div>
  );
}
