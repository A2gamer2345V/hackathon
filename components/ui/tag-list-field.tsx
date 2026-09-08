'use client';

import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * A short list a caregiver builds one item at a time — areas of difficulty,
 * favourite foods, things to avoid.
 *
 * Free text on purpose. "Remembering names after lunch" is the kind of thing
 * that actually matters and no fixed list would ever contain it. Each entry
 * gets its own remove button rather than hiding behind an edit mode, because
 * these get corrected often.
 */
export function TagListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  /** Caps runaway lists so a caregiver cannot quietly overflow local storage. */
  max = 20,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = hint ? `${inputId}-hint` : undefined;
  const [draft, setDraft] = useState('');

  const full = values.length >= max;

  const add = () => {
    const value = draft.trim();
    if (!value || full) return;
    // Case-insensitive, so "Tea" and "tea" do not both end up in the list.
    if (values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter adds the item instead of submitting the surrounding form, which
    // would otherwise throw away whatever was half-typed.
    if (event.key !== 'Enter') return;
    event.preventDefault();
    add();
  };

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-base font-semibold text-ink">
        {label}
      </label>

      <div className="flex gap-2.5">
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={full}
          aria-describedby={hintId}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-line-strong bg-surface-raised px-4 py-3.5 text-lg text-ink placeholder:text-ink-muted/70 shadow-soft transition-colors hover:border-sage-300 focus:border-sage-500 disabled:opacity-60"
        />
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={add}
          disabled={full || draft.trim().length === 0}
          iconLeft={<Plus aria-hidden className="size-5" />}
        >
          {t('prefs.addItem')}
        </Button>
      </div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}

      {values.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 py-1 pl-3.5 pr-1 text-base font-semibold text-sage-800 ring-1 ring-sage-200">
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((existing) => existing !== value))}
                  aria-label={t('cognitive.removeTag', { label: value })}
                  className="grid size-11 place-items-center rounded-full text-sage-700 hover:bg-sage-200 hover:text-sage-800"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
