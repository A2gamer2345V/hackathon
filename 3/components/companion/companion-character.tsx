'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import type { CompanionState } from '@/lib/providers/companion-provider';

/**
 * "Mira", the Care Companion.
 *
 * Drawn entirely as inline SVG — no remote image, no sprite sheet — so the
 * character renders offline, scales to any size and can be recoloured by the
 * theme. Each companion state changes the face and pose rather than swapping an
 * asset, which keeps the file small and the expressions consistent.
 *
 * Motion is deliberately slow and small: a gentle float, a blink, a soft wave.
 * Everything stops when reduced motion is requested.
 */

interface Props {
  state?: CompanionState;
  size?: number;
  className?: string;
  /** Decorative by default; the caption text carries the meaning. */
  title?: string;
}

export function CompanionCharacter({ state = 'idle', size = 88, className, title }: Props) {
  const motionOk = useMotionOk();

  const float = motionOk
    ? { y: [0, -3.5, 0], transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const } }
    : undefined;

  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0 overflow-visible', className)}
      animate={float}
    >
      <defs>
        <clipPath id="mira-body-clip">
          <path d="M60 16c20.4 0 33 14.6 33 37.5S80.4 104 60 104 27 76.4 27 53.5 39.6 16 60 16Z" />
        </clipPath>
      </defs>

      {/* soft shadow on the ground */}
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="var(--ink)" opacity="0.07" />

      {/* leaf sprout — echoes the sprout in the ElderEase wordmark */}
      <g>
        <path
          d="M60 20V10"
          stroke="var(--sage-600)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <motion.path
          d="M60 11c0-4.4 3.6-8 8-8 0 4.4-3.6 8-8 8Z"
          fill="var(--sage-400)"
          animate={
            motionOk
              ? { rotate: [0, 6, 0], transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }
              : undefined
          }
          style={{ originX: '60px', originY: '11px' }}
        />
      </g>

      {/* body */}
      <path
        d="M60 16c20.4 0 33 14.6 33 37.5S80.4 104 60 104 27 76.4 27 53.5 39.6 16 60 16Z"
        fill="var(--sage-300)"
      />
      <g clipPath="url(#mira-body-clip)">
        {/* cream apron */}
        <ellipse cx="60" cy="78" rx="27" ry="30" fill="var(--surface)" opacity="0.95" />
        {/* small heart on the apron */}
        <path
          d="M60 82.5c-4.6-3.2-7-5.6-7-8.4a3.6 3.6 0 0 1 7-1.4 3.6 3.6 0 0 1 7 1.4c0 2.8-2.4 5.2-7 8.4Z"
          fill="var(--rose-300)"
        />
      </g>

      {/* cheeks */}
      <ellipse cx="42" cy="60" rx="6" ry="4" fill="var(--rose-300)" opacity="0.55" />
      <ellipse cx="78" cy="60" rx="6" ry="4" fill="var(--rose-300)" opacity="0.55" />

      <Face state={state} motionOk={motionOk} />
      <Arms state={state} motionOk={motionOk} />
      <StateDecor state={state} motionOk={motionOk} />
    </motion.svg>
  );
}

// ------------------------------------------------------------------- face

function Face({ state, motionOk }: { state: CompanionState; motionOk: boolean }) {
  const happyEyes = state === 'encouraging';
  const lookUp = state === 'thinking';
  const wide = state === 'listening';

  const eyeY = lookUp ? 46 : 50;
  const pupilShift = lookUp ? -2 : 0;

  return (
    <g>
      {happyEyes ? (
        <>
          <path
            d="M40 51c2.4-3.4 7.6-3.4 10 0"
            stroke="var(--ink)"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M70 51c2.4-3.4 7.6-3.4 10 0"
            stroke="var(--ink)"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <Eye cx={45} cy={eyeY} wide={wide} shift={pupilShift} motionOk={motionOk} />
          <Eye cx={75} cy={eyeY} wide={wide} shift={pupilShift} motionOk={motionOk} delay={0.08} />
        </>
      )}

      <Mouth state={state} motionOk={motionOk} />
    </g>
  );
}

function Eye({
  cx,
  cy,
  wide,
  shift,
  motionOk,
  delay = 0,
}: {
  cx: number;
  cy: number;
  wide: boolean;
  shift: number;
  motionOk: boolean;
  delay?: number;
}) {
  const r = wide ? 6.4 : 5.6;
  return (
    <g>
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={r}
        fill="var(--ink)"
        animate={
          motionOk
            ? {
                scaleY: [1, 1, 0.1, 1],
                transition: { duration: 4.6, times: [0, 0.9, 0.94, 1], repeat: Infinity, delay },
              }
            : undefined
        }
        style={{ originX: `${cx}px`, originY: `${cy}px` }}
      />
      <circle cx={cx + 2} cy={cy - 2 + shift} r="1.9" fill="var(--surface)" opacity="0.9" />
    </g>
  );
}

