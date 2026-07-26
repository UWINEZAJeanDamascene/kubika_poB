/**
 * Module-level snapshot of the sidebar display-currency state.
 *
 * `CurrencyProvider` keeps this in sync so that plain (non-hook) formatting
 * helpers — used by dozens of list pages, dashboards and reports — can convert
 * base-currency (RWF) amounts into whatever currency the user picked in the
 * sidebar selector. Backend aggregates are always denominated in the base
 * currency, so "convert base -> display then format" is the correct default.
 *
 * Pages are remounted (keyed by display currency in `Layout`) whenever the
 * sidebar selection changes, so values formatted through these helpers never
 * go stale on screen.
 */

export interface CurrencyDisplayState {
  baseCurrency: string;
  displayCurrency: string;
  /** Units of base currency per 1 unit of the display currency (null = unknown) */
  rateToBase: number | null;
  symbol: string;
  decimals: number;
}

let state: CurrencyDisplayState = {
  baseCurrency: 'RWF',
  displayCurrency: 'RWF',
  rateToBase: 1,
  symbol: 'RWF',
  decimals: 0,
};

export function setCurrencyDisplayState(next: CurrencyDisplayState): void {
  state = next;
}

export function getCurrencyDisplayState(): CurrencyDisplayState {
  return state;
}

/** Convert a base-currency amount into the sidebar display currency. */
export function convertBaseToDisplay(amount: number): number {
  if (state.displayCurrency === state.baseCurrency) return amount;
  if (!state.rateToBase || state.rateToBase <= 0) return amount;
  return amount / state.rateToBase;
}

/**
 * Format a BASE-currency amount in the sidebar display currency.
 * Falls back to the base currency label when no rate is known.
 */
export function formatBaseAmount(
  value: number | null | undefined,
  opts: { decimals?: number } = {},
): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  const isBase = state.displayCurrency === state.baseCurrency;
  const hasRate = state.rateToBase != null && state.rateToBase > 0;

  const converted = isBase ? num : hasRate ? num / (state.rateToBase as number) : num;
  const symbol = isBase || hasRate ? state.symbol : state.baseCurrency;
  const decimals = opts.decimals ?? state.decimals;

  return `${symbol} ${converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
