'use client';

import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const CONTROL =
  'w-full rounded-[var(--radius-control)] border border-line-strong bg-surface-raised px-4 py-3.5 ' +
  'text-lg text-ink placeholder:text-ink-muted/70 shadow-soft transition-colors ' +
  'hover:border-sage-300 focus:border-sage-500 disabled:opacity-60';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
  trailing?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  iconLeft,
  trailing,
  className,
  id,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={fieldId} className="mb-2 block text-base font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {iconLeft ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          >
            {iconLeft}
          </span>
        ) : null}
        <input
          id={fieldId}
          aria-describedby={cn(hintId, errorId) || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL,
            iconLeft ? 'pl-12' : undefined,
            trailing ? 'pr-14' : undefined,
            error && 'border-danger focus:border-danger',
          )}
          {...rest}
        />
        {trailing ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

/**
 * For the few places where a sentence or two is expected — a note about a
 * person, an observation about a week. Same shell as `TextField` so the two
 * never look like they came from different apps.
 */
export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={fieldId} className="mb-2 block text-base font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-describedby={cn(hintId, errorId) || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, 'resize-y', error && 'border-danger focus:border-danger')}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function SelectField({ label, hint, className, id, children, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={fieldId} className="mb-2 block text-base font-semibold text-ink">
        {label}
      </label>
      <select id={fieldId} aria-describedby={hintId} className={cn(CONTROL, 'pr-10')} {...rest}>
        {children}
      </select>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A large, obvious on/off control. Rendered as a real checkbox so keyboard and
 * screen-reader behaviour comes for free.
 */
export function ToggleField({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon?: ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-[var(--radius-control)] border p-4 transition-colors',
        checked ? 'border-sage-300 bg-sage-50' : 'border-line bg-surface-raised hover:bg-sage-50/60',
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full',
            checked ? 'bg-sage-200 text-sage-800' : 'bg-surface-sunken text-ink-muted',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>
        ) : null}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-sage-500',
          checked ? 'border-sage-600 bg-sage-500' : 'border-line-strong bg-surface-sunken',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-6 rounded-full bg-white shadow-soft transition-[left] duration-200',
            checked ? 'left-7' : 'left-1',
          )}
        />
      </span>
    </label>
  );
}

/** Large tappable radio cards — used for speech speed, text size, difficulty. */
export function ChoiceGroup<T extends string>({
  legend,
  hint,
  value,
  options,
  onChange,
  columns = 3,
}: {
  legend: string;
  hint?: string;
  value: T;
  options: { value: T; label: string; description?: string; icon?: ReactNode }[];
  onChange: (next: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold text-ink">{legend}</legend>
      {hint ? <p className="mb-3 text-sm text-ink-muted">{hint}</p> : null}
      <div
        className={cn(
          'grid gap-3',
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-3',
          columns === 4 && 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border p-4 transition-colors',
                selected
                  ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-300'
                  : 'border-line bg-surface-raised hover:border-sage-300 hover:bg-sage-50/60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon ? (
                <span aria-hidden className={selected ? 'text-sage-700' : 'text-ink-muted'}>
                  {option.icon}
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{option.label}</span>
                {option.description ? (
                  <span className="block text-sm text-ink-soft">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
