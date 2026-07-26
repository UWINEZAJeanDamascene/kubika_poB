import { useState, useEffect, useCallback } from "react";
import {
  currenciesApi,
  exchangeRatesApi,
  type CurrencyInfo,
  type LatestExchangeRate,
  type ExchangeRateDoc,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  RefreshCw,
  Plus,
  Coins,
  TrendingUp,
  AlertTriangle,
  History,
  Pencil,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/CurrencyContext";

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-slate-400">-</span>;
  const styles: Record<string, string> = {
    api: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    manual: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    import: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <Badge variant="outline" className={`border-0 text-xs capitalize ${styles[source] || ""}`}>
      {source === "api" ? "Market (API)" : source}
    </Badge>
  );
}

export default function CurrencySettingsPage() {
  const { refreshRates: refreshContextRates } = useCurrency();

  const [latest, setLatest] = useState<LatestExchangeRate[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>("RWF");
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [history, setHistory] = useState<ExchangeRateDoc[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "", symbol: "", decimal_places: "2" });

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    from_currency: "",
    rate: "",
    effective_date: new Date().toISOString().split("T")[0],
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, currenciesRes] = await Promise.all([
        exchangeRatesApi.getLatest({ fresh: true }),
        currenciesApi.getAll({ includeInactive: true }),
      ]);
      if (latestRes.success) {
        setLatest(latestRes.data.rates || []);
        if (latestRes.data.base_currency) setBaseCurrency(latestRes.data.base_currency);
      }
      if (currenciesRes.success) setCurrencies(currenciesRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load currency settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (filter: string) => {
    try {
      const res = await exchangeRatesApi.getHistory({
        from_currency: filter !== "all" ? filter : undefined,
        limit: 25,
      });
      if (res.success) setHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadHistory(historyFilter);
  }, [historyFilter, loadHistory]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await exchangeRatesApi.syncNow();
      if (res.success) {
        toast.success(
          `Rates refreshed: ${res.data.created + res.data.updated} currencies updated against ${res.data.base}`,
        );
        await Promise.all([loadAll(), loadHistory(historyFilter), refreshContextRates()]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Rate provider unreachable — last known rates retained");
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (currency: CurrencyInfo, active: boolean) => {
    if (currency.code === baseCurrency && !active) {
      toast.error("The base currency cannot be deactivated");
      return;
    }
    try {
      await currenciesApi.update(currency._id!, { is_active: active });
      setCurrencies((prev) =>
        prev.map((c) => (c._id === currency._id ? { ...c, is_active: active } : c)),
      );
      toast.success(`${currency.code} ${active ? "activated" : "deactivated"}`);
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update currency");
    }
  };

  const handleAddCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name) {
      toast.error("Code and name are required");
      return;
    }
    setSavingCurrency(true);
    try {
      await currenciesApi.create({
        code: newCurrency.code.toUpperCase(),
        name: newCurrency.name,
        symbol: newCurrency.symbol || undefined,
        decimal_places: parseInt(newCurrency.decimal_places, 10) || 2,
      });
      toast.success(`Currency ${newCurrency.code.toUpperCase()} added`);
      setAddCurrencyOpen(false);
      setNewCurrency({ code: "", name: "", symbol: "", decimal_places: "2" });
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add currency");
    } finally {
      setSavingCurrency(false);
    }
  };

  const openOverride = (currency?: string) => {
    setOverrideForm({
      from_currency: currency || "",
      rate: "",
      effective_date: new Date().toISOString().split("T")[0],
    });
    setOverrideOpen(true);
  };

  const handleSaveOverride = async () => {
    const rate = parseFloat(overrideForm.rate);
    if (!overrideForm.from_currency || !rate || rate <= 0) {
      toast.error("Select a currency and enter a positive rate");
      return;
    }
    setSavingRate(true);
    try {
      await exchangeRatesApi.addRate({
        from_currency: overrideForm.from_currency,
        rate,
        effective_date: overrideForm.effective_date,
      });
      toast.success(
        `Rate saved: 1 ${overrideForm.from_currency} = ${rate} ${baseCurrency}`,
      );
      setOverrideOpen(false);
      await Promise.all([loadAll(), loadHistory(historyFilter), refreshContextRates()]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save rate");
    } finally {
      setSavingRate(false);
    }
  };

  const staleCount = latest.filter((r) => r.has_rate && r.stale).length;
  const missingCount = latest.filter((r) => !r.has_rate).length;
  const activeForeign = latest.length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
                <Coins className="h-5 w-5 text-emerald-600" />
                Currency Settings
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Base currency: <Badge variant="outline" className="ml-1 font-semibold">{baseCurrency}</Badge>
                <span className="ml-2 text-xs">
                  All ledger postings, financial statements and RRA/EBM filings are in {baseCurrency}.
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openOverride()} className="gap-1.5">
                <Pencil className="h-4 w-4" />
                Manual Override
              </Button>
              <Button onClick={handleSyncNow} disabled={syncing} className="gap-1.5">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Now
              </Button>
            </div>
          </div>

          {(staleCount > 0 || missingCount > 0) && !loading && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {staleCount > 0 && <>{staleCount} rate{staleCount > 1 ? "s are" : " is"} outdated. </>}
                {missingCount > 0 && <>{missingCount} active currenc{missingCount > 1 ? "ies have" : "y has"} no rate yet. </>}
                Use “Refresh Now” to pull today’s market rates, or set a rate manually.
              </span>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            {/* Latest rates */}
            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Current Exchange Rates
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Latest known rate per active currency, expressed as 1 unit in {baseCurrency}. {activeForeign} active foreign currencies.
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Rate (1 unit = {baseCurrency})</TableHead>
                        <TableHead>Effective</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latest.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                            No active foreign currencies. Activate currencies below.
                          </TableCell>
                        </TableRow>
                      )}
                      {latest.map((r) => (
                        <TableRow key={r.currency}>
                          <TableCell>
                            <span className="font-semibold">{r.currency}</span>
                            <span className="ml-2 text-xs text-slate-500">{r.name}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {r.rate != null ? r.rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "-"}
                          </TableCell>
                          <TableCell className="text-sm">{fmtDate(r.effective_date)}</TableCell>
                          <TableCell><SourceBadge source={r.source} /></TableCell>
                          <TableCell>
                            {!r.has_rate ? (
                              <Badge variant="outline" className="border-0 bg-red-50 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                No rate
                              </Badge>
                            ) : r.stale ? (
                              <Badge variant="outline" className="border-0 bg-amber-50 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                Stale
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-0 bg-emerald-50 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Current
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openOverride(r.currency)}>
                              Set rate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Manage currencies */}
            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <Coins className="h-4 w-4 text-emerald-600" />
                    Currencies
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Active currencies appear in document currency selectors.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddCurrencyOpen(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
                    {currencies.map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-sm">{c.code}</span>
                          {c.code === baseCurrency && (
                            <Badge variant="outline" className="ml-2 border-0 bg-emerald-50 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Base
                            </Badge>
                          )}
                          <p className="truncate text-xs text-slate-500">{c.name} ({c.symbol})</p>
                        </div>
                        <Switch
                          checked={c.is_active !== false}
                          disabled={c.code === baseCurrency}
                          onCheckedChange={(checked) => handleToggleActive(c, checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rate history */}
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <History className="h-4 w-4 text-purple-600" />
                  Rate History
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Every stored rate is kept for audit — documents always convert with the rate effective on their date.
                </p>
              </div>
              <Select value={historyFilter} onValueChange={setHistoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {latest.map((r) => (
                    <SelectItem key={r.currency} value={r.currency}>{r.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        No rates recorded yet. Use “Refresh Now” or add a manual rate.
                      </TableCell>
                    </TableRow>
                  )}
                  {history.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell className="font-medium">{h.from_currency} → {h.to_currency}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(h.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell>{fmtDate(h.effective_date)}</TableCell>
                      <TableCell><SourceBadge source={h.source} /></TableCell>
                      <TableCell className="text-sm text-slate-500">{fmtDate(h.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add currency dialog */}
      <Dialog open={addCurrencyOpen} onOpenChange={setAddCurrencyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>Add an ISO 4217 currency to the system list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code (ISO 4217)</Label>
                <Input
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. JPY"
                  maxLength={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Symbol</Label>
                <Input
                  value={newCurrency.symbol}
                  onChange={(e) => setNewCurrency((p) => ({ ...p, symbol: e.target.value }))}
                  placeholder="e.g. ¥"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={newCurrency.name}
                onChange={(e) => setNewCurrency((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Japanese Yen"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Decimal Places</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={newCurrency.decimal_places}
                onChange={(e) => setNewCurrency((p) => ({ ...p, decimal_places: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCurrencyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCurrency} disabled={savingCurrency}>
              {savingCurrency && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Add Currency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual override dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Rate Override</DialogTitle>
            <DialogDescription>
              Record a rate against the base currency ({baseCurrency}). This is stored in the rate
              history and takes precedence for its effective date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={overrideForm.from_currency}
                onValueChange={(v) => setOverrideForm((p) => ({ ...p, from_currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {latest.map((r) => (
                    <SelectItem key={r.currency} value={r.currency}>
                      {r.currency} — {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rate (1 {overrideForm.from_currency || "unit"} = ? {baseCurrency})</Label>
              <Input
                type="number"
                step="0.000001"
                min="0"
                value={overrideForm.rate}
                onChange={(e) => setOverrideForm((p) => ({ ...p, rate: e.target.value }))}
                placeholder="e.g. 1350.50"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={overrideForm.effective_date}
                onChange={(e) => setOverrideForm((p) => ({ ...p, effective_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOverride} disabled={savingRate}>
              {savingRate && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
