import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-500';
  if (confidence >= 70) return 'text-yellow-500';
  return 'text-red-500';
}

export function getStatusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    recruiting: 'status-recruiting',
    pending: 'status-pending',
    completed: 'status-completed',
    withdrawn: 'status-withdrawn',
  };
  return statusMap[status.toLowerCase()] || 'status-pending';
}
