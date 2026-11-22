'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function SettingsError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Settings" />;
}
