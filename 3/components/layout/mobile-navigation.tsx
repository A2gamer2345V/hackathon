'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import { isActivePath, type NavItem } from './nav-items';

/**
 * Bottom navigation for small screens: four destinations plus a "More" sheet.
 * Every item keeps its written label — icons alone are not enough.
 */
export function MobileNavigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const motionOk = useMotionOk();
  // The sheet must close when the route changes. Storing the route the sheet was
  // opened on — rather than closing it from an effect — means the close happens
  // during the same render as the navigation, with no extra pass.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const moreOpen = openedOn === pathname;
  const setMoreOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  const primary = items.filter((item) => item.primary).slice(0, 4);
  const rest = items.filter((item) => !item.primary);

  const restActive = rest.some((item) => isActivePath(pathname, item.href, items));

  return (
    <>
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-14px_rgba(36,49,43,0.35)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-2xl items-stretch">
          {primary.map((item) => {
            const active = isActivePath(pathname, item.href, items);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  data-companion-target={item.companionTarget}
                  className={cn(
                    'flex min-h-[4rem] flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors',
                    active ? 'text-sage-700' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 place-items-center rounded-full',
                      active && 'bg-sage-100',
                    )}
                  >
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <span className="text-[0.7rem] font-semibold leading-tight">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}

          {rest.length > 0 ? (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-expanded={moreOpen}
                data-companion-target="nav-more"
                className={cn(
                  'flex min-h-[4rem] w-full flex-col items-center justify-center gap-1 px-1 py-2 transition-colors',
                  restActive ? 'text-sage-700' : 'text-ink-muted hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-full',
                    restActive && 'bg-sage-100',
                  )}
                >
                  <MoreHorizontal aria-hidden className="size-6" />
                </span>
                <span className="text-[0.7rem] font-semibold leading-tight">{t('nav.more')}</span>
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      <AnimatePresence>
        {moreOpen ? (
          <>
            <motion.div
              key="more-scrim"
              className="no-print fixed inset-0 z-40 bg-ink/35 lg:hidden"
              initial={motionOk ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              role="dialog"
              aria-label={t('nav.more')}
              className="no-print fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] border border-line bg-surface-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lift lg:hidden"
              initial={motionOk ? { y: '100%' } : false}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">{t('nav.more')}</h2>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label={t('common.close')}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-sage-100"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-2.5">
                {rest.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href, items);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-companion-target={item.companionTarget}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-[var(--radius-control)] border p-3.5 font-semibold',
                          active
                            ? 'border-sage-300 bg-sage-50 text-sage-800'
                            : 'border-line bg-surface text-ink hover:bg-sage-50',
                        )}
                      >
                        <Icon aria-hidden className="size-6 text-sage-600" />
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
