'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function CustomerDebtError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Customer Debt" />;
}
