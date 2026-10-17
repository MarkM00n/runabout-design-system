import { forwardRef } from 'react';
import type { ReactNode, SVGAttributes } from 'react';
import clsx from 'clsx';

/**
 * Source: Figma `Illustration/Sparkle` (1433:2809), `Illustration/Vinyl`
 * (1464:1000), `Illustration/Grapes` (1433:2812) and `Illustration/Seal`
 * (1385:8), all on the 00. Brand page. Decorative brand art: sparkles,
 * a record, a grape cluster and the scalloped seal.
 *
 * One component with a `name` prop rather than four, for the same reason
 * `Icon` is one: the four share a single contract — decorative and hidden
 * from assistive tech, paint from a token via currentColor, scale
 * proportionally, never set a mode — and differ only in geometry and in
 * which colours each offers. That difference is kept type-safe: `colour` is
 * narrowed per `name`, so `<Illustration name="vinyl" colour="tertiary" />`
 * doesn't compile, exactly as Figma's Vinyl set has no Tertiary variant.
 *
 * The `colour` prop mirrors each set's Colour variant property and its
 * default, read live from Figma on 2026-10-17:
 *   Sparkle  Secondary | Primary | Tertiary   default Primary
 *   Vinyl    Feature | Primary                default Feature
 *   Grapes   Primary | Feature | Outline      default Primary
 *   Seal     no variants                      illustration/highlight
 * Every fill (and Grapes' stroke) binds the matching `illustration/*`
 * variable in every variant; Vinyl's label binds `surface/section`, so the
 * hole always shows the surface the record sits on. Paint is therefore
 * currentColor plus a `text-illustration-*` utility, or the var() directly —
 * the art resolves from data-brand and the surrounding data-mode as the
 * Figma components do, and never sets a mode of its own (it has no
 * background; rules §2).
 *
 * Geometry is GENERATED from each master variant's own SVG export
 * (exportAsync SVG_STRING, live Plugin API read). Sibling variants export
 * identical geometry, differing only in the baked fill hex this file drops.
 * The block below was written by a script from those exports — paths copied
 * verbatim, only the baked hex swapped for currentColor or the label's var().
 * Never hand-edit a path: re-export and replace the block the same way. The
 * FNV-1a hashes are of the raw export strings, to check a re-export against.
 *   Sparkle Colour=Primary 1433:2805  c76a7b21
 *   Vinyl   Colour=Feature 1385:9     f65fc683
 *   Grapes  Colour=Primary 1385:4     fd7816be
 *   Grapes  Colour=Outline 1486:861   d1fa50a3
 *   Seal                   1385:8     d41dc313
 * The viewBox is each master's true frame size, read from the node. Figma's
 * SVG export rounds the root width/height (Grapes' 418.5 x 408.75 exports as
 * 419 x 409), which would nudge the aspect ratio; the paths are untouched.
 *
 * Grapes' stroke is inside-aligned in Figma, 1px. The export expresses that
 * as a centred 1px stroke on a path already inset by half a pixel, so it is
 * carried exactly as exported and scales with the shape, as an instance's
 * stroke does in Figma.
 *
 * Grapes Colour=Outline (added in Figma 2026-10-17) is the one variant with
 * different geometry: no fill, and a 1px *centred* illustration/primary
 * stroke on the un-inset outline. It is its own exported shape below, not the
 * filled path with its fill dropped, and its stroke scales with the instance
 * the same way (1.31px at the landing page's 547px hero cluster).
 *
 * Sizes: rendered at the master's natural size by default (width/height
 * attributes). Size it with a width class — `w-[64px]`, `w-full` — and the
 * height follows the viewBox (`h-auto`). Arbitrary px, never Tailwind's
 * rem-based scale (rules §1).
 */

export type IllustrationName = 'sparkle' | 'vinyl' | 'grapes' | 'seal';
export type SparkleColour = 'primary' | 'secondary' | 'tertiary';
export type VinylColour = 'feature' | 'primary';
export type GrapesColour = 'primary' | 'feature' | 'outline';
export type IllustrationColour = SparkleColour | VinylColour | GrapesColour;

type SvgProps = Omit<SVGAttributes<SVGSVGElement>, 'children' | 'color' | 'fill' | 'name'>;

export type IllustrationProps = SvgProps &
  (
    | { name: 'sparkle'; colour?: SparkleColour }
    | { name: 'vinyl'; colour?: VinylColour }
    | { name: 'grapes'; colour?: GrapesColour }
    | { name: 'seal'; colour?: never }
  );

// Literal class names, so Tailwind compiles every one.
const COLOUR_CLASS: Record<IllustrationColour | 'highlight', string> = {
  primary: 'text-illustration-primary',
  secondary: 'text-illustration-secondary',
  tertiary: 'text-illustration-tertiary',
  feature: 'text-illustration-feature',
  // Grapes Colour=Outline binds its stroke to illustration/primary.
  outline: 'text-illustration-primary',
  highlight: 'text-illustration-highlight',
};

const DEFAULT_COLOUR: Record<IllustrationName, IllustrationColour | 'highlight'> = {
  sparkle: 'primary',
  vinyl: 'feature',
  grapes: 'primary',
  seal: 'highlight',
};

interface Shape {
  width: number;
  height: number;
  body: ReactNode;
}

