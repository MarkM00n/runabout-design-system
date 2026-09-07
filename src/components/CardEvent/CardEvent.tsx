import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

import { Button } from '../Button';

export type CardTitleLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type CardSurface = 'cream' | 'olive' | 'dark' | 'terracotta';

export interface CardEventProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
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
  /** Figma's `Show Image` boolean. */
  imageSrc?: string;
  imageAlt?: string;
  /** Heading tag for the title. Figma: "the card does not own its heading
   * level" — the caller picks what's correct for the page's outline. Visual
   * size stays text-h3 regardless of the tag chosen. */
  titleLevel?: CardTitleLevel;
  /**
   * Which surface this card is. Cards are surfaces, so under the 2026-09-07
   * rule ("anything with a background owns a mode, everything else
   * inherits") the card must declare one — but which one is the instance's
   * call, not the component's: Figma's own guidance is On Cream on a dark
   * section, On Terracotta on a cream page. Defaults to `terracotta`, the
   * appearance the previous hardcoded `data-mode="feature"` produced, so
   * existing usages keep rendering as they did.
   */
  surface?: CardSurface;
}

/**
 * Source: Figma `Card/Event` (376:586) — renamed from `cards` in the
 * 2026-09-07 sync, alongside sibling masters Card/Quote and Card/Producer.
 *
 * The card fills with `surface-section`, whose value resolves from the
 * card's own `data-mode`. That replaces the old fixed `surface-feature`
 * fill plus hardcoded `data-mode="feature"`: the fill is no longer one
 * pinned terracotta, it's whichever surface the instance says it is, and
 * every text/border token nested inside resolves to that surface's column
 * automatically.
 */
export const CardEvent = forwardRef<HTMLDivElement, CardEventProps>(
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
      surface = 'terracotta',
      className,
      ...props
    },
    ref,
  ) => {
    const TitleTag = titleLevel;

    const content = (
      <>
        {/* 280px, matching Figma's 528x280 image frame inside a 624px card.
            Arbitrary px because Tailwind's h-70 equivalent is rem-based and
            would scale off this app's 18px root font-size. */}
        <div className="h-[280px] w-full overflow-hidden rounded-md bg-border-subtle">
          {imageSrc ? (
            <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="flex flex-col gap-01">
          {/* font-normal and tracking-normal are stated explicitly, not
              inherited: the --text-* tokens deliberately don't encode weight
              (see tokens.css), and src/index.css's app-shell base layer sets
              a 500 weight and -0.24px tracking on bare h1/h2 — which this
              heading becomes whenever a caller passes titleLevel="h2". */}
          <TitleTag className="font-recoleta font-normal tracking-normal text-h3 text-text-primary m-0">
            {title}
          </TitleTag>

          <div className="flex items-center gap-02">
            <span className="font-manrope text-paragraph-small text-text-primary">{date}</span>
            <span className="h-[1px] w-[24px] bg-border-default" aria-hidden="true" />
            <span className="font-manrope text-paragraph-small text-text-primary">{time}</span>
          </div>

          <p className="font-manrope text-paragraph-small text-text-primary m-0">{description}</p>
        </div>
      </>
    );

    return (
      <div
        ref={ref}
        data-mode={surface}
        className={clsx(
          'flex flex-col p-06 gap-04 rounded-xl bg-surface-section',
          // Figma's State=Focus strokes the CARD ROOT with 2px state-focus at
          // the card's own bounds — not the 2px-offset overlay ring every
          // other control uses (rules §2). Card/Event genuinely differs here,
          // checked directly rather than assumed from its siblings (rules §4),
          // so the ring is drawn on the root with no offset.
          //
          // Focus still LIVES on the inner button (that's the element that
          // actually receives focus and the only one that should), so this is
          // scoped to that element via data-card-target rather than a bare
          // has-[:focus-visible] — otherwise tabbing to the CTA would ring the
          // whole card too, which Figma's Focus variant doesn't depict.
          'has-[[data-card-target]:focus-visible]:outline has-[[data-card-target]:focus-visible]:outline-2',
          'has-[[data-card-target]:focus-visible]:outline-offset-0 has-[[data-card-target]:focus-visible]:outline-state-focus',
          className,
        )}
        {...props}
      >
        {onCardClick ? (
          <button
            type="button"
            data-card-target=""
            onClick={onCardClick}
            // No outline-none and no outline utility of its own: the ring is
            // drawn by the root above. focus-visible still lands here, which
            // is what the root's has-[] selector keys off.
            className="flex flex-col gap-04 w-full text-left bg-transparent border-0 p-0"
          >
            {content}
          </button>
        ) : (
          <div className="flex flex-col gap-04">{content}</div>
        )}

        {/* self-start: Figma hugs the CTA to its content width, the flex
            column's default align-items:stretch would otherwise fill it. */}
        <Button variant="secondary" size="large" onClick={onCtaClick} className="self-start">
          {ctaLabel}
        </Button>
      </div>
    );
  },
);

CardEvent.displayName = 'CardEvent';
