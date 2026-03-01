'use client';

import { cn } from '@/lib/utils';

type SkeletonProps = {
  className?: string;
  lines?: number;
  /** Circle variant for avatars */
  circle?: boolean;
};

export default function Skeleton({ className, lines = 1, circle }: SkeletonProps) {
  if (circle) {
    return <div className={cn('skeleton rounded-full w-10 h-10', className)} />;
  }

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton h-4',
              i === lines - 1 ? 'w-2/3' : 'w-full',
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return <div className={cn('skeleton h-4 w-full', className)} />;
}

/** Full-page skeleton with header, stat cards & table */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card space-y-3 p-0">
        <div className="px-4 pt-4"><Skeleton className="h-6 w-40" /></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-dark-700/20 last:border-0">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
