import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { pettyCashApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  ExternalLink,
  ScrollText,
  BadgeCheck,
  AlertTriangle,
  Layers,
  CalendarDays,
  Banknote,
  ChevronLeft,
  ChevronRight,
  FileText,
  PiggyBank,
  Receipt,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function PettyCashTransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [fund, setFund] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchTransactions = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (typeFilter !== "all") params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await pettyCashApi.getFundTransactions(id, params);
      console.log("[PettyCashTransactionsPage] API Response:", response);

      if (response.success && response.data) {
        setFund(response.data.fund);
        setTransactions(response.data.transactions);
        setTotal(response.total);
        setPages(response.pages);
      }
    } catch (error) {
      console.error(
        "[PettyCashTransactionsPage] Failed to fetch transactions:",
        error,
      );
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [id, page, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Fix A — use fund's currencyCode instead of hardcoded 'USD'
  const formatCurrency = (amount: number) => {
    const currency = fund?.currencyCode || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Fix B — fetch ALL transactions before building the CSV
  const exportTransactions = async () => {
    if (!id) return;
    setExportLoading(true);
    try {
      // Fetch the full dataset — limit 10000 covers any realistic fund
      const params: any = { page: 1, limit: 10000 };
      if (typeFilter !== "all") params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await pettyCashApi.getFundTransactions(id, params);

      if (!response.success || !response.data) {
        toast.error("Failed to fetch transactions for export");
        return;
      }

      const allTx: any[] = response.data.transactions;

      const headers = [
        "Date",
        "Reference",
        "Type",
        "Description",
        "Account",
        "Amount",
        "Balance",
        "Receipt Ref",
        "Journal Entry",
      ];
      const rows = allTx.map((tx) => [
        formatDate(tx.transactionDate),
        tx.referenceNo ?? "",
        tx.typeLabel ?? tx.type ?? "",
        `"${(tx.description ?? "").replace(/"/g, '""')}"`,
        tx.expenseAccountName
          ? `"${tx.expenseAccountName} (${tx.expenseAccountId})"`
          : (tx.expenseAccountId ?? ""),
        tx.amount.toFixed(2),
        tx.runningBalance.toFixed(2),
        tx.receiptRef ?? "",
        tx.journalEntryId ?? "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petty-cash-transactions-${fund?.name || "export"}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `Exported ${allTx.length} transaction${allTx.length !== 1 ? "s" : ""}`,
      );
    } catch (error) {
      console.error("[PettyCashTransactionsPage] Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => navigate("/petty-cash")} className="h-10 w-10 dark:border-slate-700 dark:text-slate-200">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {fund?.name || t("pettyCash.transactions.title", "Transactions")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("pettyCash.transactions.description", "View transaction history")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {fund && (
                  <Badge variant="outline" className={`h-6 gap-1 ${fund.currentBalance >= fund.floatAmount ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {fund.currentBalance >= fund.floatAmount ? 'Fund Healthy' : 'Replenishment Needed'}
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={exportTransactions} disabled={exportLoading} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {exportLoading ? "Exporting…" : t("common.export", "Export")}
                </Button>
              </div>
            </div>
          </div>

          {/* Fund Summary Cards */}
          {fund && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Balance</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(fund.currentBalance)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <Banknote className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Float Amount</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(fund.floatAmount)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                      <PiggyBank className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {fund.currentBalance > fund.floatAmount ? 'Excess' : 'Replenishment Needed'}
                      </p>
                      <p className={`mt-2 text-2xl font-bold ${fund.currentBalance > fund.floatAmount ? 'text-red-600 dark:text-red-400' : fund.replenishmentNeeded > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {fund.currentBalance > fund.floatAmount
                          ? `+${formatCurrency(fund.currentBalance - fund.floatAmount)}`
                          : formatCurrency(fund.replenishmentNeeded)}
                      </p>
                    </div>
                    <div className={`rounded-lg p-2.5 ring-1 ${fund.currentBalance > fund.floatAmount || fund.replenishmentNeeded > 0 ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60' : 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60'}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transactions</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{total}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                      <Layers className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <form onSubmit={(e) => { e.preventDefault(); handleFilterChange(); }} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-full sm:w-40 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="top_up">Top Up</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="replenishment">Replenishment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
            <Button type="button" onClick={handleResetFilters} variant="ghost" size="sm" className="h-9 dark:text-slate-400">
              Reset
            </Button>
          </form>

          {/* Transactions Table */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <FileText className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No transactions found</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try adjusting your filters</p>
            </div>
          ) : (
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Reference</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Voucher</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Type</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Account</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Balance</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx._id} className="dark:border-slate-800 dark:hover:bg-slate-900/50">
                          <TableCell className="whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                            {formatDate(tx.transactionDate)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">
                            {tx.referenceNo || <span className="text-slate-400 dark:text-slate-600">-</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {tx.voucherNumber ? (
                              <span className="text-blue-600 dark:text-blue-400">{tx.voucherNumber}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs gap-1 ${tx.type === "top_up" || tx.type === "opening" || tx.type === "replenishment"
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'}`}
                            >
                              {tx.type === "top_up" && <TrendingUp className="h-3 w-3" />}
                              {tx.type === "expense" && <TrendingDown className="h-3 w-3" />}
                              {tx.type === "opening" && <PiggyBank className="h-3 w-3" />}
                              {tx.type === "replenishment" && <Receipt className="h-3 w-3" />}
                              {tx.typeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{tx.description}</TableCell>
                          <TableCell>
                            {tx.expenseAccountName ? (
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {tx.expenseAccountName}
                                <span className="text-slate-400 ml-1 dark:text-slate-500">({tx.expenseAccountId})</span>
                              </span>
                            ) : tx.expenseAccountId ? (
                              <span className="text-sm text-slate-500 dark:text-slate-400">{tx.expenseAccountId}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm font-semibold ${tx.type === "expense" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {formatCurrency(tx.runningBalance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-500 dark:text-slate-400">{tx.receiptRef || "-"}</span>
                              {tx.journalEntryId && (
                                <button
                                  type="button"
                                  title="View general ledger entry"
                                  onClick={() => navigate(`/journal?sourceId=${tx.journalEntryId}`)}
                                  className="inline-flex items-center gap-0.5 self-start rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100 transition-colors dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900/40 dark:hover:bg-indigo-950/50"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  GL
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 dark:border-slate-700 dark:text-slate-200">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-700 dark:text-slate-300">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="h-8 dark:border-slate-700 dark:text-slate-200">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
