import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface CardProducerProps extends HTMLAttributes<HTMLDivElement> {
  /** Small overline above the name — Figma's sample is "WINE". Rendered as
   * given; the uppercase look comes from the copy, not a text-transform. */
  category: string;
  name: string;
  location?: string;
  imageSrc: string;
  /** Describe the producer, not the photo's composition. Empty string marks
   * the image decorative, which is right when the name below already carries
   * the same information. */
  imageAlt?: string;
}

/**
 * Source: Figma `Card/Producer` (852:1722). Image-first: the photograph is
 * the card's own fill, with a scrim gradient over it and the text sitting on
 * the scrim at the bottom.
 *
 * This is the one card that does NOT take a `surface` prop. Its mode is
 * fixed to On Dark because the text never sits on a surface colour at all —
 * it sits on an 85%-black scrim over an arbitrary photograph, and On Dark is
 * the only column whose text tokens are correct against that regardless of
 * what the photo happens to look like. Figma pins the master the same way.
 */
export const CardProducer = forwardRef<HTMLDivElement, CardProducerProps>(
  ({ category, name, location, imageSrc, imageAlt = '', className, ...props }, ref) => (
    <div
      ref={ref}
      data-mode="dark"
      className={clsx(
        // justify-end pushes the content block to the bottom, matching
        // Figma's MAX primary-axis alignment.
        'relative isolate flex flex-col justify-end overflow-hidden',
        'h-[460px] w-[305px] p-03 rounded-xl',
        className,
      )}
      {...props}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {/* The scrim is a real gradient between two tokens, not an opacity on
          the image: surface-scrim-start (transparent) to surface-scrim-end
          (Neutral/900 at 85%). Figma starts the gradient at 15% down the
          card, which is what the `15%` colour stop reproduces. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-surface-scrim-start from-15% to-surface-scrim-end"
      />

      <div className="flex flex-col gap-01">
        <span className="font-manrope font-semibold text-overline text-text-secondary">
          {category}
        </span>
        <span className="font-recoleta text-h4 text-text-primary">{name}</span>
        {location ? (
          // opacity-50 is a literal, not a token — Figma applies a raw 0.5
          // layer opacity to this node with no variable bound (rules §1).
          <span className="font-manrope text-paragraph-small text-text-secondary opacity-50">
            {location}
          </span>
        ) : null}
      </div>
    </div>
  ),
);

CardProducer.displayName = 'CardProducer';