function Mouth({ state, motionOk }: { state: CompanionState; motionOk: boolean }) {
  if (state === 'listening') {
    return <ellipse cx="60" cy="68" rx="4.2" ry="5" fill="var(--ink)" opacity="0.85" />;
  }

  if (state === 'speaking') {
    return (
      <motion.ellipse
        cx="60"
        cy="68"
        rx="5.5"
        ry="4.4"
        fill="var(--ink)"
        opacity="0.85"
        animate={
          motionOk
            ? { scaleY: [0.45, 1, 0.6, 1, 0.45], transition: { duration: 0.9, repeat: Infinity } }
            : undefined
        }
        style={{ originX: '60px', originY: '68px' }}
      />
    );
  }

  if (state === 'encouraging') {
    return (
      <path
        d="M50 65c3 6.4 17 6.4 20 0"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (state === 'thinking') {
    return (
      <path
        d="M54 68h9"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  // idle, pointing, help
  return (
    <path
      d="M53 66c2.4 4.2 11.6 4.2 14 0"
      stroke="var(--ink)"
      strokeWidth="3.2"
      strokeLinecap="round"
      fill="none"
    />
  );
}

// ------------------------------------------------------------------- arms

function Arms({ state, motionOk }: { state: CompanionState; motionOk: boolean }) {
  const pointing = state === 'pointing';

  return (
    <g>
      {/* left arm — waves hello when encouraging */}
      <motion.path
        d="M31 66c-6 2-9 6-9 11"
        stroke="var(--sage-400)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        animate={
          motionOk && state === 'encouraging'
            ? { rotate: [0, -18, 6, -18, 0], transition: { duration: 1.8, repeat: Infinity } }
            : undefined
        }
        style={{ originX: '31px', originY: '66px' }}
      />

      {/* right arm — extends to point at the highlighted control */}
      <motion.path
        d={pointing ? 'M89 66c8-1 13 2 17 6' : 'M89 66c6 2 9 6 9 11'}
        stroke="var(--sage-400)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        animate={
          motionOk && pointing
            ? { x: [0, 3, 0], transition: { duration: 1.1, repeat: Infinity } }
            : undefined
        }
      />
    </g>
  );
}

// ------------------------------------------------------------------ decor

function StateDecor({ state, motionOk }: { state: CompanionState; motionOk: boolean }) {
  if (state === 'listening') {
    return (
      <g aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.rect
            key={i}
            x={100 + i * 6}
            y={44}
            width="3.5"
            height="18"
            rx="1.75"
            fill="var(--lilac-400)"
            animate={
              motionOk
                ? {
                    scaleY: [0.35, 1, 0.35],
                    transition: { duration: 0.85, repeat: Infinity, delay: i * 0.13 },
                  }
                : undefined
            }
            style={{ originX: `${101.75 + i * 6}px`, originY: '53px' }}
          />
        ))}
      </g>
    );
  }

  if (state === 'thinking') {
    return (
      <g aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={92 + i * 8}
            cy={26 - i * 5}
            r={2 + i * 0.9}
            fill="var(--lilac-300)"
            animate={
              motionOk
                ? {
                    opacity: [0.25, 1, 0.25],
                    transition: { duration: 1.5, repeat: Infinity, delay: i * 0.22 },
                  }
                : undefined
            }
          />
        ))}
      </g>
    );
  }

  if (state === 'help') {
    return (
      <g aria-hidden>
        <circle cx="97" cy="24" r="13" fill="var(--lilac-100)" stroke="var(--lilac-300)" strokeWidth="2" />
        <text
          x="97"
          y="30"
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill="var(--lilac-600)"
          fontFamily="var(--font-sans)"
        >
          ?
        </text>
      </g>
    );
  }

  if (state === 'encouraging') {
    return (
      <g aria-hidden>
        {[
          { x: 96, y: 30, s: 1 },
          { x: 24, y: 34, s: 0.75 },
          { x: 104, y: 56, s: 0.6 },
        ].map((sp, i) => (
          <motion.path
            key={i}
            d={`M${sp.x} ${sp.y - 6 * sp.s}c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6Z`}
            fill="var(--sun-300)"
            animate={
              motionOk
                ? {
                    opacity: [0, 1, 0],
                    scale: [0.6, 1, 0.6],
                    transition: { duration: 1.7, repeat: Infinity, delay: i * 0.3 },
                  }
                : undefined
            }
            style={{ originX: `${sp.x}px`, originY: `${sp.y}px` }}
          />
        ))}
      </g>
    );
  }

  return null;
}
