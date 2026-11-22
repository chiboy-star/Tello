'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function ReportsError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Reports" />;
}
