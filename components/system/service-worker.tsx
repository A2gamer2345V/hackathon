'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production only.
 *
 * In development it would sit in front of Turbopack's HMR endpoints and cache
 * things that change every save, so it is skipped — and any worker left over
 * from a production build on the same origin is unregistered, which saves a
 * confusing stale-page hunt later.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      });
      return;
    }

    // After load, so registration never competes with the first paint.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is a bonus; a failure here must not surface to the user.
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
