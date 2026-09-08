'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Network status. Preferences, reminders and progress all live in local
 * storage, so the app keeps working offline — this only drives the honest
 * status message shown to the user.
 */

interface NetworkContextValue {
  online: boolean;
  /** True briefly after coming back online, so the UI can confirm it. */
  justReconnected: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  online: true,
  justReconnected: false,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Assume online for the first paint so server and client markup agree.
  const [online, setOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();

    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      window.setTimeout(() => setJustReconnected(false), 4000);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = useMemo(() => ({ online, justReconnected }), [online, justReconnected]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}
