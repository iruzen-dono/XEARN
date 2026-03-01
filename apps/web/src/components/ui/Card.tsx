'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'hover' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantMap: Record<string, string> = {
  default: 'card',
  hover: 'card-hover',
  glass: 'card-glass',
  gradient: 'card-gradient',
};

const paddingMap: Record<string, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({ children, className, variant = 'default', padding = 'md' }: CardProps) {
  return <div className={cn(variantMap[variant], paddingMap[padding], className)}>{children}</div>;
}

/* ── Convenience sub-components ─────────────── */
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold text-white', className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-dark-400', className)}>{children}</p>;
}
