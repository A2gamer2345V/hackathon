import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The ElderEase identity, in two forms.
 *
 * `LogoMark` is a redrawn SVG: a roof cradled by two cupped hands, in the
 * artwork's blue and green. The full illustration has faces and a tagline that
 * turn to mud below about 200px, so anywhere the mark is small — top bar,
 * sidebar, favicon — uses this instead.
 *
 * `LogoArtwork` is the illustration itself, for the welcome and sign-in screens
 * where there is room to read it. Both are local assets: nothing here loads
 * from a remote URL, so the brand still renders offline.
 */

const MARK_SIZE = {
  sm: 'size-9',
  md: 'size-10 sm:size-11',
  lg: 'size-12 sm:size-14',
} as const;

// One step smaller on narrow screens. The header's controls have a fixed width,
// so at 360–390px the wordmark is what has to give — and shrinking it a step
// reads as designed, where clipping it to "ElderEa" reads as broken.
const WORD_SIZE = {
  sm: 'text-base sm:text-lg',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl',
} as const;

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={cn('shrink-0', className)}>
      {/* roof */}
      <path
        d="M6.5 22.5 24 7.5 41.5 22.5"
        stroke="var(--brand-blue)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* chimney */}
      <path
        d="M34.5 18.2V9.8"
        stroke="var(--brand-blue)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* window, four panes — the one detail from the artwork that survives small sizes */}
      <g fill="var(--brand-green)">
        <rect x="19.7" y="15.4" width="3.6" height="3.6" rx="0.9" />
        <rect x="24.7" y="15.4" width="3.6" height="3.6" rx="0.9" />
        <rect x="19.7" y="20.2" width="3.6" height="3.6" rx="0.9" />
        <rect x="24.7" y="20.2" width="3.6" height="3.6" rx="0.9" />
      </g>
      {/* cupped hands */}
      <path
        d="M10.5 26.5c-2.4 7.6 2.2 15 13.5 16.1"
        stroke="var(--brand-blue)"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
      <path
        d="M37.5 26.5c2.4 7.6-2.2 15-13.5 16.1"
        stroke="var(--brand-green)"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  /** Extra classes for the wordmark — used by the header to hide it on tiny screens. */
  wordmarkClassName,
  size = 'md',
}: {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className={cn(
          'grid shrink-0 place-items-center rounded-[14px] bg-surface-raised ring-1 ring-line',
          MARK_SIZE[size],
        )}
      >
        <LogoMark className="size-[86%]" />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            'truncate font-display font-semibold tracking-tight',
            WORD_SIZE[size],
            wordmarkClassName,
          )}
        >
          <span className="text-brand-blue">Elder</span>
          <span className="text-brand-green">Ease</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * The full illustration. Only for surfaces where it renders at 200px or more —
 * below that the couple and the tagline stop being legible and `Logo` is the
 * honest choice.
 */
export function LogoArtwork({
  size = 220,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/elderease-logo.png"
      alt="ElderEase — Care, Support, Better Days"
      width={size}
      height={size}
      priority={priority}
      className={cn('h-auto w-full max-w-full', className)}
      style={{ maxWidth: size }}
      sizes={`${size}px`}
    />
  );
}
