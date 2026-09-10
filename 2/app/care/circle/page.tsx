'use client';

import { Heart, Info, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CareCircle } from '@/components/features/care-circle';
import { Card, CardHeader } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * The care circle from the caregiver's side.
 *
 * Same component as the patient's screen — the difference is context: who else
 * can see the patient's activity. Inviting people needs a backend, so the page
 * says so rather than showing a button that cannot work.
 */
export default function CaregiverCirclePage() {
  const { t } = useTranslation();
  const { hydrated, patient, careCircle, contactMember } = useAppState();
  const patientName = patient?.name ?? '';

  return (
    <div className="pb-4">
      <PageHeader
        title={t('caregiver.careCircle')}
        subtitle={t('caregiver.circleSubtitle', { name: patientName })}
        icon={<Heart className="size-6" />}
      />

      {!hydrated ? (
        <LoadingState label={t('state.loading')} rows={2} />
      ) : (
        <div className="space-y-5">
          <CareCircle
            members={careCircle}
            onContact={contactMember}
            emptyTitle={t('careCircle.empty')}
            emptyDescription={t('careCircle.emptyDesc')}
          />

          {/* Honest about the prototype's limits instead of a dead button. */}
          <Card tone="sunken">
            <CardHeader
              title={t('caregiver.addMember')}
              icon={<UserPlus aria-hidden className="size-6 text-ink-muted" />}
            />
            <p className="mt-3 text-base text-ink-soft">{t('caregiver.addMemberNote')}</p>
          </Card>

          <Card tone="sunken">
            <p className="flex items-start gap-3 text-base text-ink-soft">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              {t('careCircle.privacy')}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
