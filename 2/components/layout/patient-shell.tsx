'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { MobileNavigation } from './mobile-navigation';
import { PATIENT_NAV } from './nav-items';
import { CompanionDock } from '@/components/companion/companion-dock';
import { ReminderAlert } from '@/components/system/reminder-alert';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * Patient experience shell: a permanent labelled sidebar from `lg` up, a bottom
 * bar below that, and the companion floating clear of both.
 */
export function PatientShell({ children }: { children: ReactNode }) {
  const { hydrated, user, patient } = useAppState();
  const { t } = useTranslation();
  const router = useRouter();

  // The prototype keeps the whole session on the device; if nothing is stored
  // we send the user back to the start rather than showing an empty shell.
  useEffect(() => {
    if (hydrated && !user) router.replace('/');
  }, [hydrated, user, router]);

  const name = patient?.name ?? t('common.appName');

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar homeHref="/app" settingsHref="/app/settings" name={name} />

      <div className="mx-auto flex w-full max-w-[100rem] flex-1 gap-6 px-4 pb-28 pt-5 sm:px-6 lg:pb-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <Sidebar items={PATIENT_NAV} />
          </div>
        </aside>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <ReminderAlert />
          {children}
        </main>
      </div>

      <MobileNavigation items={PATIENT_NAV} />
      <CompanionDock />
    </div>
  );
}
