import { useCurrency } from '@/contexts/CurrencyContext';
import { RefreshCw } from 'lucide-react';

export default function CurrencySelector() {
  const { 
    displayCurrency, 
    setDisplayCurrency, 
    currencies, 
    loading, 
    error,
    refreshRates,
    rates,
    hasStaleRates,
    getCurrencySymbol
  } = useCurrency();

  if (error) {
    return (
      <div className="text-xs text-red-500 p-2">
        {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-8 text-slate-400 text-xs flex items-center justify-center">{getCurrencySymbol(displayCurrency)}</span>
      <select
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value)}
        className="text-xs bg-transparent border-none text-slate-300 focus:outline-none focus:ring-0 cursor-pointer"
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code} className="bg-slate-800">
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
      
      <button
        onClick={() => refreshRates()}
        disabled={loading}
        className="p-1 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        title="Refresh rates"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      </button>

      {rates && (
        hasStaleRates ? (
          <span className="text-xs text-amber-500 ml-1" title="Some exchange rates are outdated — refresh or update them in Currency Settings">
            !
          </span>
        ) : (
          <span className="text-xs text-slate-500 ml-1" title="Exchange rates up to date">
            ✓
          </span>
        )
      )}
    </div>
  );
}
