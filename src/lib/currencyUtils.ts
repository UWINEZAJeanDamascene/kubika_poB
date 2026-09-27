/**
 * Currency Utilities
 * 
 * Provides consistent currency formatting across the application.
 * Always uses company/settings currency instead of defaulting to USD.
 */

import { useCurrency } from '@/contexts/CurrencyContext';
import { formatBaseAmount } from './currencyDisplay';

/**
 * Format currency amount with proper symbol.
 * Amounts are treated as BASE-currency (RWF) values and shown in the
 * sidebar display currency; pass `overrideCurrency` when the amount is
 * denominated in a specific document currency instead.
 */
export function useFormatCurrency() {
  try {
    const { formatCurrency } = useCurrency();

    return (amount: number | any, overrideCurrency?: string): string => {
      const num = typeof amount === 'number' ? amount : Number(amount) || 0;
      // No override: amount is in base currency, convert to display currency.
      return overrideCurrency ? formatCurrency(num, overrideCurrency) : formatCurrency(num);
    };
  } catch (err) {
    // If there's no CurrencyProvider in the tree, provide a safe fallback
    // so pages (like POS) can still render in isolation.
    return (amount: number | any, overrideCurrency?: string): string => {
      const num = typeof amount === 'number' ? amount : Number(amount) || 0;
      const currency = overrideCurrency || 'RWF';
      return formatWithSymbol(num, currency);
    };
  }
}

/**
 * Standalone format currency function (for use outside React components).
 * Without an explicit currency the amount is treated as a base-currency
 * value and shown in the sidebar display currency; with a currency it is
 * formatted as-is in that currency (no conversion).
 */
export function formatCurrency(
  amount: number | any,
  currency?: string
): string {
  let num = typeof amount === 'number' ? amount : Number(amount) || 0;
  if (isNaN(num)) num = 0;
  if (!currency) {
    return formatBaseAmount(num);
  }
  if (currency === 'RWF' || currency === 'FRW') {
    return `RWF ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(num);
}

/**
 * Format currency with document-specific currency code
 * Use this when you have a document with its own currency (e.g., invoice, credit note)
 */
export function formatDocumentCurrency(
  amount: number | any,
  documentCurrencyCode?: string,
  overrideCurrency?: string
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const currency = overrideCurrency || documentCurrencyCode || 'RWF';
  if (currency === 'RWF' || currency === 'FRW') {
    return `RWF ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)}`;
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(num);
}

/**
 * Parse money from plain numbers or localized strings like "RWF 64,900,000",
 * "$1,250.50", "1 234,56", or "25000.00".
 */
export function parseCurrencyValue(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value).trim();
  if (!text) return 0;

  const sanitized = text
    .replace(/\s+/g, '')
    .replace(/[A-Za-z]/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!sanitized || sanitized === '-' || sanitized === '.' || sanitized === ',') return 0;

  let normalized = sanitized;

  if (normalized.includes(',') && normalized.includes('.')) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '');
    normalized = normalized.replace(decimalSeparator, '.');
  } else if (normalized.includes(',')) {
    const commaParts = normalized.split(',');
    const lastPart = commaParts[commaParts.length - 1];
    if (commaParts.length > 1 && lastPart.length === 3 && commaParts.slice(0, -1).every((part) => part.length <= 3)) {
      normalized = commaParts.join('');
    } else {
      normalized = normalized.replace(/,/g, '.');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RWF: 'RWF',
  LBP: 'ل.ل',
  SAR: 'ر.س',
  AED: 'د.إ',
  TZS: 'TSh',
  UGX: 'USh',
  KES: 'KSh',
  BIF: 'FBu',
  ZMW: 'ZK',
  MWK: 'MK',
  AOA: 'Kz'
};

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Format amount with currency symbol only (no ISO code)
 */
export function formatWithSymbol(
  amount: number | any,
  currency: string = 'RWF'
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const symbol = getCurrencySymbol(currency);
  const isWholeFranc = currency === 'RWF' || currency === 'FRW';
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: isWholeFranc ? 0 : 2,
    maximumFractionDigits: isWholeFranc ? 0 : 2
  });
  return `${symbol} ${formatted}`;
}
