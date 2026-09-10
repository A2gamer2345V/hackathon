'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/providers/language-provider';
import { isActivePath, type NavItem } from './nav-items';

/**
 * Desktop / tablet sidebar. Labels are always visible — icon-only navigation is
 * hard for someone who is unsure what a symbol means.
 */
export function Sidebar({
  items,
  footer,
  density = 'comfortable',
}: {
  items: NavItem[];
  footer?: React.ReactNode;
  density?: 'comfortable' | 'compact';
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1.5">
      <ul className="flex flex-1 flex-col gap-1.5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href, items);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                data-companion-target={item.companionTarget}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius-control)] font-semibold transition-colors',
                  density === 'compact' ? 'px-3 py-2.5 text-base' : 'px-4 py-3.5 text-lg',
                  active
                    ? 'bg-sage-600 text-ink-inverse shadow-soft'
                    : 'text-ink-soft hover:bg-sage-100 hover:text-ink',
                )}
              >
                <Icon aria-hidden className={density === 'compact' ? 'size-5' : 'size-6'} />
                <span className="min-w-0 truncate">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {footer ? <div className="pt-3">{footer}</div> : null}
    </nav>
  );
}
