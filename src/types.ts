export interface Category {
  id: number;
  name: string;
}

export interface StoreItem {
  id: number;
  name: string;
  categoryId: number;
}

export interface Location {
  id: number;
  name: string;
}

export interface Batch {
  id: number;
  itemId: number;
  locationId: number;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  receivedDate: string; // YYYY-MM-DD
}

export interface BatchDisplay extends Batch {
  itemName: string;
  categoryName: string;
  locationName: string;
  daysUntilExpiry: number;
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok';

export function getExpiryStatus(daysUntilExpiry: number): ExpiryStatus {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'critical';
  if (daysUntilExpiry <= 180) return 'warning';
  return 'ok';
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const STATUS_COLORS: Record<ExpiryStatus, string> = {
  expired: '#D32F2F',
  critical: '#F57C00',
  warning: '#FBC02D',
  ok: '#388E3C',
};

export const STATUS_LABELS: Record<ExpiryStatus, string> = {
  expired: 'Просрочено',
  critical: 'Критично (< 30 дней)',
  warning: 'Внимание (1–6 мес)',
  ok: 'Норма (> 6 мес)',
};

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU');
}