import { useState, useEffect, type ReactNode } from "react";
import { periodApi, journalEntriesApi, AccountingPeriod, JournalEntry } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Shield,
  CheckCircle2,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface MetricTileProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: "emerald" | "amber" | "red" | "blue" | "slate";
  subtitle?: string;
  loading?: boolean;
}

const toneClass: Record<string, string> = {
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  slate:
    "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800",
};

function MetricTile({ title, value, icon, tone, subtitle, loading }: MetricTileProps) {
  if (loading) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-32" />
          {subtitle && <Skeleton className="mt-3 h-3 w-36" />}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {value}
            </p>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>{icon}</div>
        </div>
        {subtitle && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PanelTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
      <div className="min-w-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
          {icon}
          <span className="truncate">{title}</span>
        </CardTitle>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action}
    </CardHeader>
  );
}

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
      <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function AccountingPeriodsPage() {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [periodEntries, setPeriodEntries] = useState<Record<string, JournalEntry[]>>({});
  const [entriesLoadingId, setEntriesLoadingId] = useState<string | null>(null);

  const togglePeriodEntries = async (period: AccountingPeriod) => {
    if (expandedPeriodId === period._id) {
      setExpandedPeriodId(null);
      return;
    }
    setExpandedPeriodId(period._id);
    if (periodEntries[period._id]) return;

    setEntriesLoadingId(period._id);
    try {
      const response = await journalEntriesApi.getAll({
        startDate: new Date(period.start_date).toISOString(),
        endDate: new Date(period.end_date).toISOString(),
        page: 1,
        limit: 100,
      });
      const entries = [...response.data];
      for (let page = 2; page <= response.pages; page += 1) {
        const nextPage = await journalEntriesApi.getAll({
          startDate: new Date(period.start_date).toISOString(),
          endDate: new Date(period.end_date).toISOString(),
          page,
          limit: 100,
        });
        entries.push(...nextPage.data);
      }
      setPeriodEntries((current) => ({ ...current, [period._id]: entries }));
    } catch (error: any) {
      toast.error(error.message || `Failed to load entries for ${period.name}`);
      setExpandedPeriodId(null);
    } finally {
      setEntriesLoadingId(null);
    }
  };

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const response = await periodApi.getAll({
        fiscal_year: fiscalYear,
        include_stats: true,
      });
      setPeriods(response.data);
      setCompanyName(response.company_name);
    } catch (error: any) {
      toast.error(error.message || "Failed to load periods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [fiscalYear]);

  const handleGenerate = async () => {
    setActionLoading("generate");
    try {
      const response = await periodApi.generate(generateYear);
      toast.success(response.message);
      setFiscalYear(generateYear);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate periods");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string, name: string) => {
    if (
      !confirm(
        `Close period "${name}"? No more journal entries can be posted to this period.`,
      )
    )
      return;
    setActionLoading(id);
    try {
      const response = await periodApi.close(id);
      toast.success(response.message);
      if (response.data.warnings?.length) {
        response.data.warnings.forEach((w: string) => toast.warning(w));
      }
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || "Failed to close period");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async (id: string, name: string) => {
    if (!confirm(`Reopen period "${name}"? Journal entries can be posted again.`)) return;
    setActionLoading(id);
    try {
      const response = await periodApi.reopen(id);
      toast.success(response.message);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || "Failed to reopen period");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLock = async (id: string, name: string) => {
    if (!confirm(`Lock period "${name}" permanently? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      const response = await periodApi.lock(id);
      toast.success(response.message);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || "Failed to lock period");
    } finally {
      setActionLoading(null);
    }
  };

  const handleYearEndClose = async () => {
    if (
      !confirm(
        `Perform year-end close for FY${fiscalYear}? All periods will be locked and P&L will transfer to Retained Earnings.`,
      )
    )
      return;
    setActionLoading("year-end");
    try {
      const response = await periodApi.yearEndClose(fiscalYear);
      toast.success(response.message);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || "Failed to perform year-end close");
    } finally {
      setActionLoading(null);
    }
  };

  // Summary computations
  const openCount = periods.filter((p) => p.status === "open").length;
  const closedCount = periods.filter((p) => p.status === "closed").length;
  const lockedCount = periods.filter((p) => p.status === "locked").length;
  const totalEntries = periods.reduce((sum, p) => sum + (p.stats?.entry_count || 0), 0);
  const totalDebits = periods.reduce((sum, p) => sum + (p.stats?.total_debit || 0), 0);
  const totalCredits = periods.reduce((sum, p) => sum + (p.stats?.total_credit || 0), 0);
  const fiscalProgress =
    periods.length > 0
      ? Math.round(((closedCount + lockedCount) / periods.length) * 100)
      : 0;
  const allLocked = periods.length > 0 && periods.every((p) => p.status === "locked");
  const canYearEndClose =
    periods.length > 0 &&
    periods.some((p) => p.is_year_end && p.status !== "locked");

  const filteredPeriods = periods.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      format(new Date(p.start_date), "MMMM").toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return {
          icon: <Unlock className="h-4 w-4" />,
          badgeClass:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
          tone: "emerald" as const,
          label: "Open",
        };
      case "closed":
        return {
          icon: <Lock className="h-4 w-4" />,
          badgeClass:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
          tone: "amber" as const,
          label: "Closed",
        };
      case "locked":
        return {
          icon: <ShieldAlert className="h-4 w-4" />,
          badgeClass:
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
          tone: "red" as const,
          label: "Locked",
        };
      default:
        return {
          icon: <Shield className="h-4 w-4" />,
          badgeClass: "",
          tone: "slate" as const,
          label: status,
        };
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Accounting Periods
                  </h1>
                  <Badge variant="secondary" className="h-6">
                    FY{fiscalYear}
                  </Badge>
                  {allLocked && (
                    <Badge className="bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      All Locked
                    </Badge>
                  )}
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {companyName
                    ? `${companyName} — `
                    : ""}
                  Manage fiscal periods. Open periods accept journal entries. Closed
                  periods are read-only. Locked periods are permanently sealed.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={actionLoading === "generate"}
                    className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {actionLoading === "generate" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Generate FY{generateYear}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchPeriods}
                    disabled={loading}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Open</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {openCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Closed</p>
                  <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                    {closedCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Locked</p>
                  <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                    {lockedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Year-End Close Alert */}
          {canYearEndClose && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20">
              <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    Year-End Close Ready — FY{fiscalYear}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Transfer P&L to Retained Earnings and lock all periods. This
                    action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleYearEndClose}
                  disabled={actionLoading === "year-end"}
                  className="gap-2"
                >
                  {actionLoading === "year-end" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Close FY{fiscalYear}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title="Total Periods"
              value={periods.length}
              icon={<Calendar className="h-5 w-5" />}
              tone="blue"
              subtitle={`FY${fiscalYear} fiscal year`}
              loading={loading}
            />
            <MetricTile
              title="Journal Entries"
              value={totalEntries.toLocaleString()}
              icon={<BookOpen className="h-5 w-5" />}
              tone="emerald"
              subtitle={`Across ${periods.length} period${periods.length !== 1 ? "s" : ""}`}
              loading={loading}
            />
            <MetricTile
              title="Total Debits"
              value={formatCurrency(totalDebits)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="slate"
              subtitle="Cumulative fiscal year"
              loading={loading}
            />
            <MetricTile
              title="Total Credits"
              value={formatCurrency(totalCredits)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="slate"
              subtitle="Cumulative fiscal year"
              loading={loading}
            />
          </div>

          {/* Fiscal Year Progress */}
          {!loading && periods.length > 0 && (
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Fiscal Year Progress
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {closedCount + lockedCount} of {periods.length} periods closed
                      or locked
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-slate-950 dark:text-white">
                    {fiscalProgress}%
                  </p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${fiscalProgress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Periods List */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<FileText className="h-4 w-4 text-blue-500" />}
              title="Periods"
              subtitle={`${filteredPeriods.length} of ${periods.length} periods`}
              action={
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search periods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-56 pl-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
              }
            />
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredPeriods.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-8 w-8" />}
                  message={
                    periods.length === 0
                      ? `No periods found for FY${fiscalYear}. Generate periods to get started.`
                      : "No periods match your search."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredPeriods.map((period) => {
                    const statusConfig = getStatusConfig(period.status);
                    return (
                      <div
                        key={period._id}
                        className={`rounded-lg border p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50 ${
                          period.is_year_end
                            ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10"
                            : "border-slate-200 dark:border-slate-800"
                        } ${period.status === "locked" ? "opacity-70" : ""}`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-4">
                            <div
                              className={`mt-0.5 rounded-lg p-2.5 ring-1 ${toneClass[statusConfig.tone]}`}
                            >
                              {statusConfig.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-950 dark:text-white">
                                  {period.name}
                                </span>
                                {period.is_year_end && (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                                  >
                                    <AlertTriangle className="mr-1 h-3 w-3" />
                                    Year-End
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={statusConfig.badgeClass}
                                >
                                  {statusConfig.icon}
                                  <span className="ml-1">{statusConfig.label}</span>
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {format(new Date(period.start_date), "dd MMM yyyy")} —{" "}
                                {format(new Date(period.end_date), "dd MMM yyyy")}
                                {period.closed_at && (
                                  <span className="ml-2 text-xs">
                                    · Closed{" "}
                                    {format(new Date(period.closed_at), "dd MMM yyyy")}
                                  </span>
                                )}
                              </p>
                              {period.stats && period.stats.entry_count > 0 && (
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-mono">
                                    {period.stats.entry_count} journal entries
                                  </span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                    DR {formatCurrency(period.stats.total_debit)}
                                  </span>
                                  <span className="font-mono text-blue-600 dark:text-blue-400">
                                    CR {formatCurrency(period.stats.total_credit)}
                                  </span>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePeriodEntries(period)}
                                disabled={entriesLoadingId === period._id}
                                className="mt-1 h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
                              >
                                {entriesLoadingId === period._id ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : expandedPeriodId === period._id ? (
                                  <ChevronUp className="mr-1 h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                                )}
                                {expandedPeriodId === period._id ? "Hide journal entries" : "View journal entries"}
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {period.status === "open" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClose(period._id, period.name)}
                                  disabled={actionLoading === period._id}
                                  className="h-8 gap-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  {actionLoading === period._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5" />
                                  )}
                                  Close
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLock(period._id, period.name)}
                                  disabled={actionLoading === period._id}
                                  className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Lock
                                </Button>
                              </>
                            )}
                            {period.status === "closed" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleReopen(period._id, period.name)
                                  }
                                  disabled={actionLoading === period._id}
                                  className="h-8 gap-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  {actionLoading === period._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5" />
                                  )}
                                  Reopen
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLock(period._id, period.name)}
                                  disabled={actionLoading === period._id}
                                  className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Lock
                                </Button>
                              </>
                            )}
                            {period.status === "locked" && (
                              <div className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                Permanently sealed
                              </div>
                            )}
                          </div>
                        </div>
                        {expandedPeriodId === period._id && (
                          <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                            {(periodEntries[period._id] || []).length === 0 ? (
                              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                No journal entries recorded in this period.
                              </p>
                            ) : (
                              <table className="w-full min-w-[640px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                  <tr>
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Entry</th>
                                    <th className="px-3 py-2">Description</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2 text-right">Debit</th>
                                    <th className="px-3 py-2 text-right">Credit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {periodEntries[period._id].map((entry) => (
                                    <tr key={entry._id}>
                                      <td className="whitespace-nowrap px-3 py-2">{format(new Date(entry.date), "dd MMM yyyy")}</td>
                                      <td className="whitespace-nowrap px-3 py-2 font-mono">{entry.entryNumber}</td>
                                      <td className="px-3 py-2">{entry.description}</td>
                                      <td className="px-3 py-2 capitalize">{entry.status}</td>
                                      <td className="whitespace-nowrap px-3 py-2 text-right">{formatCurrency(Number(entry.totalDebit) || 0)}</td>
                                      <td className="whitespace-nowrap px-3 py-2 text-right">{formatCurrency(Number(entry.totalCredit) || 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Control Bar */}
          {!loading && periods.length === 0 && (
            <Card className="border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30">
              <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    No periods found for FY{fiscalYear}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Generate 12 monthly periods to start tracking journal entries.
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-300">
                      Fiscal Year
                    </Label>
                    <Input
                      type="number"
                      value={generateYear}
                      onChange={(e) =>
                        setGenerateYear(
                          parseInt(e.target.value) || new Date().getFullYear(),
                        )
                      }
                      className="h-9 w-28 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                    />
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={actionLoading === "generate"}
                    className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {actionLoading === "generate" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year selector for existing periods */}
          {!loading && periods.length > 0 && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Fiscal Year
              </span>
              <Input
                type="number"
                value={fiscalYear}
                onChange={(e) =>
                  setFiscalYear(
                    parseInt(e.target.value) || new Date().getFullYear(),
                  )
                }
                className="h-9 w-28 dark:bg-slate-900 dark:text-white dark:border-slate-700"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPeriods}
                disabled={loading}
                className="h-9 gap-1.5 dark:border-slate-700 dark:text-slate-200"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Load
              </Button>
              <div className="mx-2 h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Generate
              </span>
              <Input
                type="number"
                value={generateYear}
                onChange={(e) =>
                  setGenerateYear(
                    parseInt(e.target.value) || new Date().getFullYear(),
                  )
                }
                className="h-9 w-28 dark:bg-slate-900 dark:text-white dark:border-slate-700"
              />
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={actionLoading === "generate"}
                className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                {actionLoading === "generate" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Generate
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
