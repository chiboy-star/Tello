'use client';

import { useEffect } from 'react';
import { signalAppReady } from '@/components/app-ready';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    signalAppReady();
  }, []);

  return <>{children}</>;
}
