'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { LanguageSelector } from '@/components/features/language-selector';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/providers/language-provider';

/**
 * Language selection.
 *
 * Every language is offered as a first-class choice. Picking one applies it
 * straight away, so the page itself changes language — the clearest possible
 * preview of what the choice means. That also means the provider's `language`
 * *is* the selection; there is no separate draft state to keep in step.
 */
export default function LanguagePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  return (
    <OnboardingShell step={1} totalSteps={4} backHref="/" width="lg">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t('language.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">{t('language.subtitle')}</p>
      </div>

      <LanguageSelector value={language} onSelect={setLanguage} className="mt-8" />

      <div className="sticky bottom-4 mt-8 flex justify-center">
        <Button
          size="xl"
          onClick={() => router.push('/role')}
          iconRight={<ArrowRight aria-hidden className="size-5" />}
          className="w-full max-w-sm shadow-lift"
        >
          {t('common.continue')}
        </Button>
      </div>
    </OnboardingShell>
  );
}
