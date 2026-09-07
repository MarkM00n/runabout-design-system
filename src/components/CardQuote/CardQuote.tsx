import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export type CardQuoteSurface = 'cream' | 'olive' | 'dark' | 'terracotta';

export interface CardQuoteProps extends HTMLAttributes<HTMLElement> {
  /** The quote itself. Rendered without decorative quote marks — supply them
   * in the string if the design calls for them, as Figma's own sample does. */
  quote: string;
  /** Who said it. Figma's sample includes the em dash; it isn't added here. */
  attribution?: string;
  /**
   * Which surface this card is. Like every card it owns a mode rather than
   * inheriting one. Figma's guidance: On Terracotta on a cream page, On
   * Cream on olive/dark/terracotta.
   */
  surface?: CardQuoteSurface;
}

/**
 * Source: Figma `Card/Quote` (945:1122). A pull quote, not an interactive
 * control — no states, no focus treatment, nothing to tab to.
 *
 * Rendered as <figure>/<blockquote>/<figcaption> rather than divs so the
 * quote and its attribution are related in the accessibility tree, which is
 * the one thing the static Figma frame can't express.
 */
export const CardQuote = forwardRef<HTMLElement, CardQuoteProps>(
  ({ quote, attribution, surface = 'terracotta', className, ...props }, ref) => (
    <figure
      ref={ref}
      data-mode={surface}
      className={clsx(
        'flex flex-col p-03 gap-01 rounded-lg bg-surface-section m-0',
        className,
      )}
      {...props}
    >
      <blockquote className="font-recoleta text-h3 text-text-primary m-0">{quote}</blockquote>
      {attribution ? (
        // opacity-90 is a literal, not a token: Figma applies a raw 0.9 layer
        // opacity to this text node with no variable bound, so it stays
        // literal rather than being mapped onto a token that would claim a
        // relationship the design file doesn't have (rules §1).
        <figcaption className="font-manrope text-caption text-text-secondary opacity-90">
          {attribution}
        </figcaption>
      ) : null}
    </figure>
  ),
);

CardQuote.displayName = 'CardQuote';
