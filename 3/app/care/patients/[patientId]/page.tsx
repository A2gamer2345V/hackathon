'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Eye, Info, KeyRound, Mail, Pencil, Trash2, UserRound, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Portrait } from '@/components/features/portrait';
import { STAGE_KEY, STAGE_TONE } from '@/components/features/cognitive';
import { CAREGIVER_NAV } from '@/components/layout/nav-items';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { api, ApiRequestError } from '@/lib/api/client';

/** The other caregiver screens, minus the two that are not about one patient. */
const PATIENT_SCREENS = CAREGIVER_NAV.filter(
  (item) => !['/care/patients', '/care/settings', '/care'].includes(item.href),
);

/**
 * One patient, addressed by id.
 *
 * The point of this route is the check at the top of it. Opening
 * `/care/patients/patient_456` asks the server for that patient; the server
 * answers with them only if the row's `caregiver_id` matches the session's
 * caregiver, and 403s otherwise. So a caregiver who edits somebody else's id into
 * the address bar gets the "not on your list" state, not a screen full of a
 * stranger's records — and that holds however the browser is tampered with,
 * because the decision is not made here.
 *
 * On success the patient becomes the active one, which is what the rest of the
 * caregiver screens read. That is the whole reason a deep link is useful: it is a
 * bookmarkable way of saying "show me this person".
 */
export default function CaregiverPatientPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const router = useRouter();
  const { t } = useTranslation();
  const { hydrated, patients, patient, selectPatient, refreshPatients, removePatient } =
    useAppState();

  const [state, setState] = useState<'checking' | 'ok' | 'denied' | 'error'>('checking');
  const [email, setEmail] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated || !patientId) return;
    let cancelled = false;

    (async () => {
      setState('checking');
      try {
        const { patient: verified, email: loginEmail } = await api.patient(patientId);
        if (cancelled) return;
        setEmail(loginEmail ?? null);
        // A patient the roster has not caught up with yet — created in another
        // tab, most likely. The server has just confirmed they are ours.
        if (!patients.some((p) => p.id === verified.id)) await refreshPatients();
        if (cancelled) return;
        selectPatient(verified.id);
        setState('ok');
      } catch (cause) {
        if (cancelled) return;
        const refused =
          cause instanceof ApiRequestError && (cause.status === 403 || cause.status === 404);
        setState(refused ? 'denied' : 'error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // `patients` deliberately absent: it changes as a consequence of this effect,
    // and re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, patientId, refreshPatients, selectPatient]);

  const person = patient?.id === patientId ? patient : null;

  if (!hydrated || state === 'checking') {
    return (
      <div className="pb-4">
        <LoadingState label={t('patients.checking')} rows={2} />
      </div>
    );
  }

  if (state !== 'ok' || !person) {
    return (
      <div className="pb-4">
        <EmptyState
          icon={<Users className="size-7" />}
          title={state === 'error' ? t('state.errorTitle') : t('patients.notFound')}
          description={state === 'error' ? t('state.errorDesc') : t('patients.notFoundDesc')}
          action={
            <Button size="lg" onClick={() => router.push('/care/patients')}>
              {t('patients.backToList')}
            </Button>
          }
        />
      </div>
    );
  }

  const remove = async () => {
    setBusy(true);
    try {
      await removePatient(person.id);
      router.push('/care/patients');
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="pb-4">
      <Link
        href="/care/patients"
        className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-2 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
      >
        {t('patients.backToList')}
      </Link>

      <PageHeader
        title={person.name}
        subtitle={t('patients.detailSubtitle')}
        icon={<UserRound className="size-6" />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- who they are */}
        <Card>
          <div className="flex items-start gap-4">
            <Portrait
              seed={person.avatarSeed}
              name={person.name}
              photo={person.photo}
              size={72}
              labelled={false}
            />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
                {person.name}
              </h2>
              {person.age ? (
                <p className="text-base text-ink-soft">
                  {t('patient.ageYears', { count: person.age })}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Badge tone="sky">{t('patients.viewing')}</Badge>
                <Badge tone={STAGE_TONE[person.cognitive.stage]}>
                  {t(STAGE_KEY[person.cognitive.stage])}
                </Badge>
              </div>
            </div>
          </div>

          {/* The email, because a caregiver hands it over and forgets it. Never a
              password: the server holds a scrypt hash, so there is nothing to show. */}
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-base">
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="flex items-center gap-1.5 text-ink-soft">
                <Mail aria-hidden className="size-4 text-ink-muted" />
                {t('patients.signsInWith')}
              </dt>
              <dd className="min-w-0 break-all font-semibold text-ink">
                {email ?? t('patients.noLogin')}
              </dd>
            </div>
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0" />
              {email ? t('patients.passwordNeverShown') : t('patients.noLoginDesc')}
            </p>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              size="md"
              variant="secondary"
              onClick={() => router.push('/care/profile')}
              iconLeft={<Pencil aria-hidden className="size-5" />}
            >
              {t('patients.edit')}
            </Button>
            {patients.length > 1 ? (
              <Button
                size="md"
                variant="ghost"
                onClick={() => setConfirming(true)}
                iconLeft={<Trash2 aria-hidden className="size-5" />}
                className="text-danger hover:bg-danger-soft"
              >
                {t('patients.remove')}
              </Button>
            ) : null}
          </div>

          {confirming ? (
            <div
              role="group"
              aria-label={t('patients.removeConfirm', { name: person.name })}
              className="mt-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft/40 p-4"
            >
              <p className="text-base font-semibold text-ink">
                {t('patients.removeConfirm', { name: person.name })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <Button size="md" variant="danger" disabled={busy} onClick={() => void remove()}>
                  {busy
                    ? t('patients.removing', { name: person.name })
                    : t('patients.removeAction', { name: person.name })}
                </Button>
                <Button
                  size="md"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <div className="space-y-5">
          {/* --------------------------------------------------- patient view */}
          <Card tone="sage">
            <div className="flex items-start gap-3">
              <Eye aria-hidden className="mt-0.5 size-6 shrink-0 text-sage-600" />
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
                  {t('patients.openView')}
                </h2>
                <p className="mt-1 text-base text-ink-soft">
                  {t('patients.openViewDesc', { name: person.name })}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button size="lg" onClick={() => router.push('/app')}>
                {t('patients.openView')}
              </Button>
            </div>
          </Card>

          {/* Every caregiver screen reads the active patient, so these are just
              links — no per-patient duplicates of screens that already exist. */}
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
              {t('patients.jumpTo')}
            </h2>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {PATIENT_SCREENS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-[3.25rem] items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface-sunken px-4 font-semibold text-ink hover:bg-sage-50"
                    >
                      <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card tone="sunken">
            <p className="flex items-start gap-3 text-base text-ink-soft">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              {t('patients.linkNote')}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
