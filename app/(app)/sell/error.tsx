'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function SellError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Sell" />;
}
