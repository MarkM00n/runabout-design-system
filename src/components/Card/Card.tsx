import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

import { Button } from '../Button';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  date: string;
  time: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  imageSrc?: string;
  imageAlt?: string;
}

/**
 * Source: Figma `cards/events` component. Several of its layout values
 * (container padding/gap/radius, the date/time row gap, the divider) are not
 * bound to Figma variables — they're implemented here as literal px so they
 * don't silently imply a token relationship the design file doesn't have.
 * The 624/528px widths in Figma were just this instance's canvas size, not a
 * real constraint, so this implementation is fluid-width instead.
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
      imageSrc,
      imageAlt = '',
      className,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={clsx(
        'flex flex-col p-[48px] gap-[32px] rounded-[16px] bg-surface-feature',
        className,
      )}
      {...props}
    >
      <div className="h-[200px] w-full overflow-hidden rounded-[8px] bg-[#d9d9d9]/30">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="flex flex-col gap-01">
        <h3 className="font-recoleta text-h3 text-sand-400 m-0">{title}</h3>

        <div className="flex items-center gap-[16px]">
          <span className="font-manrope text-paragraph-small text-sand-400">{date}</span>
          <span className="h-[1px] w-[24px] bg-[#f8ebda]" aria-hidden="true" />
          <span className="font-manrope text-paragraph-small text-sand-400">{time}</span>
        </div>

        <p className="font-manrope text-paragraph-small text-sand-400 m-0">{description}</p>
      </div>

      {/* self-start: Figma hugs the CTA to its content width (128px), the
          flex column's default align-items:stretch would otherwise fill it */}
      <Button variant="secondary" size="large" onClick={onCtaClick} className="self-start">
        {ctaLabel}
      </Button>
    </div>
  ),
);

Card.displayName = 'Card';
