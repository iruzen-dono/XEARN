'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('card-hover group', className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-dark-400">{label}</span>
        <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/15 transition-colors">
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-semibold',
              trend.positive ? 'text-success-400' : 'text-danger-400',
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
