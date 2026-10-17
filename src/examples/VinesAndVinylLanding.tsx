import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import { Button } from '../components/Button';
import { Input } from '../components/Input';
import tokens from '../tokens/tokens.json';
import { EventLogo, Grapes, RunaboutLogotype, Seal, Sparkle, Vinyl } from './VinesAndVinylArt';
import hallPhoto from './assets/vines-and-vinyl-hall.png';

// Source: Figma section "06 · Web — Landing page" (1336:396, file
// JpFA7KtVlSOrM9fIYYgOsn), signed off as three frames: desktop 1325:1674
// (1440), tablet 1328:55 (768) and mobile 1328:2697 (390). Replaces the old
// fixed-1440 build of node 435:62. A composed marketing page, not a
// design-system component, so it lives under src/examples/ and doesn't carry
// the docs.ts/validation.json machinery src/components/ gets.
//
// FLUID, NOT STEPPED. The three frames are three points on one continuous
// layout. Every size and space that differs between them is interpolated
// between those points with fluid() below — piecewise-linear through each
// frame's exact value, flat beyond 390 and 1440 — measured against the page's
// own width (container query units on the root), so it behaves the same in a
// Storybook viewport, an iframe or a narrower column. Layout changes come
// from the content, not breakpoints: the email row wraps to a stack when the
// field runs out of room, and the three info columns collapse to one when a
// column would drop under its minimum. Two exceptions, each for a reason the
// content can't express on its own:
//   - Event / Date seal swaps its Small and Large variants at the system's
//     one breakpoint token, tablet (1024px). Its Figma description says not to
//     scale an instance: the two sizes use different text styles.
//   - The footer switches stack ↔ row with a container query on its own width.
//     The text alignment flips with it (left when stacked, right beside the
//     logo), and CSS can't align by whether flex-wrap has wrapped. Agreed with
//     the requester rather than invented.
//
// BRAND AND MODES. The page pins data-brand="vines-and-vinyl" on its root.
// Each section owns its surface and so its mode — hero brand, info light,
// footer accent, exactly what each Figma frame's explicitVariableModes say.
// Nothing inside a section sets a mode of its own. The art resolves from
// those modes too (see VinesAndVinylArt.tsx).
//
// COPY is taken from the Figma text layers. None of it contained U+200C (the
// demo-font workaround), checked live on 2026-10-17, so there was nothing to
// strip.

// --- Fluid sizing ----------------------------------------------------------

// A spacing token by its tokens.json key ('04' → --spacing-04), or a raw px
// value for dimensions Figma doesn't bind to a variable (art sizes and
// positions, the logo width). Raw values stay literal rather than being
// snapped onto a token they merely resemble (rules §1).
type FluidValue = number | `spacing-${string}`;
type Stop = readonly [width: number, value: FluidValue];

const spacing = tokens.spacing as Record<string, { value: string }>;

const px = (v: FluidValue) => (typeof v === 'number' ? v : parseFloat(spacing[v.slice(8)].value));
const css = (v: FluidValue) => (typeof v === 'number' ? `${round(v)}px` : `var(--${v})`);
const round = (n: number) => Math.round(n * 1000) / 1000;

// One segment: clamp(<low end>, <line between the two stops>, <high end>),
// with the stop values themselves — tokens where they're tokens — as the
// clamp bounds.
const segment = ([w0, v0]: Stop, [w1, v1]: Stop) => {
  const slope = (px(v1) - px(v0)) / (w1 - w0);
  const line = `calc(${css(v0)} + (100cqi - ${w0}px) * ${round(slope)})`;
  const [lo, hi] = px(v0) <= px(v1) ? [v0, v1] : [v1, v0];
  return `clamp(${css(lo)}, ${line}, ${css(hi)})`;
};

