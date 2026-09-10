import type { ReactNode } from 'react';
import { PatientShell } from '@/components/layout/patient-shell';

/** Every patient screen shares the same shell, navigation and companion. */
export default function PatientAreaLayout({ children }: { children: ReactNode }) {
  return <PatientShell>{children}</PatientShell>;
}
