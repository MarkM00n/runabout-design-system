import { Wordmark } from './Wordmark';
import { Overline, font } from './Doc';

const LINKS: Array<{ label: string; to: string; blurb: string; external?: boolean }> = [
  { label: 'Brand', to: '?path=/docs/foundations-brand--docs', blurb: 'The name, the mark, the rule, the photographs.' },
  { label: 'Colours', to: '?path=/docs/foundations-colours--docs', blurb: 'Four surfaces, twenty-six roles, the primitive ramps.' },
  { label: 'Components', to: '?path=/docs/components-button--docs', blurb: 'Buttons, inputs, cards, badges, tabs — live on every surface.' },
  { label: 'Figma file', to: 'https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System', blurb: 'The source of truth these tokens are generated from.', external: true },
];

/**
 * Storybook's landing page. Cream, the wordmark, one paragraph, four doors.
 *
 * Internal links have to escape the docs iframe: the page renders inside
 * iframe.html, so a bare "?path=" would resolve against that file and open
 * the raw preview. "./?path=" resolves to the manager index next to it,
 * and target="_top" makes the manager (not the iframe) navigate.
 */
export function IntroductionPage() {
  return (
    <div
      data-mode="cream"
      style={{
        fontFamily: font.sans,
        color: 'var(--color-text-primary)',
        background: 'var(--color-surface-section)',
        margin: '-4rem -4rem 0',
        padding: '96px 64px 120px',
        minHeight: '80vh',
      }}
    >
      <style>{`.sbdocs.sbdocs-wrapper { background: var(--color-surface-section); } .sbdocs.sbdocs-content { max-width: 1248px; }`}</style>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ color: 'var(--color-text-primary)' }}>
          <Wordmark height={64} />
        </div>
        <Overline style={{ marginTop: 56 }}>Design system</Overline>
        <h1 style={{ fontWeight: 400, fontSize: 40, lineHeight: 1.15, letterSpacing: '-0.01em', margin: '12px 0 16px', maxWidth: 760 }}>
          One system runs the bar, the print and the event.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--color-text-secondary)', maxWidth: '60ch', margin: 0 }}>
          Brand, print, website and events from one system, with no second kit. Every button, card and colour here is
          the real thing — generated from the Figma variables, checked on every change, and rendered on all four
          surfaces the brand uses.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 64 }}>
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.external ? l.to : `./${l.to}`}
              target={l.external ? '_blank' : '_top'}
              rel={l.external ? 'noreferrer' : undefined}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                padding: '20px 0 0',
                borderTop: '1px solid var(--color-border-strong)',
                minHeight: 120,
              }}
            >
              <div style={{ fontSize: 22, lineHeight: 1.25, marginBottom: 8 }}>
                {l.label} <span aria-hidden="true">→</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>{l.blurb}</div>
            </a>
          ))}
        </div>
        <div style={{ marginTop: 96, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Mark McManus · runabout is a fictional neighbourhood wine, cheese and listening bar built as a design-system case study.
        </div>
      </div>
    </div>
  );
}
