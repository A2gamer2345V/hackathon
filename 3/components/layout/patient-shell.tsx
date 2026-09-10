'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { MobileNavigation } from './mobile-navigation';
import { PATIENT_NAV } from './nav-items';
import { CompanionDock } from '@/components/companion/companion-dock';
import { ReminderAlert } from '@/components/system/reminder-alert';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useRoleGuard } from '@/lib/providers/use-role-guard';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * Patient experience shell: a permanent labelled sidebar from `lg` up, a bottom
 * bar below that, and the companion floating clear of both.
 *
 * Two roles are allowed in here, for different reasons. A patient, obviously. And
 * a caregiver, because "open patient view" is how a caregiver sees what their
 * person sees — they keep their own session throughout, and get a way back out
 * (below) rather than being stranded on screens with no caregiver navigation.
 */
export function PatientShell({ children }: { children: ReactNode }) {
  const { patient, role } = useAppState();
  const { t } = useTranslation();
  useRoleGuard(['patient', 'caregiver']);

  const name = patient?.name ?? t('common.appName');
  const asCaregiver = role === 'caregiver';

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar homeHref="/app" settingsHref="/app/settings" name={name} />

      {/* A caregiver looking through the patient's eyes needs a door back. Without
          it, "open patient view" is a trap: the patient nav has no route to
          /care, so the only exit would be the browser's back button. */}
      {asCaregiver ? (
        <div className="border-b border-sage-300/70 bg-sage-50">
          <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
            <p className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
              <Eye aria-hidden className="size-4 shrink-0 text-sage-700" />
              {t('patients.viewingAs', { name })}
            </p>
            <Link
              href="/care"
              className="ml-auto inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-2 text-sm font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-100"
            >
              {t('patients.backToCaregiver')}
            </Link>
          </div>
        </div>
      ) : null}

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