// Piecewise-linear through every stop. Each segment holds its end values
// outside its own range, so summing them and subtracting the shared middle
// values leaves exactly one segment active at any width.
const fluid = (...stops: Stop[]) => {
  if (stops.length === 1) return css(stops[0][1]);
  const segments = stops.slice(1).map((stop, i) => segment(stops[i], stop));
  const shared = stops.slice(1, -1).map(([, v]) => ` - ${css(v)}`).join('');
  return segments.length === 1 ? segments[0] : `calc(${segments.join(' + ')}${shared})`;
};

const MOBILE = 390;
const TABLET = 768;
const DESKTOP = 1440;

// --- Decorations -----------------------------------------------------------

// Every illustration is decorative (aria-hidden on the art itself). Each is
// placed by its centre, measured from Figma's rotated bounding box in each
// frame, so rotation never shifts it. Anchored to whichever edge it hugs in
// the mocks, so the hero's height changing with its copy doesn't drag it.
type Edge = 'left' | 'right' | 'top' | 'bottom';
interface DecoProps {
  x: [Edge, string];
  y: [Edge, string];
  width: string;
  rotate?: number;
  children: ReactNode;
}
const Deco = ({ x: [xEdge, xValue], y: [yEdge, yValue], width, rotate = 0, children }: DecoProps) => {
  const style: CSSProperties = {
    [xEdge]: xValue,
    [yEdge]: yValue,
    width,
    translate: `${xEdge === 'left' ? '-50%' : '50%'} ${yEdge === 'top' ? '-50%' : '50%'}`,
    rotate: `${rotate}deg`,
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute [&>svg]:w-full" style={style}>
      {children}
    </div>
  );
};

// A decoration present in some frames and absent from another is
// interpolated to zero size at the frame that doesn't have it, rather than
// switched off at a width the mocks never specify.
const heroArt = (
  <>
    {/* Accent grape cluster, outline only, top left. */}
    <Deco
      x={['left', fluid([MOBILE, 32.9], [TABLET, 69.9], [DESKTOP, 50.7])]}
      y={['top', fluid([MOBILE, 238.9], [TABLET, 337.3], [DESKTOP, 422.4])]}
      width={fluid([MOBILE, 219.811], [TABLET, 325.322], [DESKTOP, 546.759])}
      rotate={6}
    >
      <Grapes colour="primary" outline />
    </Deco>
    {/* Large soft grape cluster, bottom right. */}
    <Deco
      x={['right', fluid([MOBILE, 41.95], [TABLET, -102.4], [DESKTOP, 56.3])]}
      y={['bottom', fluid([MOBILE, 21.4], [TABLET, 216.1], [DESKTOP, 303.9])]}
      width={fluid([MOBILE, 215.142], [TABLET, 373.511], [DESKTOP, 439.425])}
      rotate={-8}
    >
      <Grapes colour="feature" />
    </Deco>
    {/* Record, bottom left. */}
    <Deco
      x={['left', fluid([MOBILE, 23.1], [TABLET, 63], [DESKTOP, 60])]}
      y={['bottom', fluid([MOBILE, 44.9], [TABLET, -8], [DESKTOP, 128])]}
      width={fluid([MOBILE, 158.238], [TABLET, 265.946], [DESKTOP, 332.432])}
    >
      <Vinyl colour="feature" />
    </Deco>
    {/* Primary sparkle, just off the logo's right shoulder — anchored to the
        centre line, which is what the logo is. */}
    <Deco
      x={['left', `calc(50% + ${fluid([MOBILE, 153], [TABLET, 283.2], [DESKTOP, 335])})`]}
      y={['top', fluid([MOBILE, 333.2], [TABLET, 326.2], [DESKTOP, 266.9])]}
      width="64px"
      rotate={15}
    >
      <Sparkle colour="primary" />
    </Deco>
    {/* Large secondary sparkle: tablet and desktop only, so it grows in from
        zero at 390. It sits below the email row at 768 and beside the
        description at 1440; a straight line between the two would drag it
        across the copy, the same cream as the text. So it holds its 768
        height until the 591px email row's left edge, (width − 591) / 2,
        clears the sparkle's right edge (384px) — at 1360px — and only then
        rises. */}
    <Deco
      x={['left', fluid([TABLET, 339.7], [DESKTOP, 334.3])]}
      y={['bottom', fluid([TABLET, 75.2], [1360, 75.2], [DESKTOP, 318.2])]}
      width={fluid([MOBILE, 0], [TABLET, 81.4545])}
      rotate={-15}
    >
      <Sparkle colour="secondary" />
    </Deco>
    {/* Small secondary sparkle: mobile and desktop only, so it shrinks to
        zero at 768. */}
    <Deco
      x={['right', fluid([MOBILE, 203.7], [DESKTOP, 245.4])]}
      y={['bottom', fluid([MOBILE, 66.2], [DESKTOP, 115.5])]}
      width={fluid([MOBILE, 55.2727], [TABLET, 0], [DESKTOP, 55.2727])}
      rotate={12}
    >
      <Sparkle colour="secondary" />
    </Deco>
  </>
);

