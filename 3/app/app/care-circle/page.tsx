'use client';

import { ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CareCircle } from '@/components/features/care-circle';
import { CompanionHint } from '@/components/companion/companion-dock';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/** The patient's view of their care circle: who to call, and nothing else. */
export default function CareCirclePage() {
  const { t } = useTranslation();
  const { hydrated, careCircle, contactMember } = useAppState();

  return (
    <div className="pb-4">
      <PageHeader
        title={t('careCircle.title')}
        subtitle={t('careCircle.subtitle')}
        icon={<Users className="size-6" />}
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

          {/* Plain-language privacy note, as required for a health prototype. */}
          <Card tone="sunken">
            <p className="flex items-start gap-3 text-base text-ink-soft">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              {t('careCircle.privacy')}
            </p>
          </Card>

          <CompanionHint text={t('companion.ctx.careCircle')} />
        </div>
      )}
    </div>
  );
}
