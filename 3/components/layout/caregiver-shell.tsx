'use client';

import type { ReactNode } from 'react';
import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { MobileNavigation } from './mobile-navigation';
import { CAREGIVER_NAV } from './nav-items';
import { CareAssistant } from '@/components/care/care-assistant';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useRoleGuard } from '@/lib/providers/use-role-guard';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * Caregiver experience shell. Denser than the patient side — a caregiver is
 * scanning several things at once — but built from the same components.
 *
 * Caregivers only. A patient who reaches one of these URLs is sent to `/app`;
 * the API would refuse them anyway, so rendering the frame would only show
 * panels that can never fill.
 */
export function CaregiverShell({ children }: { children: ReactNode }) {
  const { caregiver, patient } = useAppState();
  const { t } = useTranslation();
  useRoleGuard(['caregiver']);

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
      <CareAssistant />
    </div>
  );
}