// --- GENERATED from the Figma exports — do not hand-edit -------------------
const SHAPES: Record<IllustrationName, Shape> = {
  sparkle: {
    width: 128,
    height: 128,
    body: <path d="M64 20L73.3338 54.6662L108 64L73.3338 73.3338L64 108L54.6662 73.3338L20 64L54.6662 54.6662L64 20Z" fill="currentColor" />,
  },
  vinyl: {
    width: 410,
    height: 410,
    body: (
      <>
        <circle cx="205" cy="205" r="185" fill="currentColor" />
        <circle cx="205.001" cy="205" r="40.7" fill="var(--color-surface-section)" />
      </>
    ),
  },
  grapes: {
    width: 418.5,
    height: 408.75,
    body: <path d="M258 20.5C280.236 20.5 299.738 32.2056 310.681 49.793L310.909 50.1602L311.305 49.9883C318.871 46.6992 327.222 44.875 336 44.875C370.242 44.875 398 72.6333 398 106.875C398 128.996 386.414 148.41 368.979 159.384L368.742 159.532L368.745 159.812C368.748 160.043 368.75 160.272 368.75 160.5C368.75 191.342 346.23 216.923 316.736 221.698L316.142 221.794L316.346 222.361C318.709 228.923 320 235.998 320 243.375C320 274.217 297.48 299.798 267.986 304.573L267.392 304.669L267.596 305.236C269.959 311.798 271.25 318.873 271.25 326.25C271.25 360.492 243.492 388.25 209.25 388.25C175.008 388.25 147.25 360.492 147.25 326.25C147.25 318.873 148.54 311.798 150.903 305.236L151.107 304.669L150.513 304.573C121.02 299.797 98.5 274.216 98.5 243.375C98.5 235.998 99.7898 228.923 102.153 222.361L102.357 221.794L101.763 221.698C72.2699 216.922 49.75 191.341 49.75 160.5C49.75 160.271 49.7514 160.042 49.7539 159.812L49.7568 159.532L49.5205 159.384C32.0853 148.41 20.5 128.996 20.5 106.875C20.5 72.6333 48.2583 44.875 82.5 44.875C91.2778 44.875 99.6284 46.6994 107.194 49.9883L107.59 50.1602L107.818 49.793C118.761 32.2054 138.264 20.5 160.5 20.5C180.056 20.5 197.496 29.5536 208.86 43.6992L209.25 44.1846L209.64 43.6992C221.004 29.5536 238.444 20.5 258 20.5Z" fill="currentColor" stroke="currentColor" />,
  },
  seal: {
    width: 290,
    height: 290,
    body: <path d="M145 20L165.972 39.5656L192.835 29.5151L204.724 55.617L233.388 56.6116L234.383 85.2762L260.485 97.1646L250.434 124.028L270 145L250.434 165.972L260.485 192.835L234.383 204.724L233.388 233.388L204.724 234.383L192.835 260.485L165.972 250.434L145 270L124.028 250.434L97.1646 260.485L85.2762 234.383L56.6116 233.388L55.617 204.724L29.5151 192.835L39.5656 165.972L20 145L39.5656 124.028L29.5151 97.1646L55.617 85.2762L56.6116 56.6116L85.2762 55.617L97.1646 29.5151L124.028 39.5656L145 20Z" fill="currentColor" />,
  },
};

// Grapes Colour=Outline — different geometry from the filled variants.
const GRAPES_OUTLINE: Shape = {
  width: 418.5,
  height: 408.75,
  body: <path d="M258 20C280.416 20 300.076 31.8011 311.105 49.5293C318.733 46.2133 327.152 44.375 336 44.375C370.518 44.375 398.5 72.3572 398.5 106.875C398.5 129.175 386.82 148.745 369.245 159.807C369.248 160.037 369.25 160.269 369.25 160.5C369.25 191.591 346.548 217.377 316.816 222.191C319.199 228.807 320.5 235.939 320.5 243.375C320.5 274.466 297.798 300.252 268.066 305.066C270.449 311.682 271.75 318.814 271.75 326.25C271.75 360.768 243.768 388.75 209.25 388.75C174.732 388.75 146.75 360.768 146.75 326.25C146.75 318.814 148.05 311.681 150.433 305.066C120.702 300.252 98 274.465 98 243.375C98 235.939 99.2998 228.806 101.683 222.191C71.9516 217.377 49.25 191.59 49.25 160.5C49.25 160.269 49.2514 160.037 49.2539 159.807C31.6794 148.745 20 129.175 20 106.875C20 72.3572 47.9822 44.375 82.5 44.375C91.3477 44.375 99.7659 46.2136 107.394 49.5293C118.423 31.8009 138.084 20 160.5 20C180.213 20 197.795 29.1271 209.25 43.3857C220.705 29.1271 238.287 20 258 20Z" stroke="currentColor" />,
};
// --- end generated ---------------------------------------------------------

export const Illustration = forwardRef<SVGSVGElement, IllustrationProps>(
  ({ name, colour, className, ...props }, ref) => {
    const shape = name === 'grapes' && colour === 'outline' ? GRAPES_OUTLINE : SHAPES[name];
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${shape.width} ${shape.height}`}
        width={shape.width}
        height={shape.height}
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={clsx('block h-auto shrink-0', COLOUR_CLASS[colour ?? DEFAULT_COLOUR[name]], className)}
        {...props}
      >
        {shape.body}
      </svg>
    );
  },
);

Illustration.displayName = 'Illustration';
