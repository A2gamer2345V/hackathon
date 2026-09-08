'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  BellRing,
  CalendarCheck,
  CircleAlert,
  Gamepad2,
  Info,
  LineChart,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ProgressCard } from '@/components/features/progress-card';
import { WeeklyChart } from '@/components/features/weekly-chart';
import { DailyTimeline } from '@/components/features/daily-timeline';
import { ReminderCard } from '@/components/features/reminder-card';
import { AlertList } from '@/components/features/alert-list';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useRelativeTime } from '@/lib/hooks/use-relative-time';
import { progressService } from '@/lib/services/data';
import { formatLongDate } from '@/lib/utils/datetime';

/**
 * The caregiver dashboard.
 *
 * Denser than the patient side by design — a caregiver is scanning several
 * things at once. Everything shown describes *app activity*: what was opened,
 * marked done or skipped. None of it is a clinical measure, and the wording
 * stays descriptive throughout.
 */
export default function CaregiverDashboard() {
  const { t } = useTranslation();
  const relative = useRelativeTime();
  const {
    hydrated,
    patient,
    caregiver,
    activities,
    reminders,
    sessions,
    alerts,
    acknowledgeAlert,
  } = useAppState();

  const week = hydrated && patient ? progressService.daily(patient.id, 7) : [];

  const done = activities.filter((a) => a.completed).length;
  const total = activities.length;

  const missed = useMemo(
    () => reminders.filter((r) => r.status === 'missed' || r.status === 'dismissed'),
    [reminders],
  );
  const remindersDone = reminders.filter((r) => r.status === 'completed').length;

  const gamesThisWeek = week.reduce((sum, day) => sum + day.gamesPlayed, 0);
  const openDays = week.filter((day) => day.activitiesCompleted > 0).length;

  const lastSession = useMemo(
    () => [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null,
    [sessions],
  );

  const openAlerts = alerts.filter((alert) => !alert.acknowledged);
  const patientName = patient?.name ?? '';

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('caregiver.dashboard')}
          icon={<LineChart className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={4} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('caregiver.greeting', { name: caregiver?.name ?? '' })}
        subtitle={t('caregiver.subtitle', { name: patientName })}
        icon={<LineChart className="size-6" />}
        action={
          <ButtonLink href="/app" variant="secondary" size="md">
            {t('caregiver.switchToPatient')}
          </ButtonLink>
        }
      />

      <div className="space-y-5">
        {/* ------------------------------------------------------- overview */}
        <Card tone="sage">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sage-700">{formatLongDate()}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                {patientName}
                {patient?.age ? (
                  <span className="ml-2 text-lg font-medium text-ink-soft">{patient.age}</span>
                ) : null}
              </h2>
              <p className="mt-1 text-base text-ink-soft">
                {lastSession
                  ? t('caregiver.lastActive', { time: relative(lastSession.completedAt) })
                  : t('caregiver.noResults')}
              </p>
            </div>

            <div className="w-full max-w-xs">
              <ProgressBar
                value={done}
                max={Math.max(total, 1)}
                label={t('caregiver.completedToday')}
                valueText={t('caregiver.ofTotal', { done, total })}
              />
              <div className="mt-3">
                <ProgressBar
                  value={remindersDone}
                  max={Math.max(reminders.length, 1)}
                  label={t('caregiver.adherence')}
                  valueText={t('caregiver.ofTotal', {
                    done: remindersDone,
                    total: reminders.length,
                  })}
                  tone="sun"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* --------------------------------------------------------- figures */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <ProgressCard
            label={t('caregiver.activitiesDone')}
            value={String(done)}
            detail={t('caregiver.ofTotal', { done, total })}
            icon={CalendarCheck}
            accent="sage"
          />
          <ProgressCard
            label={t('caregiver.gamesPlayed')}
            value={String(gamesThisWeek)}
            detail={t('caregiver.trends')}
            icon={Gamepad2}
            accent="sky"
          />
          <ProgressCard
            label={t('caregiver.appOpened')}
            value={t('progress.daysActive', { count: openDays })}
            icon={Activity}
            accent="clay"
          />
          <ProgressCard
            label={t('caregiver.missedReminders')}
            value={String(missed.length)}
            detail={missed.length === 0 ? t('caregiver.noMissed') : undefined}
            icon={BellRing}
            accent="sun"
          />
        </div>

        {/* ---------------------------------------------------------- alerts */}
        <section aria-labelledby="care-alerts">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="care-alerts"
              className="font-display text-xl font-semibold text-ink sm:text-2xl"
            >
              {t('caregiver.alerts')}
            </h2>
            <Link
              href="/care/alerts"
              className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
            >
              {t('home.viewAll')}
            </Link>
          </div>

          {openAlerts.length === 0 ? (
            <EmptyState
              title={t('caregiver.noAlerts')}
              icon={<TriangleAlert className="size-7" />}
            />
          ) : (
            <AlertList alerts={openAlerts.slice(0, 3)} onAcknowledge={acknowledgeAlert} />
          )}
        </section>

        {/* -------------------------------------------- plan + trend + list */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader
              title={t('caregiver.planToday')}
              description={t('caregiver.planTodayDesc', { name: patientName })}
              action={
                <Link
                  href="/care/activity"
                  className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
                >
                  {t('home.viewAll')}
                </Link>
              }
            />
            <div className="mt-4">
              {total === 0 ? (
                <EmptyState title={t('myDay.empty')} icon={<CalendarCheck className="size-7" />} />
              ) : (
                // Read-only: a caregiver should not tick off things on the
                // patient's behalf, so no `onToggle` is passed.
                <DailyTimeline activities={activities.slice(0, 5)} grouped={false} />
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader title={t('caregiver.trends')} description={formatLongDate()} />
              <div className="mt-5">
                <WeeklyChart
                  data={week.map((day) => ({ date: day.date, value: day.activitiesCompleted }))}
                  label={t('caregiver.perDay')}
                  unitLabel={t('caregiver.activitiesDone')}
                />
              </div>
              <p className="mt-3">
                <Link
                  href="/care/progress"
                  className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
                >
                  {t('caregiver.viewDetails')}
                </Link>
              </p>
            </Card>

            <Card>
              <CardHeader title={t('caregiver.missedReminders')} />
              <div className="mt-4 space-y-2.5">
                {missed.length === 0 ? (
                  <EmptyState
                    title={t('caregiver.noMissed')}
                    icon={<BellRing className="size-7" />}
                  />
                ) : (
                  missed.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} compact />
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ---------------------------------------------------- care circle */}
        <Card>
          <CardHeader
            title={t('caregiver.careCircle')}
            description={t('caregiver.careCircleDesc', { name: patientName })}
            icon={<Users aria-hidden className="size-6 text-sage-600" />}
            action={
              <Link
                href="/care/circle"
                className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
              >
                {t('home.viewAll')}
              </Link>
            }
          />
        </Card>

        {/* ------------------------------------------------------ disclaimer */}
        {/* Required framing: this screen describes app usage, not health. */}
        <Card tone="sunken">
          <p className="flex items-start gap-3 text-base text-ink-soft">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            {t('caregiver.disclaimer')}
          </p>
        </Card>

        {openAlerts.length > 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <CircleAlert aria-hidden className="size-4" />
            <Badge tone="warning">{t('caregiver.severity.attention')}</Badge>
          </p>
        ) : null}
      </div>
    </div>
  );
}
