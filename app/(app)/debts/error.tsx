'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function DebtsError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Debts" />;
}
