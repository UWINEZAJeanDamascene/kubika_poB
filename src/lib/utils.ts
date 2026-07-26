import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatBaseAmount } from "./currencyDisplay";

// Utility to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting: values are base-currency (RWF) amounts and are shown
// in the currency selected in the sidebar (converted at the latest rate).

export function formatCurrency(value: number | undefined | null): string {
  return formatBaseAmount(value);
}

export function formatCurrencyWithDecimals(value: number | undefined | null): string {
  return formatBaseAmount(value, { decimals: 2 });
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-RW').format(value);
}

// Format large numbers with K, M, B suffixes to prevent overflow in cards
// Examples: 1000 -> 1K, 1000000 -> 1M, 1000000000 -> 1B
export function formatCompactNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

// Date formatting utility
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
