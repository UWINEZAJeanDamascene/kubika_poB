import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { currenciesApi, exchangeRatesApi, type CurrencyInfo, type LatestExchangeRate } from '@/lib/api';
import { setCurrencyDisplayState } from '@/lib/currencyDisplay';

interface CurrencyContextType {
  baseCurrency: string;
  displayCurrency: string;
  /** Map of currency code -> units of BASE currency per 1 unit of that currency */
  rates: Record<string, number> | null;
  /** Full latest-rate rows including effective date, source and stale flags */
  latestRates: LatestExchangeRate[];
  /** True when any displayed rate is older than the freshness window */
  hasStaleRates: boolean;
  currencies: CurrencyInfo[];
  loading: boolean;
  error: string | null;
  setDisplayCurrency: (currency: string) => void;
  setBaseCurrency: (currency: string) => void;
  refreshRates: () => Promise<void>;
  convertAmount: (amount: number, from?: string) => number;
  formatCurrency: (amount: number, from?: string) => string;
  getCurrencySymbol: (currency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const FALLBACK_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RWF: 'FRw',
  FRW: 'FRw',
  AED: 'د.إ',
  TZS: 'TSh',
  UGX: 'USh',
  KES: 'KSh',
  BIF: 'FBu',
  ZAR: 'R',
  CNY: '¥',
  INR: '₹',
  CDF: 'FC'
};

const DISPLAY_CURRENCY_KEY = 'displayCurrency';

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [baseCurrency, setBaseCurrency] = useState<string>('RWF');
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => localStorage.getItem(DISPLAY_CURRENCY_KEY) || 'RWF'
  );
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [latestRates, setLatestRates] = useState<LatestExchangeRate[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setDisplayCurrency = useCallback((currency: string) => {
    setDisplayCurrencyState(currency);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
    } catch {
      // storage unavailable (private mode) — display currency just won't persist
    }
  }, []);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await currenciesApi.getAll();
        if (res.success) {
          setCurrencies(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch currencies:', err);
      }
    };
    fetchCurrencies();
  }, []);

  const refreshRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exchangeRatesApi.getLatest();
      if (res.success) {
        const rows = res.data.rates || [];
        setLatestRates(rows);
        if (res.data.base_currency) {
          setBaseCurrency(res.data.base_currency);
        }
        const map: Record<string, number> = {};
        for (const row of rows) {
          if (row.rate != null) map[row.currency] = row.rate;
        }
        setRates(map);
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
      setError('Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshRates]);

  /** rate of `code` expressed in base units per 1 unit of `code` (base itself = 1) */
  const rateToBase = useCallback((code: string): number | null => {
    if (code === baseCurrency) return 1;
    const r = rates?.[code];
    return r && r > 0 ? r : null;
  }, [rates, baseCurrency]);

  const convertAmount = useCallback((amount: number, from?: string): number => {
    const sourceCurrency = from || baseCurrency;
    if (sourceCurrency === displayCurrency) return amount;

    const fromRate = rateToBase(sourceCurrency);
    const toRate = rateToBase(displayCurrency);
    if (fromRate == null || toRate == null) return amount;

    const converted = (amount * fromRate) / toRate;
    return Math.round(converted * 100) / 100;
  }, [baseCurrency, displayCurrency, rateToBase]);

  const getCurrencySymbol = useCallback((currency?: string): string => {
    const curr = currency || displayCurrency;
    const known = currencies.find((c) => c.code === curr);
    return known?.symbol || FALLBACK_SYMBOLS[curr] || curr;
  }, [displayCurrency, currencies]);

  const formatCurrency = useCallback((amount: number, from?: string): string => {
    const convertedAmount = convertAmount(amount, from);
    const symbol = getCurrencySymbol(displayCurrency);
    const known = currencies.find((c) => c.code === displayCurrency);
    const decimals = known?.decimal_places ?? (displayCurrency === 'RWF' ? 0 : 2);
    const formatted = convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${symbol} ${formatted}`;
  }, [convertAmount, displayCurrency, currencies, getCurrencySymbol]);

  const hasStaleRates = latestRates.some((r) => r.has_rate && r.stale);

  // Keep the module-level snapshot in sync so plain (non-hook) formatting
  // helpers in lib/utils.ts and lib/currencyUtils.ts can convert base-currency
  // amounts to the sidebar display currency.
  useEffect(() => {
    const known = currencies.find((c) => c.code === displayCurrency);
    setCurrencyDisplayState({
      baseCurrency,
      displayCurrency,
      rateToBase: rateToBase(displayCurrency),
      symbol: known?.symbol || FALLBACK_SYMBOLS[displayCurrency] || displayCurrency,
      decimals: known?.decimal_places ?? (displayCurrency === 'RWF' ? 0 : 2),
    });
  }, [baseCurrency, displayCurrency, rateToBase, currencies]);

  const value: CurrencyContextType = {
    baseCurrency,
    displayCurrency,
    rates,
    latestRates,
    hasStaleRates,
    currencies,
    loading,
    error,
    setDisplayCurrency,
    setBaseCurrency,
    refreshRates,
    convertAmount,
    formatCurrency,
    getCurrencySymbol
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    // Provide a safe fallback so components rendered outside a provider won't crash.
    const fallback: CurrencyContextType = {
      baseCurrency: 'RWF',
      displayCurrency: 'RWF',
      rates: null,
      latestRates: [],
      hasStaleRates: false,
      currencies: [],
      loading: false,
      error: null,
      setDisplayCurrency: () => {},
      setBaseCurrency: () => {},
      refreshRates: async () => {},
      convertAmount: (amount: number) => amount,
      formatCurrency: (amount: number) => {
        const num = typeof amount === 'number' ? amount : Number(amount) || 0;
        const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return `FRw ${formatted}`;
      },
      getCurrencySymbol: (currency?: string) => {
        const curr = currency || 'RWF';
        return FALLBACK_SYMBOLS[curr] || curr;
      }
    };
    return fallback;
  }
  return context;
}

export default CurrencyContext;
