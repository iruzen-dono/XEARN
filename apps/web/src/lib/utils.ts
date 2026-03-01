import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names with Tailwind conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format XOF currency */
export function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

/** Relative time (e.g. "il y a 5 min") */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const d = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return new Date(d).toLocaleDateString('fr-FR');
}
