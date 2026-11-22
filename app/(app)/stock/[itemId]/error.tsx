'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function StockItemError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Item Details" />;
}
