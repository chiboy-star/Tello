'use client';

import { RouteErrorBoundary, RouteErrorProps } from '@/components/ui/route-error-boundary';

export default function HomeError(props: RouteErrorProps) {
  return <RouteErrorBoundary {...props} sectionName="Home" />;
}
