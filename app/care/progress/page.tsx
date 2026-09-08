'use client';

import { useMemo } from 'react';
import { BellRing, CalendarCheck, Gamepad2, Info, LineChart, Printer, Sunrise } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ProgressCard } from '@/components/features/progress-card';
import { WeeklyChart } from '@/components/features/weekly-chart';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { progressService } from '@/lib/services/data';
import { formatLongDate, weekdayShort } from '@/lib/utils/datetime';

/**
 * The caregiver's progress view.
 *
 * Same underlying numbers as the patient's Progress screen, shown with more
 * detail because a caregiver is comparing days. Every figure is a count of app
 * activity; the wording never treats a lower week as a clinical finding.
 */
export default function CaregiverProgressPage() {
  const { t } = useTranslation();
  const { hydrated, patient, reminders } = useAppState();

  const week = useMemo(
    () => (hydrated && patient ? progressService.daily(patient.id, 7) : []),
    [hydrated, patient],
  );

  const totals = useMemo(() => {
    const activities = week.reduce((sum, day) => sum + day.activitiesCompleted, 0);
    const games = week.reduce((sum, day) => sum + day.gamesPlayed, 0);
    const activeDays = week.filter((day) => day.activitiesCompleted > 0).length;
    return { activities, games, activeDays };
  }, [week]);

  const remindersDone = reminders.filter((r) => r.status === 'completed').length;
  const patientName = patient?.name ?? '';

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('caregiver.progressTitle')}
          subtitle={t('caregiver.progressSubtitle')}
          icon={<LineChart className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('caregiver.progressTitle')}
        subtitle={t('caregiver.progressSubtitle')}
        icon={<LineChart className="size-6" />}
        action={<Badge tone="sage">{t('caregiver.reportRange')}</Badge>}
      />

      <div className="space-y-5">
        {/* --------------------------------------------------------- headline */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <ProgressCard
            label={t('caregiver.activitiesDone')}
            value={String(totals.activities)}
            detail={t('caregiver.reportRange')}
            icon={CalendarCheck}
            accent="sage"
          />
          <ProgressCard
            label={t('caregiver.gamesPlayed')}
            value={String(totals.games)}
            detail={t('caregiver.reportRange')}
            icon={Gamepad2}
            accent="sky"
          />
          <ProgressCard
            label={t('caregiver.appOpened')}
            value={t('progress.daysActive', { count: totals.activeDays })}
            icon={Sunrise}
            accent="sun"
          />
          <ProgressCard
            label={t('caregiver.adherence')}
            value={t('caregiver.ofTotal', { done: remindersDone, total: reminders.length })}
            detail={t('caregiver.adherenceWeek')}
            icon={BellRing}
            accent="clay"
          />
        </div>

        {/* ------------------------------------------------------------ chart */}
        <Card>
          <CardHeader title={t('caregiver.perDay')} description={formatLongDate()} />
          <div className="mt-5">
            <WeeklyChart
              data={week.map((day) => ({ date: day.date, value: day.activitiesCompleted }))}
              label={t('caregiver.perDay')}
              unitLabel={t('caregiver.activitiesDone')}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------ day by day */}
        <Card>
          <CardHeader
            title={t('caregiver.activityLog')}
            description={t('caregiver.progressSubtitle')}
          />

          {/* A table, because this is genuinely tabular. It scrolls
              horizontally on a narrow screen rather than squashing. */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">{t('caregiver.activityLog')}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2.5 pr-3 text-sm font-semibold text-ink-soft">
                    {t('caregiver.day')}
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-sm font-semibold text-ink-soft">
                    {t('caregiver.activitiesDone')}
                  </th>
                  <th scope="col" className="py-2.5 pr-3 text-sm font-semibold text-ink-soft">
                    {t('caregiver.gamesPlayed')}
                  </th>
                  <th scope="col" className="py-2.5 text-sm font-semibold text-ink-soft">
                    {t('caregiver.adherence')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...week].reverse().map((day) => (
                  <tr key={day.date} className="border-b border-line/70 last:border-0">
                    <th scope="row" className="py-3 pr-3 font-semibold text-ink">
                      {weekdayShort(day.date)}
                    </th>
                    <td className="py-3 pr-3 text-ink-soft tabular-nums">
                      {day.activitiesCompleted}
                    </td>
                    <td className="py-3 pr-3 text-ink-soft tabular-nums">{day.gamesPlayed}</td>
                    <td className="py-3">
                      <ProgressBar
                        value={Math.round(day.reminderAdherence * 100)}
                        label={`${weekdayShort(day.date)} — ${t('caregiver.adherence')}`}
                        valueText={`${Math.round(day.reminderAdherence * 100)}%`}
                        size="sm"
                        tone="sun"
                        className="max-w-[10rem]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ----------------------------------------------------------- report */}
        <Card tone="sage">
          <CardHeader
            title={t('caregiver.reports')}
            description={t('caregiver.reportIntro')}
            icon={<Printer aria-hidden className="size-6 text-sage-600" />}
          />
          <div className="mt-4 space-y-3">
            <p className="text-base text-ink-soft">
              {t('caregiver.subtitle', { name: patientName })}
            </p>
            {/* The browser's own print dialog is the honest "download": it needs
                no server and produces a real PDF on every platform. */}
            <Button
              variant="secondary"
              size="lg"
              iconLeft={<Printer aria-hidden className="size-5" />}
              onClick={() => window.print()}
            >
              {t('caregiver.printReport')}
            </Button>
          </div>
        </Card>

        <Card tone="sunken">
          <p className="flex items-start gap-3 text-base text-ink-soft">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            {t('caregiver.disclaimer')}
          </p>
        </Card>
      </div>
    </div>
  );
}
