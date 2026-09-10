'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * One button, several intents. Every variant keeps a minimum 48px hit area and
 * a visible focus ring — important controls are never icon-only unless an
 * `aria-label` is supplied and the icon is large.
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'quiet'
  | 'ai'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-sage-600 text-ink-inverse border border-sage-700 shadow-soft hover:bg-sage-700 active:bg-sage-800',
  secondary:
    'bg-surface-raised text-ink border border-line-strong shadow-soft hover:bg-sage-50 hover:border-sage-300',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-sage-50',
  quiet: 'bg-sage-100 text-sage-800 border border-sage-200 hover:bg-sage-200',
  ai: 'bg-lilac-500 text-ink-inverse border border-lilac-600 shadow-soft hover:bg-lilac-600',
  danger: 'bg-danger-soft text-danger border border-danger/30 hover:bg-danger hover:text-ink-inverse',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-[2.5rem] px-3.5 py-2 text-sm gap-1.5 rounded-[12px]',
  md: 'min-h-[3rem] px-5 py-2.5 text-base gap-2 rounded-[14px]',
  lg: 'min-h-[3.5rem] px-6 py-3 text-lg gap-2.5 rounded-[16px]',
  xl: 'min-h-[4rem] px-8 py-4 text-xl gap-3 rounded-[18px]',
};

const BASE =
  'inline-flex items-center justify-center font-semibold transition-colors duration-150 ' +
  'disabled:opacity-55 disabled:cursor-not-allowed select-none text-center ' +
  'focus-visible:outline-3 focus-visible:outline-offset-3';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    CommonProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    iconLeft,
    iconRight,
    loading,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
});

export interface ButtonLinkProps extends CommonProps {
  href: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  onClick?: () => void;
  prefetch?: boolean;
  'data-companion-target'?: string;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
