'use client';

import { BellOff, Check, Info, TrendingDown, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/providers/language-provider';
import { useRelativeTime } from '@/lib/hooks/use-relative-time';
import { cn } from '@/lib/utils';
import type { AlertSeverity, CaregiverAlert, CaregiverAlertKind } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

const KIND_ICON: Record<CaregiverAlertKind, LucideIcon> = {
  'activity-change': TrendingDown,
  'missed-medicine': BellOff,
  'low-activity': Info,
};

const KIND_LABEL: Record<CaregiverAlertKind, TranslationKey> = {
  'activity-change': 'caregiver.alert.activityChange',
  'missed-medicine': 'caregiver.alert.missedMedicine',
  'low-activity': 'caregiver.alert.lowActivity',
};

const SEVERITY_LABEL: Record<AlertSeverity, TranslationKey> = {
  info: 'caregiver.severity.info',
  attention: 'caregiver.severity.attention',
};

const SEVERITY_TONE: Record<AlertSeverity, BadgeTone> = {
  info: 'neutral',
  attention: 'warning',
};

/**
 * Notices for the caregiver.
 *
 * Every title describes a change in *app use* — "Activity change detected",
 * never a clinical claim — and the detail line states the observation in plain
 * numbers so the caregiver can judge it themselves. Severity is a word, not
 * just a colour.
 */
export function AlertList({
  alerts,
  onAcknowledge,
  className,
}: {
  alerts: CaregiverAlert[];
  onAcknowledge?: (id: string) => void;
  className?: string;
}) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      {alerts.map((alert) => (
        <li key={alert.id}>
          <AlertRow alert={alert} onAcknowledge={onAcknowledge} />
        </li>
      ))}
    </ul>
  );
}

function AlertRow({
  alert,
  onAcknowledge,
}: {
  alert: CaregiverAlert;
  onAcknowledge?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const relative = useRelativeTime();
  const Icon = KIND_ICON[alert.kind];
  const attention = alert.severity === 'attention' && !alert.acknowledged;

  return (
    <article
      data-surface=""
      className={cn(
        'card rounded-[var(--radius-card)] border p-4 shadow-soft sm:p-5',
        attention ? 'border-sun-300/70 bg-sun-100' : 'border-line bg-surface-raised',
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-[14px]',
            attention ? 'bg-white/70 text-sun-600' : 'bg-surface-sunken text-ink-muted',
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-ink">
            {t(KIND_LABEL[alert.kind])}
          </h3>
          <p className="mt-1 text-base text-ink-soft">{alert.detail}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge
              tone={SEVERITY_TONE[alert.severity]}
              icon={
                alert.severity === 'attention' ? <TriangleAlert className="size-4" /> : undefined
              }
            >
              {t(SEVERITY_LABEL[alert.severity])}
            </Badge>
            {alert.acknowledged ? (
              <Badge tone="success" icon={<Check className="size-4" />}>
                {t('caregiver.alertsSeen')}
              </Badge>
            ) : null}
            <span className="text-sm text-ink-muted">{relative(alert.createdAt)}</span>
          </div>
        </div>
      </div>

      {onAcknowledge && !alert.acknowledged ? (
        <div className="mt-4">
          <Button
            size="md"
            variant="secondary"
            onClick={() => onAcknowledge(alert.id)}
            iconLeft={<Check aria-hidden className="size-5" />}
          >
            {t('caregiver.acknowledge')}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
