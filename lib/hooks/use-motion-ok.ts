'use client';

import { useSyncExternalStore } from 'react';
import { useAppState } from '@/lib/providers/app-state-provider';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

const getSnapshot = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;

// The server cannot know the visitor's setting, so it assumes motion is fine and
// the first client render agrees with it. React then re-renders with the real
// value — a frame of animation is a far better trade than a hydration mismatch.
const getServerSnapshot = () => false;

/**
 * True when animation is welcome. Honours both the operating-system setting and
 * the in-app accessibility toggle, so either one alone is enough to calm the UI.
 */
export function useMotionOk(): boolean {
  const systemReduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { accessibility } = useAppState();
  return !systemReduced && !accessibility.reducedMotion;
}
