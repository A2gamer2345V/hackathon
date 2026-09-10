'use client';

import type { ReactNode } from 'react';
import { LanguageProvider } from './language-provider';
import { AppStateProvider } from './app-state-provider';
import { CompanionProvider } from './companion-provider';
import { NetworkProvider } from './network-provider';

/**
 * Provider order matters: language is read by app state (onboarding writes it),
 * and the companion reads both plus the router.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <LanguageProvider>
        <AppStateProvider>
          <CompanionProvider>{children}</CompanionProvider>
        </AppStateProvider>
      </LanguageProvider>
    </NetworkProvider>
  );
}

export { useLanguage, useTranslation } from './language-provider';
export { useAppState } from './app-state-provider';
export { useCompanion } from './companion-provider';
export { useNetwork } from './network-provider';
