'use client';

import { useSyncExternalStore } from 'react';
import { formatLongDate } from '@/lib/utils/datetime';

/**
 * Date and clock.
 *
 * The time is read through an external store rather than held in state: the
 * server has no meaningful "now", so it renders nothing, and the first client
 * render agrees with it before the subscription supplies the real value. That
 * keeps the markup consistent without writing state from an effect.
 */

/** Milliseconds, or 0 before any subscriber has started the clock. */
let current = 0;

function subscribe(onStoreChange: () => void) {
  const tick = () => {
    current = Date.now();
    onStoreChange();
  };
  tick();
  const id = window.setInterval(tick, 30_000);
  return () => window.clearInterval(id);
}

const getSnapshot = () => current;
const getServerSnapshot = () => 0;

export function DateTimeDisplay({ className }: { className?: string }) {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!value) {
    return <span className={className} aria-hidden />;
  }

  const now = new Date(value);
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <span className={className}>
      <time dateTime={now.toISOString()}>
        {formatLongDate(now)} · {time}
      </time>
    </span>
  );
}
