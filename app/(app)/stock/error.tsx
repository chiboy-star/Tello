'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function StockError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Stock" />;
}
