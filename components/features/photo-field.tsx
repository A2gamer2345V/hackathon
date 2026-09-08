'use client';

import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Portrait } from '@/components/features/portrait';
import { useTranslation } from '@/lib/providers/language-provider';
import { ImageError, fileToPortraitDataUrl } from '@/lib/utils/image';
import type { TranslationKey } from '@/lib/i18n';

/**
 * Choose a photo of a person, from the device only.
 *
 * Shared by the family form and the patient profile so there is exactly one
 * image pipeline in the app: read the file, shrink it, keep it as a local data
 * URL. Nothing is uploaded and nothing is fetched from a remote address, so
 * every face in the app is available with no network at all.
 *
 * The shrinking is not cosmetic. Photos are held in local storage, where a write
 * that exceeds the quota fails quietly — a full-size camera photo would look
 * saved and then be gone on the next load.
 */

const PHOTO_ERROR: Record<ImageError['code'], TranslationKey> = {
  type: 'photo.error.type',
  size: 'photo.error.size',
  decode: 'photo.error.decode',
};

export function PhotoField({
  value,
  onChange,
  onBusyChange,
  seed,
  name,
  size = 96,
  chooseLabel,
  replaceLabel,
  removeLabel,
  hint,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  /**
   * Told when a file is being processed, so a form can hold its Save button.
   * Without it, saving mid-decode would quietly drop the photo just chosen.
   */
  onBusyChange?: (busy: boolean) => void;
  /** Keeps the drawn fallback stable for the same person. */
  seed: string;
  /** Used for the fallback illustration's label. */
  name: string;
  size?: number;
  chooseLabel: string;
  replaceLabel: string;
  removeLabel: string;
  hint: string;
}) {
  const { t } = useTranslation();
  const inputId = useId();

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setBusyBoth = (next: boolean) => {
    setBusy(next);
    onBusyChange?.(next);
  };

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input either way, so choosing the same file twice still fires.
    event.target.value = '';
    if (!file) return;

    setError('');
    setBusyBoth(true);
    try {
      onChange(await fileToPortraitDataUrl(file));
    } catch (cause) {
      setError(t(cause instanceof ImageError ? PHOTO_ERROR[cause.code] : 'photo.error.decode'));
    } finally {
      setBusyBoth(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Portrait seed={seed} name={name} photo={value} size={size} labelled={false} />

      <div className="min-w-0 flex-1">
        {/* The input comes first and stays focusable rather than hidden, so the
            control still works from the keyboard and the label — which is what
            people actually see — can show its focus ring. */}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => void pick(event)}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-[3rem] cursor-pointer items-center gap-2 rounded-[14px] border border-line-strong bg-surface-raised px-5 py-2.5 font-semibold text-ink shadow-soft hover:border-sage-300 hover:bg-sage-50 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-sage-500"
        >
          <Camera aria-hidden className="size-5" />
          {busy ? t('photo.busy') : value ? replaceLabel : chooseLabel}
        </label>

        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              onChange(null);
              setError('');
            }}
            iconLeft={<Trash2 aria-hidden className="size-5" />}
            className="ml-2 text-danger hover:bg-danger-soft"
          >
            {removeLabel}
          </Button>
        ) : null}

        <p className="mt-2 text-sm text-ink-muted">{hint}</p>
        {error ? (
          <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
