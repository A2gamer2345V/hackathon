'use client';

import { useMemo } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AlertList } from '@/components/features/alert-list';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * Notices worth a look.
 *
 * Open items first, then the ones already seen. The framing throughout is that
 * these describe *changes in app use* — the strings deliberately say "Activity
 * change detected", never anything that reads as a clinical conclusion.
 */
export default function CaregiverAlertsPage() {
  const { t } = useTranslation();
  const { hydrated, alerts, acknowledgeAlert } = useAppState();

  const { open, seen } = useMemo(() => {
    const byNewest = [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      open: byNewest.filter((alert) => !alert.acknowledged),
      seen: byNewest.filter((alert) => alert.acknowledged),
    };
  }, [alerts]);

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('caregiver.alertsTitle')}
          subtitle={t('caregiver.alertsSubtitle')}
          icon={<TriangleAlert className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('caregiver.alertsTitle')}
        subtitle={t('caregiver.alertsSubtitle')}
        icon={<TriangleAlert className="size-6" />}
        action={
          open.length > 0 ? (
            <Badge tone="warning">{String(open.length)}</Badge>
          ) : (
            <Badge tone="success">{t('caregiver.noMissed')}</Badge>
          )
        }
      />

      <div className="space-y-5">
        <section aria-labelledby="alerts-open">
          <h2
            id="alerts-open"
            className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
          >
            {t('caregiver.alerts')}
          </h2>

          {open.length === 0 ? (
            <EmptyState
              title={t('caregiver.noAlerts')}
              icon={<TriangleAlert className="size-7" />}
            />
          ) : (
            <AlertList alerts={open} onAcknowledge={acknowledgeAlert} />
          )}
        </section>

        {seen.length > 0 ? (
          <section aria-labelledby="alerts-seen">
            <h2
              id="alerts-seen"
              className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
            >
              {t('caregiver.alertsSeen')}
            </h2>
            <AlertList alerts={seen} />
          </section>
        ) : null}

        {/* The most important place for this framing — it sits directly under a
            list of things that look like warnings. */}
        <Card tone="sunken">
          <CardHeader
            title={t('caregiver.alertsSubtitle')}
            icon={<Info aria-hidden className="size-6 text-ink-muted" />}
            titleAs="h2"
          />
          <p className="mt-3 text-base text-ink-soft">{t('caregiver.disclaimer')}</p>
        </Card>
      </div>
    </div>
  );
}
