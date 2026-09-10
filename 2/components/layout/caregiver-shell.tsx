'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { MobileNavigation } from './mobile-navigation';
import { CAREGIVER_NAV } from './nav-items';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * Caregiver experience shell. Denser than the patient side — a caregiver is
 * scanning several things at once — but built from the same components.
 */
export function CaregiverShell({ children }: { children: ReactNode }) {
  const { hydrated, user, caregiver, patient } = useAppState();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) router.replace('/');
  }, [hydrated, user, router]);

  const name = caregiver?.name ?? t('common.appName');

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        homeHref="/care"
        settingsHref="/care/settings"
        name={name}
        subtitle={patient ? t('caregiver.subtitle', { name: patient.name }) : undefined}
        compact
      />

      <div className="mx-auto flex w-full max-w-[100rem] flex-1 gap-6 px-4 pb-28 pt-5 sm:px-6 lg:pb-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <Sidebar items={CAREGIVER_NAV} density="compact" />
          </div>
        </aside>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>

      <MobileNavigation items={CAREGIVER_NAV} />
    </div>
  );
}
