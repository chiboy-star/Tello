'use client';

import { useEffect } from 'react';
import { signalAppReady } from '@/components/app-ready';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    signalAppReady();
  }, []);

  return <>{children}</>;
}
