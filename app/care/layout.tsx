import type { ReactNode } from 'react';
import { CaregiverShell } from '@/components/layout/caregiver-shell';

/** Every caregiver screen shares the same shell and navigation. */
export default function CaregiverAreaLayout({ children }: { children: ReactNode }) {
  return <CaregiverShell>{children}</CaregiverShell>;
}
