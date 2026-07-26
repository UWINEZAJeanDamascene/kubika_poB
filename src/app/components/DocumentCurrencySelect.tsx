import { useEffect, useState } from "react";
import { exchangeRatesApi } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AlertTriangle, Coins } from "lucide-react";

interface DocumentCurrencySelectProps {
  /** Selected ISO 4217 code (kept for compatibility; the sidebar selection wins) */
  value?: string;
  /**
   * Called with the applied code and the rate to base currency
   * (units of base per 1 unit of that currency; 1 for base itself,
   * null when no rate is known yet).
   */
  onChange: (currency: string, rateToBase: number | null) => void;
  /** Document/transaction date (YYYY-MM-DD) used for the rate lookup */
  date?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Hide the rate hint and skip rate lookups — for non-transactional contexts
   * (e.g. a supplier's preferred currency or a bank account attribute).
   */
  showRate?: boolean;
}

/**
 * Document currency indicator (invoices, quotations, POs, expenses, POS).
 * The currency is no longer picked per document: it follows the display
 * currency chosen in the sidebar selector. This component shows which
 * currency applies, resolves the exchange rate for the document date via
 * the shared backend CurrencyService, pushes both into the form through
 * `onChange`, and warns when the rate is stale or missing. Amounts in a
 * non-base currency are converted to base at posting time — statutory
 * reporting always stays in base (RWF).
 */
export default function DocumentCurrencySelect({
  onChange,
  date,
  className,
  showRate = true,
}: DocumentCurrencySelectProps) {
  const { currencies, baseCurrency, displayCurrency, latestRates } = useCurrency();
  const [rateInfo, setRateInfo] = useState<{ rate: number | null; stale: boolean } | null>(null);

  const isBase = !displayCurrency || displayCurrency === baseCurrency;
  const info = currencies.find((c) => c.code === displayCurrency);

  // Apply the sidebar currency to the form and resolve its rate for the document date.
  useEffect(() => {
    let cancelled = false;

    if (isBase) {
      setRateInfo(null);
      onChange(baseCurrency, 1);
      return;
    }

    const latest = latestRates.find((r) => r.currency === displayCurrency);

    if (!showRate) {
      setRateInfo(null);
      onChange(displayCurrency, latest?.rate ?? null);
      return;
    }

    const resolve = async () => {
      try {
        const res = await exchangeRatesApi.getCurrentRate(displayCurrency, date);
        if (!cancelled && res.success) {
          setRateInfo({ rate: res.data.rate, stale: latest?.stale ?? false });
          onChange(displayCurrency, res.data.rate);
          return;
        }
      } catch {
        // no rate for that date — fall back to latest known (flagged stale)
      }
      if (!cancelled) {
        const fallback = latest?.rate ?? null;
        setRateInfo({ rate: fallback, stale: true });
        onChange(displayCurrency, fallback);
      }
    };
    resolve();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency, date, baseCurrency, showRate, latestRates]);

  return (
    <div className={className}>
      <div className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        <span className="truncate">
          {displayCurrency}
          {info?.name ? ` — ${info.name}` : ""}
          {isBase ? " (base)" : ""}
        </span>
        <Coins className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Follows the sidebar currency selector
      </p>
      {showRate && !isBase && rateInfo && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          {rateInfo.rate != null ? (
            <>
              1 {displayCurrency} = {rateInfo.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {baseCurrency}
              {rateInfo.stale && (
                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> stale rate
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> No {displayCurrency}/{baseCurrency} rate — add one in Currency Settings
            </span>
          )}
        </p>
      )}
    </div>
  );
}
