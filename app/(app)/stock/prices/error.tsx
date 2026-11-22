'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function StockPricesError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Price Review" />;
}
