import { cn, initials } from '@/lib/utils';

/**
 * A person's picture.
 *
 * When a caregiver has added a photo it is shown as-is (photos are stored as
 * local data URLs, never fetched from the network). When there is no photo we
 * draw one: a calm, warm illustration generated from the person's name, so the
 * same person always looks the same on every screen and in every session.
 *
 * The drawn version is deliberately a friendly illustration rather than a
 * photo-realistic face. Nothing here pretends to be a photograph of a real
 * person, and the initials stay visible so the picture is never the only clue
 * about who this is.
 */

/** Stable small hash — same name, same portrait, on server and client alike. */
function hashOf(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Warm, low-saturation pairs that all keep white text legible. */
const PALETTE = [
  { bg: '#dfeee4', skin: '#e8c39c', hair: '#4a3b32', shirt: '#5c8a6b' },
  { bg: '#e6eef7', skin: '#f0d0ad', hair: '#2f3a45', shirt: '#5b7fa6' },
  { bg: '#f6e9df', skin: '#dfae86', hair: '#5a3f2e', shirt: '#b9744f' },
  { bg: '#efe6f4', skin: '#eac9a6', hair: '#3d3346', shirt: '#7c6a99' },
  { bg: '#fdf0d9', skin: '#e7bc93', hair: '#6b4a2f', shirt: '#c8974a' },
  { bg: '#e4f0f0', skin: '#f2d5b4', hair: '#38403f', shirt: '#4f8c8c' },
];

export function Portrait({
  /** Usually the person's name. Anything stable works. */
  seed,
  /** Shown as initials and used as the accessible description. */
  name,
  /** A local data URL, when the caregiver has added a real photo. */
  photo,
  size = 96,
  /** Set when a caption already names the person, so this is decorative. */
  labelled = true,
  className,
}: {
  seed: string;
  name: string;
  photo?: string | null;
  size?: number;
  labelled?: boolean;
  className?: string;
}) {
  const rounded = 'overflow-hidden rounded-full border-2 border-white shadow-soft';

  if (photo) {
    return (
      // A plain <img>: the source is a local data URL, which next/image cannot
      // optimise and does not need to.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={labelled ? name : ''}
        width={size}
        height={size}
        className={cn(rounded, 'object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const hash = hashOf(seed || name || 'person');
  const colour = PALETTE[hash % PALETTE.length];
  // A few features vary so a group of people does not look like one person
  // repeated: hair height, a fringe or not, glasses or not.
  const hairHeight = 16 + (hash % 3) * 4;
  const fringe = Math.floor(hash / 7) % 2 === 0;
  const glasses = Math.floor(hash / 13) % 3 === 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={labelled ? 'img' : 'presentation'}
      aria-label={labelled ? name : undefined}
      aria-hidden={labelled ? undefined : true}
      className={cn(rounded, className)}
      style={{ width: size, height: size }}
    >
      <rect width="100" height="100" fill={colour.bg} />

      {/* shoulders */}
      <path d="M14 100c0-19 16-30 36-30s36 11 36 30z" fill={colour.shirt} />
      {/* neck */}
      <rect x="43" y="58" width="14" height="16" rx="7" fill={colour.skin} />
      {/* head */}
      <circle cx="50" cy="42" r="21" fill={colour.skin} />
      {/* hair */}
      <path
        d={`M29 42c0-14 9-${hairHeight + 6} 21-${hairHeight + 6}s21 ${hairHeight - 8} 21 ${hairHeight + 6}c0 2-4-6-21-6s-21 8-21 6z`}
        fill={colour.hair}
      />
      {fringe ? <path d="M32 34c6-6 30-6 36 0-6 3-30 3-36 0z" fill={colour.hair} /> : null}

      {/* a calm, friendly face */}
      <circle cx="42" cy="41" r="2.4" fill="#3b3733" />
      <circle cx="58" cy="41" r="2.4" fill="#3b3733" />
      <path
        d="M43 50c2.6 2.6 8.4 2.6 11 0"
        stroke="#3b3733"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {glasses ? (
        <g stroke="#4a4540" strokeWidth="1.8" fill="none" opacity="0.75">
          <circle cx="42" cy="41" r="6.5" />
          <circle cx="58" cy="41" r="6.5" />
          <path d="M48.5 41h3" />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The compact version used in lists and headers, where a 96px illustration
 * would be too heavy. Falls back to initials on a tinted circle.
 */
export function PortraitChip({
  name,
  photo,
  size = 44,
  className,
}: {
  name: string;
  photo?: string | null;
  size?: number;
  className?: string;
}) {
  if (photo) return <Portrait seed={name} name={name} photo={photo} size={size} className={className} />;

  const colour = PALETTE[hashOf(name) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-ink',
        className,
      )}
      style={{ width: size, height: size, background: colour.bg, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
