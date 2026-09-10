'use client';

import { CalendarCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DailyTimeline } from '@/components/features/daily-timeline';
import { CompanionHint } from '@/components/companion/companion-dock';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';

/**
 * My Day — the whole plan, grouped into morning, afternoon and evening.
 *
 * Each row is one large button that toggles "done", so nothing depends on
 * hitting a small checkbox.
 */
export default function MyDayPage() {
  const { t } = useTranslation();
  const formats = useFormats();
  const { hydrated, activities, toggleActivity } = useAppState();

  const done = activities.filter((activity) => activity.completed).length;
  const total = activities.length;

  return (
    <div className="pb-4">
      <PageHeader
        title={t('myDay.title')}
        subtitle={formats.longDate()}
        icon={<CalendarCheck className="size-6" />}
      />

      {!hydrated ? (
        <LoadingState label={t('state.loading')} rows={4} />
      ) : total === 0 ? (
        <EmptyState
          title={t('myDay.empty')}
          description={t('myDay.emptyDesc')}
          icon={<CalendarCheck className="size-7" />}
        />
      ) : (
        <div className="space-y-5">
          <Card tone={done === total ? 'sage' : 'plain'}>
            <ProgressBar
              value={done}
              max={total}
              label={t('myDay.title')}
              valueText={t('myDay.completedCount', { done, total })}
            />
            {done === total ? (
              <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-sage-800">
                <Sparkles aria-hidden className="size-5" />
                {t('progress.encouragement')}
              </p>
            ) : null}
          </Card>

          <DailyTimeline activities={activities} onToggle={toggleActivity} />

          <CompanionHint text={t('companion.ctx.myDay')} />
        </div>
      )}
    </div>
  );
}