// --- Event / Date seal -------------------------------------------------------

// Figma: Event / Date seal (1395:154). Size=Small below the tablet token,
// Size=Large from it: the 768 frame uses Small, the 1440 frame Large. The
// seal is drawn centred behind the text and rotated, at each variant's own
// size; the text is real content (not decorative) and the seal shape is
// aria-hidden. Positioned against the hero's top-right corner.
const DateSeal = () => (
  <div
    className="absolute flex w-[124px] flex-col items-center tablet:w-[191px]"
    style={{ right: fluid([MOBILE, 31.19], [TABLET, 37], [DESKTOP, 56]), top: fluid([MOBILE, 56], [TABLET, 74], [DESKTOP, 112]) }}
  >
    <Seal className="pointer-events-none absolute left-1/2 top-1/2 w-[198.506px] -translate-x-1/2 -translate-y-1/2 -rotate-8 tablet:w-[305.242px]" />
    <p className="relative flex w-full flex-col items-center gap-00 text-center text-text-on-highlight">
      <span className="w-full font-manrope text-overline font-semibold">SATURDAY</span>
      <time dateTime="2027-04-24" className="w-full font-recoleta text-h6-serif tablet:text-h4">
        24 April 2027
      </time>
      <span className="w-full whitespace-pre-wrap font-manrope text-detail tablet:text-label-strong tablet:font-semibold">
        {'12–4:30pm  ·  Eltham'}
      </span>
    </p>
  </div>
);

// --- Sections ----------------------------------------------------------------

const heroPaddingInline = fluid([MOBILE, 'spacing-04'], [DESKTOP, 'spacing-10']);

