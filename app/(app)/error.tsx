'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function AppError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} />;
}
