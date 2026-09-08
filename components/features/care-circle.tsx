'use client';

import { Heart, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { useTranslation } from '@/lib/providers/language-provider';
import { useRelativeTime } from '@/lib/hooks/use-relative-time';
import { cn, initials } from '@/lib/utils';
import type { CareCircleMember, CareCircleRole } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

const ROLE_LABEL: Record<CareCircleRole, TranslationKey> = {
  'primary-caregiver': 'careCircle.role.primary',
  family: 'careCircle.role.family',
  'health-support': 'careCircle.role.health',
};

const ROLE_ICON = {
  'primary-caregiver': ShieldCheck,
  family: Heart,
  'health-support': UserRound,
} as const;

/**
 * The people around the patient.
 *
 * Calling someone is one large button; the phone number is also shown as plain
 * text so it can be dialled from another handset.
 */
export function CareCircle({
  members,
  onContact,
  emptyTitle,
  emptyDescription,
}: {
  members: CareCircleMember[];
  onContact?: (id: string) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { t } = useTranslation();
  const relative = useRelativeTime();

  if (members.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<Heart className="size-7" />}
      />
    );
  }

  return (
    <ul className="grid gap-3.5 sm:grid-cols-2">
      {members.map((member) => {
        const RoleIcon = ROLE_ICON[member.role];
        const primary = member.role === 'primary-caregiver';
        return (
          <li key={member.id}>
            <article
              data-surface=""
              className={cn(
                'card flex h-full flex-col rounded-[var(--radius-card)] border p-5 shadow-soft',
                primary ? 'border-sage-200 bg-sage-50' : 'border-line bg-surface-raised',
              )}
            >
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className={cn(
                    'grid size-14 shrink-0 place-items-center rounded-full font-display text-lg font-semibold',
                    primary ? 'bg-sage-200 text-sage-800' : 'bg-clay-100 text-clay-600',
                  )}
                >
                  {initials(member.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">
                    {member.name}
                  </h3>
                  <p className="text-base text-ink-soft">{member.relation}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={primary ? 'sage' : 'neutral'} icon={<RoleIcon className="size-4" />}>
                      {t(ROLE_LABEL[member.role])}
                    </Badge>
                    <Badge tone={member.status === 'connected' ? 'success' : 'warning'}>
                      {t(
                        member.status === 'connected'
                          ? 'caregiver.status.connected'
                          : 'caregiver.status.pending',
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              {member.phone ? (
                <p className="mt-3.5 text-base text-ink-soft">
                  <span className="font-semibold text-ink">{t('careCircle.phone')}: </span>
                  <span className="tabular-nums">{member.phone}</span>
                </p>
              ) : null}

              {member.lastContactedAt ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {t('careCircle.lastContacted', {
                    time: relative(member.lastContactedAt),
                  })}
                </p>
              ) : null}

              {member.phone ? (
                <div className="mt-auto pt-4">
                  {/* A real `tel:` link, so it dials on a phone and is still
                      readable on a desktop. */}
                  <a
                    href={`tel:${member.phone.replace(/\s+/g, '')}`}
                    onClick={() => onContact?.(member.id)}
                    className={cn(
                      'inline-flex min-h-[3.5rem] w-full items-center justify-center gap-2.5 rounded-[16px]',
                      'border px-6 py-3 text-lg font-semibold shadow-soft transition-colors',
                      'focus-visible:outline-3 focus-visible:outline-offset-3',
                      primary
                        ? 'border-sage-700 bg-sage-600 text-ink-inverse hover:bg-sage-700'
                        : 'border-line-strong bg-surface-raised text-ink hover:bg-sage-50',
                    )}
                  >
                    <Phone aria-hidden className="size-5" />
                    {t('careCircle.call', { name: member.name.split(' ')[0] })}
                  </a>
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