const Hero = () => {
  const promptId = useId();
  return (
    // Hero — On Brand. `isolate` gives the section its own stacking context so
    // the photo band can sit under the art (-z-10) without escaping below
    // the section's own fill.
    <section data-mode="brand" className="relative isolate w-full overflow-hidden bg-surface-section pb-10">
      {heroArt}
      <DateSeal />

      {/* Photo band. The photo and its scrim fill exactly the band holding the
          logo and its credit, and the scrim reaches solid surface-scrim-end at
          the band's bottom edge — which is where the description starts. So
          the description sits on solid terracotta at every width by
          construction, not by tuning a gradient stop per breakpoint. (In
          Figma the gradient covers the whole hero with its solid stop at
          59.9% / 56.4% / 44.6%: in all three frames that stop lands exactly
          on the description's top edge, which is what this reproduces.)
          The band's horizontal padding interpolates straight from the mobile
          to the desktop value: the tablet frame's 128px is overflowed by its
          own 560px copy and 556px email row, so it isn't a real constraint. */}
      <div
        className="relative flex flex-col items-center gap-03 pb-03"
        style={{ paddingTop: fluid([MOBILE, 'spacing-10'], [TABLET, 'spacing-09']), paddingInline: heroPaddingInline }}
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          {/* 3:2 photo, top-anchored and centred. 665px is the mobile frame's
              crop (170.52% of 390); from 768 it spans the width. The desktop
              frame crops it cover-centred over the full 898px hero, i.e.
              31px off the top. */}
          <img
            src={hallPhoto}
            alt=""
            className="absolute left-1/2 h-auto min-h-full max-w-none -translate-x-1/2 object-cover"
            style={{ width: 'max(100%, 665px)', top: fluid([TABLET, 0], [DESKTOP, -31]) }}
          />
          {/* sRGB interpolation to match Figma's; Tailwind defaults to oklab. */}
          <div className="absolute inset-0 bg-linear-to-b/srgb from-surface-scrim-start to-surface-scrim-end" />
        </div>
        {/* max-w-full: below 390 the mobile logo's 300px would outgrow the
            padded column (it's 256px wide at 320), so it scales down with it. */}
        <h1 className="relative z-10 m-0 max-w-full" style={{ width: fluid([MOBILE, 300], [TABLET, 480], [DESKTOP, 596]) }}>
          <EventLogo label="Vines & Vinyl" className="w-full" />
        </h1>
        <p className="relative z-10 text-center font-manrope text-label-strong font-semibold text-text-primary">
          Presented by Runabout
        </p>
      </div>

      <div
        className="relative z-10 flex flex-col items-center"
        style={{ gap: fluid([MOBILE, 'spacing-05'], [TABLET, 'spacing-06']), paddingInline: heroPaddingInline }}
      >
        <p
          className="w-full text-center font-manrope text-paragraph-large text-text-primary"
          style={{ maxWidth: fluid([TABLET, 560], [DESKTOP, 544]) }}
        >
          One Saturday, one beautiful 1960s hall in Eltham — independent winemakers, local makers and
          all-vinyl DJs. 150 tickets, every tasting included.
        </p>

        <div className="flex w-full flex-col items-center gap-02">
          {/* Figma "Manrope/Paragraph Large Bold" = paragraph-large + bold. */}
          <p id={promptId} className="text-center font-manrope text-paragraph-large font-bold text-text-primary">
            Join the list and be first to grab an <span className="text-text-accent">early bird</span> — strictly
            limited.
          </p>
          {/* Row at tablet and desktop (400px field + hugging button), a
              full-width stack on mobile — from content, not a breakpoint. The
              field's huge grow factor keeps the button at its natural width
              while they share a row; once the row can't hold the field's 240px
              basis plus the button, each wraps onto its own line and fills it.
              The form's max width is Figma's own Email capture row, 591px
              (400px field + gap + 175px button) — a hugging frame, so a literal
              rather than a token. */}
          <form
            aria-labelledby={promptId}
            className="flex w-full max-w-[591px] flex-wrap gap-02"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex-[999_1_240px]">
              <Input type="email" name="email" size="large" placeholder="you@email.com" aria-label="Email address" autoComplete="email" required />
            </div>
            <Button type="submit" variant="primary" size="large" className="flex-[1_0_auto]">
              Join the list
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

// The three columns stay side by side only while each can be at least 240px
// — roughly the width "The makers" needs at H3 plus breathing room — and
// otherwise all collapse to one column together (no orphaned 2 + 1 row).
// That's the "switcher" pattern: the flex-basis goes hugely negative above the
// threshold (so every item shares the row) and hugely positive below it (so
// every item takes its own line).
const INFO_THRESHOLD = 'calc(3 * 240px + 2 * var(--spacing-07))';

interface InfoItemProps {
  art: ReactNode;
  title: string;
  children: ReactNode;
}
const InfoItem = ({ art, title, children }: InfoItemProps) => (
  <div className="flex flex-col items-center gap-03 text-center" style={{ flex: `1 1 calc((${INFO_THRESHOLD} - 100%) * 999)` }}>
    <div aria-hidden="true" className="w-[64px] [&>svg]:w-full">
      {art}
    </div>
    <div className="flex w-full flex-col items-center gap-01">
      <h2 className="m-0 font-recoleta text-h3 font-normal text-text-accent">{title}</h2>
      <p className="w-full font-manrope text-paragraph-small text-text-secondary">{children}</p>
    </div>
  </div>
);

const Info = () => (
  // Info — On Light.
  <section
    data-mode="light"
    className="flex w-full flex-wrap justify-center gap-x-07 gap-y-05 bg-surface-section py-09"
    style={{ paddingInline: fluid([MOBILE, 'spacing-04'], [TABLET, 'spacing-10']) }}
  >
    <InfoItem art={<Grapes colour="feature" />} title="The makers">
      A hand-picked lineup of local wineries, cheesemakers and good-food makers — every table staffed by the
      person who made it.
    </InfoItem>
    <InfoItem art={<Seal />} title="150 tickets">
      Capped small on purpose — every tasting and masterclass included, a keepsake glass in your hand, and kids
      come free with an adult.
    </InfoItem>
    <InfoItem art={<Vinyl colour="primary" />} title="All vinyl">
      Crates of jazz, funk, soul and disco spinning all afternoon — come for a boogie.
    </InfoItem>
  </section>
);

// Row once the footer is wide enough to hold the credit (151px logo), the
// spacing-04 gap and the one-line contact row side by side. That's 559px in
// Figma (a 376px contact line), but the self-hosted Manrope renders the line
// at 385px, so the threshold is the rendered content's width, 568px —
// measured, not rounded to a guess. Below it the row would squeeze the line.
const Footer = () => (
  // Footer — On Accent.
  <footer
    data-mode="accent"
    className="relative isolate w-full overflow-hidden bg-surface-section py-05"
    style={{ paddingInline: fluid([MOBILE, 'spacing-04'], [TABLET, 'spacing-07'], [DESKTOP, 'spacing-10']) }}
  >
    {/* Figma's footer record is a Colour=Feature instance with its fill
        overridden to illustration-primary; what it renders is Colour=Primary,
        so that's what's used here. Reported to design as a variant swap. */}
    <Deco
      x={['right', fluid([MOBILE, 50], [TABLET, 48.4], [DESKTOP, 66])]}
      y={['top', fluid([MOBILE, 46.5], [TABLET, 61.6], [DESKTOP, 84])]}
      width={fluid([MOBILE, 150], [TABLET, 220], [DESKTOP, 300])}
    >
      <Vinyl colour="primary" />
    </Deco>
    <div className="relative @container/footer">
      <div className="flex flex-col items-start gap-04 @min-[568px]/footer:flex-row @min-[568px]/footer:items-center @min-[568px]/footer:justify-between">
        <div className="flex flex-col items-start gap-02">
          <p className="font-manrope text-overline-wide uppercase text-text-secondary">Presented by</p>
          <RunaboutLogotype label="Runabout" />
        </div>
        <div className="flex flex-col items-start gap-01 font-manrope @min-[568px]/footer:items-end @min-[568px]/footer:text-right">
          <p className="text-paragraph-small text-text-primary">
            <span className="block @min-[568px]/footer:inline">hello@runaboutwine.com.au</span>
            <span aria-hidden="true" className="hidden whitespace-pre @min-[568px]/footer:inline">
              {'   ·   '}
            </span>
            <span className="block @min-[568px]/footer:inline">@runabout.melbourne</span>
          </p>
          <p className="text-caption text-text-secondary">Wine · Cheese · Music — Melbourne&apos;s north-east</p>
        </div>
      </div>
    </div>
  </footer>
);

export const VinesAndVinylLanding = () => (
  // `@container` makes the page's own width what every fluid() value measures
  // (100cqi), rather than the viewport's.
  <div data-brand="vines-and-vinyl" className="@container flex w-full flex-col">
    <main className="flex w-full flex-col">
      <Hero />
      <Info />
    </main>
    <Footer />
  </div>
);
