import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

import { Button } from '../Button';

export type CardTitleLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  date: string;
  time: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  /** Makes the image/title/metadata region one clickable, focusable unit
   * (Figma: "form one clickable unit with a single focus stop"), separate
   * from the CTA button. Omit to keep that region static. */
  onCardClick?: () => void;
  imageSrc?: string;
  imageAlt?: string;
  /** Heading tag for the title. Figma: "the card does not own its heading
   * level" — the caller picks what's correct for the page's outline. Visual
   * size stays text-h3 regardless of the tag chosen. */
  titleLevel?: CardTitleLevel;
}

/**
 * Source: Figma `cards` component set (`State: Default | Focus`). The Focus
 * variant's ring only applies to the clickable image/title/metadata region,
 * not the whole card — it's rendered here via :focus-visible on that
 * region's own element, not a prop-driven variant.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      date,
      time,
      description,
      ctaLabel = 'Book now',
      onCtaClick,
      onCardClick,
      imageSrc,
      imageAlt = '',
      titleLevel = 'h3',
      className,
      ...props
    },
    ref,
  ) => {
    const TitleTag = titleLevel;

    const content = (
      <>
        <div className="h-[200px] w-full overflow-hidden rounded-md bg-alpha-white-10">
          {imageSrc ? (
            <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="flex flex-col gap-01">
          <TitleTag className="font-recoleta text-h3 text-text-inverse m-0">{title}</TitleTag>

          <div className="flex items-center gap-02">
            <span className="font-manrope text-paragraph-small text-text-inverse">{date}</span>
            <span className="h-[1px] w-[24px] bg-border-default" aria-hidden="true" />
            <span className="font-manrope text-paragraph-small text-text-inverse">{time}</span>
          </div>

          <p className="font-manrope text-paragraph-small text-text-inverse m-0">{description}</p>
        </div>
      </>
    );

    return (
      <div
        ref={ref}
        className={clsx('flex flex-col p-06 gap-04 rounded-xl bg-surface-feature', className)}
        {...props}
      >
        {onCardClick ? (
          <button
            type="button"
            onClick={onCardClick}
            className={clsx(
              'flex flex-col gap-04 w-full text-left bg-transparent border-0 p-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'focus-visible:ring-offset-transparent focus-visible:ring-border-focus-on-feature',
            )}
          >
            {content}
          </button>
        ) : (
          <div className="flex flex-col gap-04">{content}</div>
        )}

        {/* self-start: Figma hugs the CTA to its content width (128px), the
            flex column's default align-items:stretch would otherwise fill it */}
        <Button variant="secondary" size="large" onClick={onCtaClick} className="self-start">
          {ctaLabel}
        </Button>
      </div>
    );
  },
);

Card.displayName = 'Card';
