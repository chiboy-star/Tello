import React from 'react';
import { HomeSkeleton } from './home-skeleton';
import { StockSkeleton } from './stock-skeleton';
import { DebtsSkeleton } from './debts-skeleton';
import { ReportsSkeleton } from './reports-skeleton';
import { SellSkeleton } from './sell-skeleton';
import { StockDetailSkeleton } from './stock-detail-skeleton';
import { DebtsDetailSkeleton } from './debts-detail-skeleton';
import { PricesSkeleton } from './prices-skeleton';

export {
  HomeSkeleton,
  StockSkeleton,
  DebtsSkeleton,
  ReportsSkeleton,
  SellSkeleton,
  StockDetailSkeleton,
  DebtsDetailSkeleton,
  PricesSkeleton,
};

export function getRouteSkeleton(pathname: string): React.ReactElement {
  if (!pathname || pathname === '/home') {
    return <HomeSkeleton />;
  }
  if (pathname === '/sell') {
    return <SellSkeleton />;
  }
  if (pathname === '/stock/prices') {
    return <PricesSkeleton />;
  }
  if (pathname.startsWith('/stock/')) {
    return <StockDetailSkeleton />;
  }
  if (pathname === '/stock') {
    return <StockSkeleton />;
  }
  if (pathname.startsWith('/debts/')) {
    return <DebtsDetailSkeleton />;
  }
  if (pathname === '/debts') {
    return <DebtsSkeleton />;
  }
  if (pathname === '/reports') {
    return <ReportsSkeleton />;
  }
  return <HomeSkeleton />;
}
