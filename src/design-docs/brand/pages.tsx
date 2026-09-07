/**
 * Page bodies for the Foundations docs. Each one reads tokens.json (the
 * source of truth design-sync keeps in step with Figma) plus the generated
 * "used by" data, and renders the deck's layout for that foundation:
 * the thing itself first, a compact reference table second, engineering
 * notes folded away last.
 */
import type { ReactNode } from 'react';

import tokens from '../../tokens/tokens.json';
import foundations from '../foundations-data.generated.json';
import { Wordmark as WordmarkAt } from './Wordmark';
import { DoDont, DocPage, HexSwatch, ModeSwatch, Mono, MotionDemo, Note, Overline, RefTable, Section, UsedBy, font } from './Doc';

type Mode = 'cream' | 'olive' | 'dark' | 'terracotta';
const MODES: Mode[] = ['cream', 'olive', 'dark', 'terracotta'];
const MODE_LABEL: Record<Mode, string> = { cream: 'Cream', olive: 'Olive', dark: 'Dark', terracotta: 'Terracotta' };

type SemanticToken = {
  value: string;
  modes?: Partial<Record<Exclude<Mode, 'cream'>, string>>;
  alias?: Partial<Record<Mode, string>>;
  note?: string;
};
type PrimitiveStep = { value: string; northline?: string; note?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const color = (tokens as any).color as Record<string, Record<string, SemanticToken | PrimitiveStep>>;
const SEMANTIC_GROUPS = ['surface', 'text', 'action', 'border', 'state'] as const;
const PRIMITIVE_FAMILIES = ['surface', 'brand', 'soft', 'deep', 'accent', 'ink', 'neutral', 'paper', 'green', 'red', 'focus', 'alpha', 'event'] as const;

const usedBy = (tokenPath: string): string[] | undefined => {
  for (const rows of Object.values(foundations as Record<string, Array<{ tokenPath: string; consumedBy?: string[] }>>)) {
    const hit = rows.find((r) => r.tokenPath === tokenPath);
    if (hit) return hit.consumedBy;
  }
  return undefined;
};

const modeValue = (t: SemanticToken, mode: Mode) => (mode === 'cream' ? t.value : t.modes?.[mode] ?? t.value);
const aliasOf = (t: SemanticToken, mode: Mode) => t.alias?.[mode];
const stepOf = (alias?: string) => (alias ? alias.split('/').slice(1).join('/') : '—');

// ---------------------------------------------------------------- Colours

const SURFACE_COPY: Record<Mode, string> = {
  cream: 'Linen, paper, the room by day.',
  olive: 'Bottle glass, vine leaves, the label wall.',
  dark: 'The bar after dark. Warm, not black.',
  terracotta: 'Clay, cork, the first pour. The one loud colour.',
};

function SurfacePanels() {
  const section = color.surface.section as SemanticToken;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderRadius: 12, overflow: 'hidden' }}>
      {MODES.map((mode) => (
        <div
          key={mode}
          data-mode={mode}
          style={{
            background: 'var(--color-surface-section)',
            color: 'var(--color-text-primary)',
            minHeight: 360,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'inset 0 0 0 1px var(--color-border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: 28, lineHeight: 1.15, marginBottom: 8 }}>{MODE_LABEL[mode]}</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>{SURFACE_COPY[mode]}</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontFamily: font.mono }}>{modeValue(section, mode).toUpperCase()}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {aliasOf(section, mode)} · data-mode="{mode}"
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RolesTable() {
  const rows: Array<Record<string, ReactNode>> = [];
  for (const group of SEMANTIC_GROUPS) {
    for (const [name, raw] of Object.entries(color[group] ?? {})) {
      const t = raw as SemanticToken;
      if (!('modes' in t) && !('alias' in t)) continue;
      const row: Record<string, ReactNode> = {
        role: (
          <span>
            <Mono>{`${group}/${name}`}</Mono>
          </span>
        ),
      };
      for (const mode of MODES) {
        row[mode] = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ModeSwatch cssVar={`--color-${group}-${name}`} mode={mode} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{stepOf(aliasOf(t, mode))}</span>
          </span>
        );
      }
      row.used = <UsedBy names={usedBy(`color.${group}.${name}`)} />;
      rows.push(row);
    }
  }
  return (
    <RefTable
      columns={[
        { key: 'role', label: 'Role', width: 220 },
        { key: 'cream', label: 'Cream', width: 120 },
        { key: 'olive', label: 'Olive', width: 120 },
        { key: 'dark', label: 'Dark', width: 120 },
        { key: 'terracotta', label: 'Terracotta', width: 120 },
        { key: 'used', label: 'Used by' },
      ]}
      rows={rows}
    />
  );
}

function Ramps() {
  const stepKey = (s: string) => (Number.isNaN(Number(s)) ? 1000 : Number(s));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', rowGap: 12, columnGap: 16, alignItems: 'center' }}>
      {PRIMITIVE_FAMILIES.filter((f) => color[f]).map((family) => {
        const steps = Object.entries(color[family] as Record<string, PrimitiveStep>).filter(([, v]) => !('alias' in (v as object)) && !('modes' in (v as object))).sort((a, b) => stepKey(a[0]) - stepKey(b[0]));
        return [
          <div key={family + '-label'} style={{ fontSize: 13, textTransform: 'capitalize' }}>
            {family}
            {family === 'event' && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>print only</div>}
          </div>,
          <div key={family + '-strip'} style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {steps.map(([step, v]) => (
              <span key={step} title={`${family}/${step} · ${v.value}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <HexSwatch hex={v.value} />
                <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontFamily: font.mono }}>{step}</span>
              </span>
            ))}
          </div>,
        ];
      })}
    </div>
  );
}

export function ColoursPage() {
  return (
    <DocPage
      title="Colours"
      overline="Palette"
      headline="The colours come from the room, not the screen."
      lead="Four surfaces — cream, olive, dark, terracotta. Twenty-six colour roles resolve against whichever surface they sit on, so a component never holds a colour of its own."
      notes={
        <>
          <Note>
            Every role is a CSS custom property, <Mono>--color-&lt;group&gt;-&lt;name&gt;</Mono>, registered in Tailwind’s{' '}
            <Mono>@theme</Mono> so utilities like <Mono>bg-surface-section</Mono> and <Mono>text-text-primary</Mono> exist
            automatically. The cream values are the defaults; a container with <Mono>data-mode="olive"</Mono>,{' '}
            <Mono>"dark"</Mono> or <Mono>"terracotta"</Mono> overrides them for its subtree, and the innermost override wins.
          </Note>
          <Note>
            <Mono>action/secondary</Mono> and the dark-surface <Mono>border/subtle</Mono> are transparent whites, so their
            cream cells look empty above — that is the token, not a rendering gap.
          </Note>
          <Note>
            Primitives are the raw ramps. No component points at one directly; the semantic roles alias into them. The
            Event ramp is Vines &amp; Vinyl print colour and is kept out of <Mono>@theme</Mono> on purpose.
          </Note>
          <Note>
            Northline (the second brand) swaps every primitive value; switch it in the toolbar on any component story.
          </Note>
        </>
      }
    >
      <Section label="Four surfaces" aside="Each panel is rendered with the tokens, not painted">
        <SurfacePanels />
      </Section>
      <Section label="Twenty-six roles, four surfaces" aside="Swatches resolve live per surface; numbers are the primitive step">
        <RolesTable />
      </Section>
      <Section label="Primitives" aside="Base colours — the only place a hex lives">
        <Ramps />
      </Section>
    </DocPage>
  );
}

// ------------------------------------------------------------- Typography

type TypeStyle = { fontSize: string; lineHeight: number | string; fontFamily: string; fontWeight: number; letterSpacing: string; figmaStyle?: string; note?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typography = (tokens as any).typography as Record<string, TypeStyle>;

function Specimen({ name, s, sample }: { name: string; s: TypeStyle; sample: string }) {
  const isSerif = s.fontFamily.toLowerCase().includes('recoleta');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', alignItems: 'baseline', gap: 24, padding: '16px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div
        style={{
          fontFamily: isSerif ? 'var(--font-recoleta)' : 'var(--font-manrope)',
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          fontWeight: s.fontWeight,
          letterSpacing: s.letterSpacing === '0%' ? 0 : s.letterSpacing,
          textTransform: name.includes('overline') ? 'uppercase' : undefined,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {sample}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', fontFamily: font.mono, whiteSpace: 'nowrap' }}>
        {name} · {parseInt(s.fontSize)}/{typeof s.lineHeight === 'number' ? Math.round(s.lineHeight * 100) : s.lineHeight}
      </div>
    </div>
  );
}

const SAMPLES: Record<string, string> = {
  h3: 'A neighbourhood pour',
  h4: 'Low-intervention wines, poured by the people who made them',
  h6: 'Reserve a table',
  'paragraph-large': 'We select our records with the same care as our grapes.',
  'paragraph-small': 'Tastings are walk-in from noon. Bookings for groups of six or more.',
  label: 'Party size',
  'label-strong': 'Thursday 4pm – 11pm',
  caption: '156 Main Road, Eltham · Sat 22 Nov · 12pm – 6pm',
  overline: 'What’s on · Saturday',
};

export function TypographyPage() {
  const order = ['h3', 'h4', 'h6', 'paragraph-large', 'paragraph-small', 'label', 'label-strong', 'caption', 'overline'].filter((k) => typography[k]);
  const rows = order.map((k) => {
    const s = typography[k];
    return {
      style: <Mono>{s.figmaStyle ?? k}</Mono>,
      token: <Mono>{`--text-${k}`}</Mono>,
      family: s.fontFamily,
      size: s.fontSize,
      lh: typeof s.lineHeight === 'number' ? `${Math.round(s.lineHeight * 100)}%` : s.lineHeight,
      ls: s.letterSpacing,
      used: <UsedBy names={usedBy(`typography.${k}`)} />,
    };
  });
  return (
    <DocPage
      title="Typography"
      overline="Type"
      headline="Two typefaces. One for warmth, one for clarity."
      lead="Recoleta is the host: soft serifs, generous curves, a hint of hand-lettered menu board. It carries the name, the headlines and the moments worth lingering on. Manrope does the quiet work — prices, hours, forms, labels — so the page never feels cluttered."
      notes={
        <>
          <Note>
            Sizes are set in px, not rem, because the host app’s root font-size is 18px and rem-based utilities would scale
            every token 1.125× off its nominal value. Line-heights are unitless multipliers of the size.
          </Note>
          <Note>
            Recoleta is a licensed face. The public build ships Manrope only; headings fall back to Manrope 400 until
            the licence is in place, at which point one <Mono>@font-face</Mono> turns them on.
          </Note>
          <Note>
            Only the styles a built component uses are in code. Figma carries the full 35-style scale; the rest arrive
            with the components that need them.
          </Note>
        </>
      }
    >
      <Section label="The scale in use" aside="Each line is set at its own size">
        <div style={{ maxWidth: 880 }}>
          {order.map((k) => (
            <Specimen key={k} name={k} s={typography[k]} sample={SAMPLES[k] ?? 'Good wine. Good cheese. Good company.'} />
          ))}
        </div>
      </Section>
      <Section label="Rules">
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 0, maxWidth: 720, fontSize: 15, lineHeight: 1.45 }}>
          {[
            ['Recoleta', 'headlines, quotes and the wordmark'],
            ['Manrope', 'everything you read to get something done'],
            ['Never both', 'never in the same line — the contrast is the point'],
          ].map(([a, b]) => [
            <div key={a} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>{a}</div>,
            <div key={a + b} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>{b}</div>,
          ])}
        </div>
      </Section>
      <Section label="Reference">
        <RefTable
          columns={[
            { key: 'style', label: 'Figma style', width: 200 },
            { key: 'token', label: 'Token', width: 200 },
            { key: 'family', label: 'Family', width: 100 },
            { key: 'size', label: 'Size', width: 70 },
            { key: 'lh', label: 'Line', width: 70 },
            { key: 'ls', label: 'Tracking', width: 80 },
            { key: 'used', label: 'Used by' },
          ]}
          rows={rows}
        />
      </Section>
    </DocPage>
  );
}

// ---------------------------------------------------------------- Spacing

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spacing = (tokens as any).spacing as Record<string, { value: string; note?: string }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const radius = (tokens as any).radius as Record<string, { value: string; note?: string }>;

export function SpacingPage() {
  const steps = Object.entries(spacing).sort((a, b) => parseInt(a[1].value) - parseInt(b[1].value));
  const max = Math.max(...steps.map(([, v]) => parseInt(v.value)));
  const band = (px: number) => (px <= 16 ? 'inside a component' : px <= 48 ? 'between components' : 'between sections');
  return (
    <DocPage
      title="Spacing"
      overline="Space"
      headline="One scale, twelve steps, on a four-pixel grid."
      lead="Small steps live inside a component, middle steps sit between components, and the big steps set the rhythm between sections. Nothing else is used."
      notes={
        <>
          <Note>
            Values are px, not rem, for the same reason as type: the host app sets an 18px root, and design tokens must stay
            pixel-exact regardless. The steps are zero-padded (<Mono>spacing-00</Mono>, <Mono>01</Mono>…) so they never
            collide with Tailwind’s own numeric scale.
          </Note>
          <Note>
            Use <Mono>p-03</Mono>, <Mono>gap-04</Mono> and friends; never a raw number.
          </Note>
        </>
      }
    >
      <Section label="The ruler" aside="Drawn with the spacing tokens themselves">
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 160px', rowGap: 10, columnGap: 16, alignItems: 'center', maxWidth: 960 }}>
          {steps.map(([k, v]) => {
            const px = parseInt(v.value);
            return [
              <Mono key={k + 'n'}>{`spacing-${k}`}</Mono>,
              <div key={k + 'b'} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ height: 12, width: `calc(var(--spacing-${k}) * ${Math.max(1, Math.round(560 / max))})`, minWidth: 2, background: 'var(--color-action-primary)', borderRadius: 2 }} />
                <span style={{ fontSize: 13 }}>{v.value}</span>
              </div>,
              <span key={k + 'u'} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{band(px)}</span>,
            ];
          })}
        </div>
      </Section>
      <Section label="Reference">
        <RefTable
          columns={[
            { key: 'token', label: 'Token', width: 180 },
            { key: 'value', label: 'Value', width: 90 },
            { key: 'use', label: 'Use', width: 220 },
            { key: 'used', label: 'Used by' },
          ]}
          rows={steps.map(([k, v]) => ({
            token: <Mono>{`--spacing-${k}`}</Mono>,
            value: v.value,
            use: <span style={{ color: 'var(--color-text-secondary)' }}>{band(parseInt(v.value))}</span>,
            used: <UsedBy names={usedBy(`spacing.${k}`)} />,
          }))}
        />
      </Section>
    </DocPage>
  );
}

// ----------------------------------------------------------------- Radius

export function RadiusPage() {
  const steps = Object.entries(radius).sort((a, b) => parseInt(a[1].value) - parseInt(b[1].value));
  return (
    <DocPage
      title="Radius"
      overline="Corners"
      headline="Soft, not bubbly."
      lead="Eight corner steps. Inputs and buttons are pills; cards and panels sit at 12 to 24; everything else is small enough that you don’t notice it."
      notes={
        <Note>
          The scale replaces Tailwind’s default <Mono>rounded-*</Mono> steps one for one, so <Mono>rounded-lg</Mono> is the
          system’s 12px, not Tailwind’s 8px.
        </Note>
      }
    >
      <Section label="The steps" aside="Tiles on the olive surface, so the corner reads">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12 }}>
          {steps.map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div
                data-mode="olive"
                style={{ height: 96, borderRadius: `var(--radius-${k})`, background: 'var(--color-surface-section)' }}
              />
              <div style={{ marginTop: 10, fontSize: 13 }}>{k}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{v.value === '9999px' ? 'pill' : v.value}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section label="Reference">
        <RefTable
          columns={[
            { key: 'token', label: 'Token', width: 180 },
            { key: 'value', label: 'Value', width: 90 },
            { key: 'used', label: 'Used by' },
          ]}
          rows={steps.map(([k, v]) => ({
            token: <Mono>{`--radius-${k}`}</Mono>,
            value: v.value,
            used: <UsedBy names={usedBy(`radius.${k}`)} />,
          }))}
        />
      </Section>
    </DocPage>
  );
}

// ----------------------------------------------------------------- Motion

export function MotionPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (tokens as any).motion.standard as { duration: string; easing: string };
  const literal = (foundations as Record<string, Array<{ tokenPath: string; consumedBy?: string[]; literalConsumers?: string[] }>>).motion?.[0];
  return (
    <DocPage
      title="Motion"
      overline="Motion"
      headline={`One timing. ${m.duration}, ease out.`}
      lead="Every hover, focus and colour change uses the same transition, so the whole system moves like one material. Hover the tiles."
      notes={
        <>
          <Note>
            Figma carries no motion variables; this formalises the value the components already shared. Use{' '}
            <Mono>duration-standard</Mono> and <Mono>ease-standard</Mono> rather than Tailwind’s <Mono>duration-150</Mono>.
          </Note>
          {literal?.literalConsumers?.length ? (
            <Note>Still on the literal value: {literal.literalConsumers.join(', ')}.</Note>
          ) : null}
        </>
      }
    >
      <Section label="The transition" aside="Primary and secondary fills, all four surfaces">
        <MotionDemo />
      </Section>
      <Section label="Reference">
        <RefTable
          columns={[
            { key: 'token', label: 'Token', width: 240 },
            { key: 'value', label: 'Value', width: 160 },
            { key: 'used', label: 'Used by' },
          ]}
          rows={[
            { token: <Mono>--duration-standard</Mono>, value: m.duration, used: <UsedBy names={literal?.consumedBy} /> },
            { token: <Mono>--ease-standard</Mono>, value: m.easing, used: <UsedBy names={literal?.consumedBy} /> },
          ]}
        />
      </Section>
    </DocPage>
  );
}

// ------------------------------------------------------------ Breakpoints

export function BreakpointsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bp = (tokens as any).breakpoint as Record<string, { value: string }>;
  const entries = Object.entries(bp).sort((a, b) => parseInt(a[1].value) - parseInt(b[1].value));
  const widest = Math.max(1440, ...entries.map(([, v]) => parseInt(v.value)));
  return (
    <DocPage
      title="Breakpoints"
      overline="Breakpoints"
      headline={`${entries.length === 1 ? 'One' : entries.length} breakpoint${entries.length === 1 ? '' : 's'}. No more than the layout needs.`}
      lead="Below it, one column; above it, the layout opens up. Components themselves don’t respond — pages do."
      notes={
        <Note>
          Registered in Tailwind’s <Mono>--breakpoint-*</Mono> namespace, so <Mono>tablet:</Mono> is a real responsive
          prefix. Tailwind’s default scale is available but not adopted.
        </Note>
      }
    >
      <Section label="Widths" aside="To scale, against a 1440 desktop">
        <div style={{ position: 'relative', height: 160, maxWidth: 960 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, boxShadow: 'inset 0 0 0 1px var(--color-border-default)' }}>
            <Overline style={{ position: 'absolute', right: 12, top: 10 }}>1440 · desktop</Overline>
          </div>
          {entries.map(([k, v]) => (
            <div
              key={k}
              data-mode="olive"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(parseInt(v.value) / widest) * 100}%`,
                background: 'var(--color-surface-section)',
                borderRadius: 8,
                padding: 12,
                color: 'var(--color-text-primary)',
              }}
            >
              <Overline>{`${v.value} · ${k}`}</Overline>
            </div>
          ))}
        </div>
      </Section>
      <Section label="Reference">
        <RefTable
          columns={[
            { key: 'token', label: 'Token', width: 240 },
            { key: 'value', label: 'Value', width: 120 },
            { key: 'prefix', label: 'Tailwind prefix' },
          ]}
          rows={entries.map(([k, v]) => ({ token: <Mono>{`--breakpoint-${k}`}</Mono>, value: v.value, prefix: <Mono>{`${k}:`}</Mono> }))}
        />
      </Section>
    </DocPage>
  );
}

// ------------------------------------------------------------------ Brand

export function BrandPage() {
  return (
    <DocPage
      crumb="Runabout / Brand"
      title="Brand"
      overline="Identity"
      headline="The name is runabout. Always lowercase."
      lead="A small wine, cheese and listening bar for the neighbourhood. The name is a Little Dragon song I still own on vinyl — a song about drifting somewhere with no plan. That is the evening I wanted to build."
      notes={
        <Note>
          The wordmark is an SVG on <Mono>currentColor</Mono>, so it takes <Mono>text/primary</Mono> from whatever it sits
          on — the same rule as every component. Recoleta, the wordmark and heading face, is licensed separately and is not
          in the public build.
        </Note>
      }
    >
      <Section label="The mark on every surface" aside="One file, no variants">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderRadius: 12, overflow: 'hidden' }}>
          {MODES.map((mode) => (
            <div
              key={mode}
              data-mode={mode}
              style={{ background: 'var(--color-surface-section)', color: 'var(--color-text-primary)', height: 200, display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px var(--color-border-subtle)' }}
            >
              <WordmarkAt height={30} />
            </div>
          ))}
        </div>
        <div style={{ height: 20 }} />
        <Note>
          Lowercase is deliberate. A capital letter announces itself. Lowercase pulls up a chair. Local, warm, no fuss.
        </Note>
      </Section>
      <Section label="The rule the whole system rests on">
        <div style={{ fontSize: 28, lineHeight: 1.2, maxWidth: 720, marginBottom: 16 }}>
          Anything with a background owns a mode. Everything else inherits.
        </div>
        <Note>
          A section, a card, a modal picks one of four surfaces by setting <Mono>data-mode</Mono>. Buttons, inputs, tabs,
          badges, text and icons never carry a mode — they take their colours from whatever they sit on. Move a button
          from cream to olive and it recolours itself. No variants, no overrides, no second set to maintain.
        </Note>
      </Section>
      <Section label="Photography" aside="Warm, close and lit by candles">
        <Note>
          Real people mid-conversation, hands and glasses in frame, never posed. Lamps and window light, never flash. Food
          and records shot from above, like a still life.
        </Note>
        <DoDont
          dos={['Candid, caught mid-moment', 'Warm skin and amber highlights', 'Texture: cheese rind, cork, the grain of vinyl']}
          donts={['Studio backdrops', 'Cool or flat lighting', 'Posed smiles to camera']}
        />
      </Section>
    </DocPage>
  );
}
