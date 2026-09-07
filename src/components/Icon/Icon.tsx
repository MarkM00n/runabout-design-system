import { forwardRef } from 'react';
import type { SVGAttributes } from 'react';
import clsx from 'clsx';

export type IconName = 'instagram' | 'facebook' | 'twitter' | 'calendar';

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  name: IconName;
  /**
   * Accessible name. Omit for a decorative icon — the default — and the svg
   * is hidden from assistive tech entirely. Supply one only when the icon is
   * the sole carrier of meaning (an icon-only link, say); it then renders as
   * `role="img"` with a `<title>`.
   */
  label?: string;
}

/**
 * Source: Figma `Icon/Social/Instagram` (858:1735), `Icon/Social/Facebook`
 * (858:1739), `Icon/Social/Twitter` (858:1743) and `Icon/Calendar`
 * (1101:3386). Path data exported directly from those masters, not redrawn.
 *
 * Every stroke is `currentColor`, so an icon takes its colour from the text
 * around it. In Figma all four bind `text/primary` — the `icon/*` group was
 * retired in the 2026-09-07 sync, and icons now use the matching `text-*`
 * token. Following currentColor rather than hardcoding `text-text-primary`
 * means an icon inside a link or a Button picks up that element's colour
 * instead of fighting it, and still resolves per surface mode either way.
 *
 * The three social icons carry a 0.7 layer opacity in Figma, applied there
 * to the whole component. It's a raw value with no variable bound, so it
 * stays a literal here rather than being mapped onto opacity-disabled, whose
 * meaning is unrelated (rules §1).
 */

const SOCIAL_RING =
  'M16 0.5H20C28.5604 0.5 35.5 7.43959 35.5 16V20C35.5 28.5604 28.5604 35.5 20 35.5H16C7.43959 35.5 0.5 28.5604 0.5 20V16C0.5 7.43959 7.43959 0.5 16 0.5Z';

const GLYPHS: Record<IconName, { viewBox: string; size: string; body: React.ReactNode }> = {
  instagram: {
    viewBox: '0 0 36 36',
    size: 'h-[36px] w-[36px] opacity-70',
    body: (
      <>
        <path d={SOCIAL_RING} stroke="currentColor" />
        <path
          d="M22.125 13.8747H22.1325M14.2493 10.4994H21.7499C23.8212 10.4994 25.5002 12.1785 25.5002 14.2497V21.7503C25.5002 23.8215 23.8212 25.5006 21.7499 25.5006H14.2493C12.1781 25.5006 10.499 23.8215 10.499 21.7503V14.2497C10.499 12.1785 12.1781 10.4994 14.2493 10.4994ZM20.9996 17.5277C21.0922 18.1519 20.9856 18.7894 20.6949 19.3496C20.4043 19.9097 19.9444 20.364 19.3807 20.6477C18.817 20.9314 18.1783 21.0302 17.5552 20.9299C16.9322 20.8296 16.3566 20.5355 15.9104 20.0893C15.4641 19.643 15.17 19.0675 15.0697 18.4444C14.9695 17.8214 15.0682 17.1826 15.3519 16.6189C15.6357 16.0552 16.0899 15.5953 16.65 15.3047C17.2102 15.014 17.8477 14.9074 18.4719 15C19.1087 15.0944 19.6982 15.3911 20.1533 15.8463C20.6085 16.3014 20.9052 16.8909 20.9996 17.5277Z"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </>
    ),
  },
  facebook: {
    viewBox: '0 0 36 36',
    size: 'h-[36px] w-[36px] opacity-70',
    body: (
      <>
        <path d={SOCIAL_RING} stroke="currentColor" />
        <path
          d="M20.2505 10.4994H22.5004V13.4996H20.2505C20.0516 13.4996 19.8609 13.5787 19.7202 13.7193C19.5796 13.86 19.5006 14.0508 19.5006 14.2497V16.4999H22.5004L21.7504 19.5001H19.5006V25.5006H16.5008V19.5001H14.251V16.4999H16.5008V14.2497C16.5008 13.255 16.8959 12.3011 17.5991 11.5978C18.3023 10.8945 19.2561 10.4994 20.2505 10.4994Z"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </>
    ),
  },
  twitter: {
    viewBox: '0 0 36 36',
    size: 'h-[36px] w-[36px] opacity-70',
    body: (
      <>
        <path d={SOCIAL_RING} stroke="currentColor" />
        <path
          d="M24.0001 14.5494C24.9752 13.5744 25.5002 11.9993 25.5002 11.9993C25.5002 11.9993 24.0751 12.8993 23.25 12.8993C20.9999 10.7992 17.3246 12.5993 17.9996 15.7495C15.4494 15.8245 12.8992 14.6994 11.2491 12.7493C9.37393 16.1995 11.2491 20.6247 14.9994 21.7497C13.7993 22.7998 12.1492 23.3248 10.499 23.2498C16.9495 27.525 25.2002 22.0497 24.0001 14.5494Z"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </>
    ),
  },
  calendar: {
    viewBox: '0 0 16 16',
    size: 'h-[16px] w-[16px]',
    body: (
      <>
        <rect x="2.75" y="3.75" width="10.5" height="9.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2.75" y1="5.75" x2="13.25" y2="5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6.25" y1="2.25" x2="6.25" y2="3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11.25" y1="2.25" x2="11.25" y2="3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, label, className, ...props }, ref) => {
    const glyph = GLYPHS[name];
    return (
      <svg
        ref={ref}
        viewBox={glyph.viewBox}
        fill="none"
        // Sizes are arbitrary px, not Tailwind's size-9/size-4 scale — those
        // are rem-based and would scale off this app's 18px root font-size.
        className={clsx('shrink-0', glyph.size, className)}
        {...(label
          ? { role: 'img', 'aria-label': label }
          : { 'aria-hidden': true, focusable: false })}
        {...props}
      >
        {glyph.body}
      </svg>
    );
  },
);

Icon.displayName = 'Icon';
