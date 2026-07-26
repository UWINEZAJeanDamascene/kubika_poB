import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../layout/Layout";
import { dashboardApi, type ExecutiveDashboardData } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import {
  clampPercent,
  formatDashboardDelta,
  formatDashboardPercent,
  percentBarWidth,
} from "@/lib/dashboardMetrics";
import { DashboardErrorBanner } from "@/app/components/dashboard/DashboardPageHeader";
import { formatDashboardError, formatDashboardDateTime, formatDashboardDate, computeProfitMarginPercent, formatProfitMargin, formatExpenseLoad, formatHeroProfitValue, formatHeroCashValue, formatMetricComparison, formatJournalSourceType, formatJournalDescription } from "@/app/components/dashboard/dashboardPageUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/app/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";

function formatCurrency(value: number): string {
  return `RWF ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercentage(value: number | null): string {
  return formatDashboardDelta(value);
}

function formatMetricChange(current: number, change: number | null, t: (key: string) => string): string {
  return formatMetricComparison(current, change, {
    newActivity: t("dashboard.executive.newThisMonth"),
    noComparison: t("dashboard.executive.noComparison"),
  });
}

function previousFromChange(current: number, change: number | null): number {
  if (change === null || change === undefined || change <= -99.99) return 0;
  const divisor = 1 + change / 100;
  return divisor === 0 ? 0 : current / divisor;
}

function clampPct(value: number): number {
  return clampPercent(value);
}

interface MetricTileProps {
  title: string;
  value: number;
  change: number | null;
  comparisonLabel?: string;
  icon: ReactNode;
  tone: "green" | "red" | "blue" | "violet";
  loading?: boolean;
  alert?: boolean;
}

const toneClass = {
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
};

function MetricTile({
  title,
  value,
  change,
  comparisonLabel,
  icon,
  tone,
  loading,
  alert,
}: MetricTileProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-36" />
        </CardContent>
      </Card>
    );
  }

  const isPositiveChange = change !== null && change >= 0;
  const isNegativeValue = value < 0;

  return (
    <Card
      className={`overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${
        alert && isNegativeValue ? "ring-1 ring-red-500/40" : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p
              className={`mt-3 text-2xl font-bold tracking-tight ${
                isNegativeValue
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-950 dark:text-white"
              }`}
            >
              {formatCurrency(value)}
            </p>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          {change === null && comparisonLabel ? (
            <span className="text-slate-500 dark:text-slate-400">{comparisonLabel}</span>
          ) : change === null ? (
            <span className="text-slate-500 dark:text-slate-400">{formatMetricChange(value, change, t)}</span>
          ) : (
            <>
              {isPositiveChange ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`font-semibold ${
                  isPositiveChange
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatPercentage(change)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{t("dashboard.executive.vsLastMonth")}</span>
            </>
          )}
        </div>
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </CardHeader>
  );
}

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
      <div className="mb-2 text-slate-500 dark:text-slate-400">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

const pulseChartConfig = (t: (key: string) => string) =>
  ({
    revenue: { label: t("dashboard.executive.revenue"), color: "#16a34a" },
    expenses: { label: t("dashboard.executive.expenses"), color: "#dc2626" },
    profit: { label: t("dashboard.executive.profit"), color: "#2563eb" },
  }) satisfies ChartConfig;

const bridgeChartConfig = (t: (key: string) => string) =>
  ({
    amount: { label: t("dashboard.amount"), color: "#2563eb" },
  }) satisfies ChartConfig;

const arChartConfig = (t: (key: string) => string) =>
  ({
    value: { label: t("dashboard.executive.receivablesRisk"), color: "#2563eb" },
  }) satisfies ChartConfig;

const executiveKpiChartConfig = (t: (key: string) => string) =>
  ({
    score: { label: t("dashboard.executive.executiveScore"), color: "#2563eb" },
  }) satisfies ChartConfig;

export default function DashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getExecutive();
      setData(result);
    } catch (err: any) {
      setError(formatDashboardError(err.message || t("dashboard.loadingError")));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  useLiveRefresh(fetchDashboard);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
  };

  const metrics = data?.key_metrics;
  const ar = data?.accounts_receivable;
  const journalEntries = data?.recent_journal_entries || [];
  const upcomingDebt = data?.upcoming_debt_payments;

  const revenue = metrics?.revenue.this_month ?? 0;
  const expenses = metrics?.expenses.this_month ?? 0;
  const profit = metrics?.net_profit.this_month ?? 0;
  const cashBalance = metrics?.cash_balance.current ?? 0;
  const revenuePrev = previousFromChange(revenue, metrics?.revenue.vs_last_month ?? null);
  const expensesPrev = previousFromChange(
    expenses,
    metrics?.expenses.vs_last_month ?? null,
  );
  const profitPrev = previousFromChange(
    profit,
    metrics?.net_profit.vs_last_month ?? null,
  );
  const grossActivity = Math.abs(revenue) + Math.abs(expenses);
  const margin = computeProfitMarginPercent(revenue, profit) ?? 0;
  const marginLabel = formatProfitMargin(revenue, profit);
  const heroProfitValue = formatHeroProfitValue(revenue, profit, formatCurrency);
  const heroCashValue = formatHeroCashValue(revenue, cashBalance, formatCurrency);
  const expenseLoadLabel = formatExpenseLoad(revenue, expenses, formatCurrency);
  const expenseLoad =
    revenue !== 0 ? (Math.abs(expenses) / Math.abs(revenue)) * 100 : 0;
  const arOutstanding = ar?.outstanding_total ?? 0;
  const arOverdue = ar?.overdue_total ?? 0;
  const arCurrent = Math.max(arOutstanding - arOverdue, 0);
  const arCurrentPct = arOutstanding > 0 ? (arCurrent / arOutstanding) * 100 : 0;
  const debtCoverage =
    (upcomingDebt?.totalAmount ?? 0) > 0
      ? (cashBalance / (upcomingDebt?.totalAmount ?? 1)) * 100
      : 100;
  const cashToRevenue = revenue > 0 ? (cashBalance / revenue) * 100 : 0;
  const score = clampPct(
    50 +
      Math.min(margin, 40) * 0.7 +
      Math.min(arCurrentPct, 100) * 0.2 +
      Math.min(debtCoverage, 200) * 0.05 -
      (cashBalance < 0 ? 30 : 0),
  );
  const scoreLevel = score >= 75 ? "strong" : score >= 50 ? "watch" : "critical";
  const scoreLabel = t(`dashboard.executive.${scoreLevel}`);
  const hasNegativeCash = cashBalance < 0;

  const pulseData = useMemo(
    () => [
      {
        period: t("dashboard.executive.lastMonth"),
        revenue: Math.max(revenuePrev, 0),
        expenses: Math.abs(expensesPrev),
        profit: profitPrev,
      },
      {
        period: t("dashboard.executive.thisMonth"),
        revenue: Math.max(revenue, 0),
        expenses: Math.abs(expenses),
        profit,
      },
    ],
    [t, revenue, revenuePrev, expenses, expensesPrev, profit, profitPrev],
  );

  const bridgeData = useMemo(
    () => [
      { name: t("dashboard.executive.revenue"), amount: revenue, fill: "#16a34a" },
      { name: t("dashboard.executive.expenses"), amount: expenses, fill: "#dc2626" },
      { name: t("dashboard.executive.netProfitLabel"), amount: profit, fill: profit >= 0 ? "#2563eb" : "#dc2626" },
    ],
    [t, revenue, expenses, profit],
  );

  const arDonutData = useMemo(
    () =>
      [
        { name: t("dashboard.executive.current"), value: arCurrent, fill: "#16a34a" },
        { name: t("dashboard.executive.overdue"), value: arOverdue, fill: "#dc2626" },
      ].filter((slice) => slice.value > 0),
    [t, arCurrent, arOverdue],
  );

  const executiveKpiData = useMemo(
    () => [
      { name: t("dashboard.executive.executiveScoreLabel"), score, fill: "#2563eb" },
      ...(revenue > 0
        ? [{ name: t("dashboard.executive.profitMarginLabel"), score: clampPct(margin), fill: "#16a34a" }]
        : [{ name: t("dashboard.executive.profitMarginLabel"), score: 0, fill: "#94a3b8" }]),
      { name: t("dashboard.executive.arCurrent"), score: clampPct(arCurrentPct), fill: "#0891b2" },
      { name: t("dashboard.executive.debtCoverageLabel"), score: clampPct(debtCoverage), fill: "#f59e0b" },
      { name: t("dashboard.executive.cashRevenueRatio"), score: clampPct(cashToRevenue), fill: "#7c3aed" },
    ],
    [t, score, margin, revenue, arCurrentPct, debtCoverage, cashToRevenue],
  );

  const boardSignals = useMemo(
    () => [
      {
        label: t("dashboard.executive.profitability"),
        value: revenue === 0 ? formatCurrency(profit) : marginLabel,
        width: revenue !== 0 ? clampPct(margin) : clampPct(Math.min(Math.abs(profit) / Math.max(grossActivity, 1) * 100, 100)),
        tone: profit >= 0 ? "bg-emerald-500" : "bg-red-500",
      },
      {
        label: t("dashboard.executive.collectionQuality"),
        value: t("dashboard.executive.collectionCurrent", { percent: formatDashboardPercent(arCurrentPct) }),
        width: clampPct(arCurrentPct),
        tone: arOverdue > 0 ? "bg-amber-500" : "bg-emerald-500",
      },
      {
        label: t("dashboard.executive.debtCoverage"),
        value: formatDashboardPercent(debtCoverage),
        width: clampPct(debtCoverage),
        tone: debtCoverage >= 100 ? "bg-emerald-500" : "bg-red-500",
      },
    ],
    [t, marginLabel, margin, revenue, profit, arCurrentPct, arOverdue, debtCoverage],
  );

  return (
    <Layout>
      <div className="erp-dashboard min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1700px] w-full space-y-6 2xl:max-w-[2200px]">
          <div className="dashboard-hero overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] 2xl:grid-cols-[1fr_0.75fr]">
              <div className="p-6 lg:p-7">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10">
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        {t("dashboard.executive.commandCenter")}
                      </Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200">
                        <Zap className="mr-1 h-3.5 w-3.5" />
                        {t("dashboard.executive.liveData")}
                      </Badge>
                      {!loading && (
                        <Badge
                          variant={scoreLevel === "critical" ? "destructive" : "secondary"}
                          className={
                            scoreLevel === "strong"
                              ? "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-200"
                              : scoreLevel === "watch"
                                ? "bg-amber-500/20 text-amber-700 hover:bg-amber-500/20 dark:text-amber-200"
                                : ""
                          }
                        >
                          {scoreLabel}
                        </Badge>
                      )}
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                      {t("dashboard.executive.title")}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300 sm:text-base">
                      {t("dashboard.executive.subtitle")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
                      <Clock className="h-3.5 w-3.5" />
                      {loading
                        ? "Loading…"
                        : formatDashboardDateTime(data?.generated_at)}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = "/invoices/new";
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span className="ml-1.5 hidden sm:inline">{t("dashboard.executive.newInvoice")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => {
                        window.location.href = "/dashboard/finance";
                      }}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="ml-1.5 hidden sm:inline">{t("dashboard.executive.finance")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={handleRefresh}
                      disabled={refreshing || loading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      />
                      <span className="ml-1.5 hidden sm:inline">{t("dashboard.executive.refresh")}</span>
                    </Button>
                  </div>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("dashboard.executive.executiveScore")}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="dashboard-kpi-value">{score.toFixed(0)}</p>
                      <Target className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: percentBarWidth(score) }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {revenue === 0 ? t("dashboard.executive.netProfit") : t("dashboard.executive.profitMargin")}
                    </p>
                    <p className={`dashboard-kpi-value ${revenue === 0 && profit < 0 ? "text-red-400" : revenue === 0 && profit > 0 ? "text-emerald-400" : ""}`}>
                      {heroProfitValue}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {revenue === 0
                        ? t("dashboard.executive.netProfitThisMonth", { amount: formatCurrency(profit), expenses: formatCurrency(expenses) })
                        : t("dashboard.executive.profitOnRevenue", { profit: formatCurrency(profit), revenue: formatCurrency(revenue) })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {revenue === 0 ? t("dashboard.executive.cashOnHand") : t("dashboard.executive.cashToRevenue")}
                    </p>
                    <p className="dashboard-kpi-value">{heroCashValue}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {revenue === 0
                        ? t("dashboard.executive.noRevenueYet")
                        : t("dashboard.executive.availableLiquidity", { amount: formatCurrency(cashBalance) })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03] lg:border-l lg:border-t-0">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("dashboard.executive.momentumCurve")}
                  </p>
                  <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/15 dark:text-blue-200">
                    {t("dashboard.executive.thisMonth")}
                  </Badge>
                </div>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[260px] xl:h-[300px] w-full bg-white/10" />
                ) : (
                  <ChartContainer
                    config={pulseChartConfig(t)}
                    className="h-[160px] sm:h-[200px] md:h-[260px] xl:h-[300px] w-full"
                  >
                    <AreaChart
                      accessibilityLayer
                      data={pulseData}
                      margin={{ left: 8, right: 12, top: 16, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickFormatter={(value) => formatCompactCurrency(Number(value))}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--color-revenue)"
                        fill="var(--color-revenue)"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke="var(--color-expenses)"
                        fill="var(--color-expenses)"
                        fillOpacity={0.14}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="var(--color-profit)"
                        fill="var(--color-profit)"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
                {!loading && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {t("dashboard.executive.momentumRevenue")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      {t("dashboard.executive.momentumExpenses")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      {t("dashboard.executive.momentumProfit")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <DashboardErrorBanner message={error} />}

          {!loading && hasNegativeCash && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
              <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200">
                    {t("dashboard.executive.cashAlertTitle", { amount: formatCurrency(Math.abs(cashBalance)) })}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {t("dashboard.executive.cashAlertMessage")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/ar-receipts/new";
                    }}
                  >
                    {t("dashboard.executive.collectReceivables")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/dashboard/finance";
                    }}
                  >
                    {t("dashboard.executive.viewCashFlow")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title={t("dashboard.executive.revenueThisMonth")}
              value={revenue}
              change={metrics?.revenue.vs_last_month ?? null}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="green"
              loading={loading}
            />
            <MetricTile
              title={t("dashboard.executive.expensesThisMonth")}
              value={expenses}
              change={metrics?.expenses.vs_last_month ?? null}
              icon={<TrendingDown className="h-5 w-5" />}
              tone="red"
              loading={loading}
            />
            <MetricTile
              title={t("dashboard.executive.netProfit")}
              value={profit}
              change={metrics?.net_profit.vs_last_month ?? null}
              icon={<CreditCard className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <MetricTile
              title={t("dashboard.executive.cashBalance")}
              value={cashBalance}
              change={null}
              comparisonLabel={t("dashboard.executive.noComparison")}
              icon={<Wallet className="h-5 w-5" />}
              tone="violet"
              loading={loading}
              alert
            />
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<Target className="h-4 w-4 text-blue-500" />}
              title={t("dashboard.executive.boardKpiMatrix")}
              subtitle={t("dashboard.executive.boardKpiSubtitle")}
              action={
                !loading && (
                  <Badge variant={scoreLevel === "critical" ? "destructive" : "secondary"}>
                    {scoreLabel}
                  </Badge>
                )
              }
            />
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-center">
                  <ChartContainer
                    config={executiveKpiChartConfig(t)}
                    className="h-[240px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={executiveKpiData}
                      layout="vertical"
                      margin={{ left: 8, right: 20, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatDashboardPercent(Number(value), { decimals: 1 })}
                          />
                        }
                      />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                        {executiveKpiData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="space-y-4">
                    {boardSignals.map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {item.label}
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {item.value}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-2 rounded-full ${item.tone}`}
                            style={{ width: percentBarWidth(item.width) }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("dashboard.executive.grossActivity")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          {formatCurrency(grossActivity)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("dashboard.executive.events")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          {journalEntries.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr] 2xl:grid-cols-[1fr_0.8fr]">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Zap className="h-4 w-4 text-amber-500" />}
                title={t("dashboard.executive.profitBridge")}
                subtitle={t("dashboard.executive.profitBridgeSubtitle")}
                action={
                  !loading && (
                    <Badge variant={profit >= 0 ? "secondary" : "destructive"}>
                      {formatCurrency(grossActivity)} activity
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[200px] sm:h-[240px] md:h-[300px] xl:h-[360px] w-full" />
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_300px] 2xl:grid-cols-[1fr_360px] lg:items-center">
                    <ChartContainer
                      config={bridgeChartConfig(t)}
                      className="h-[200px] sm:h-[240px] md:h-[300px] xl:h-[360px] w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={bridgeData}
                        margin={{ left: 4, right: 20, top: 16, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCompactCurrency(Number(value))}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => (
                                <span className="font-mono">
                                  {formatCurrency(Number(value))}
                                </span>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                          {bridgeData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            {t("dashboard.executive.expenseLoad")}
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {expenseLoadLabel}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-red-500"
                            style={{ width: percentBarWidth(expenseLoad) }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            {t("dashboard.executive.profitMargin")}
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {revenue === 0 ? formatCurrency(profit) : marginLabel}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: percentBarWidth(margin) }}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("dashboard.executive.netPerformance")}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                          {formatCurrency(profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<ShieldCheck className="h-4 w-4 text-blue-500" />}
                title={t("dashboard.executive.receivablesRisk")}
                subtitle={t("dashboard.executive.receivablesSubtitle")}
                action={
                  !loading && (
                    <Badge variant={arOverdue > 0 ? "destructive" : "secondary"}>
                      {t("dashboard.executive.invoicesCount", { count: ar?.outstanding_count ?? 0 })}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[180px] sm:h-[220px] md:h-[300px] xl:h-[340px] w-full" />
                ) : arOutstanding === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck className="h-8 w-8 text-emerald-500" />}
                    message={t("dashboard.executive.noReceivables")}
                  />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-[minmax(140px,180px)_1fr] md:grid-cols-[minmax(160px,220px)_1fr] xl:grid-cols-[minmax(200px,280px)_1fr] sm:items-center overflow-hidden">
                    <ChartContainer
                      config={arChartConfig(t)}
                      className="mx-auto h-[180px] sm:h-[220px] md:h-[260px] xl:h-[320px] w-full min-w-0"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{name}</span>
                                  <span>{formatCurrency(Number(value))}</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={arDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-3 min-w-0">
                      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("dashboard.executive.outstanding")}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                          {formatCurrency(arOutstanding)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="overflow-hidden rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t("dashboard.executive.current")}
                          </p>
                          <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(arCurrent)}
                          </p>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t("dashboard.executive.overdue")}
                          </p>
                          <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(arOverdue)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("dashboard.executive.currentCollectionStatus", { percent: formatDashboardPercent(arCurrentPct) })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr] 2xl:grid-cols-[1fr_1fr]">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Landmark className="h-4 w-4 text-amber-500" />}
                title={t("dashboard.executive.debtWatch")}
                subtitle={t("dashboard.executive.debtWatchSubtitle")}
                action={
                  !loading && upcomingDebt && (
                    <Badge variant={upcomingDebt.totalUpcoming > 0 ? "secondary" : "outline"}>
                      {upcomingDebt.totalUpcoming} due
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[260px] xl:h-[300px] w-full" />
                ) : !upcomingDebt || upcomingDebt.totalUpcoming === 0 ? (
                  <EmptyState
                    icon={<Landmark className="h-8 w-8" />}
                    message={t("dashboard.executive.noDebtPayments")}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                      <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Total due next 30 days
                      </p>
                      <p className="mt-2 text-3xl font-bold text-amber-950 dark:text-amber-100">
                        {formatCurrency(upcomingDebt.totalAmount)}
                      </p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Cash coverage {formatDashboardPercent(debtCoverage)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {upcomingDebt.payments.slice(0, 4).map((payment) => (
                        <div
                          key={payment.loanId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {payment.loanName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Due {new Date(payment.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-slate-950 dark:text-white">
                              {formatCurrency(payment.estimatedAmount)}
                            </p>
                            <Badge
                              variant={payment.daysUntil <= 7 ? "destructive" : "secondary"}
                              className="mt-1 h-5 px-1.5 text-[10px]"
                            >
                              {payment.daysUntil === 0
                                ? "Today"
                                : `${payment.daysUntil}d`}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<FileText className="h-4 w-4 text-blue-500" />}
                title={t("dashboard.executive.executiveActivityFeed")}
                subtitle={t("dashboard.executive.executiveActivitySubtitle")}
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        window.location.href = "/clients/new";
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        window.location.href = "/invoices";
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                }
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : journalEntries.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    message={t("dashboard.executive.noJournalEntries")}
                  />
                ) : (
                  <div className="space-y-2">
                    {journalEntries.slice(0, 7).map((entry) => (
                      <div
                        key={entry._id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {formatJournalDescription(entry.description) || entry.entryNumber || "Journal entry"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {entry.entryNumber && <span>{entry.entryNumber}</span>}
                              {entry.sourceType && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                  {formatJournalSourceType(entry.sourceType)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(entry.totalDebit ?? entry.totalCredit ?? 0)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDashboardDate(entry.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<Calendar className="h-4 w-4 text-violet-500" />}
              title={t("dashboard.executive.boardSnapshot")}
              subtitle={t("dashboard.executive.boardSnapshotSubtitle")}
            />
            <CardContent>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[120px] sm:h-[160px] md:h-[200px] w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("dashboard.executive.grossActivity")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(grossActivity)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("dashboard.executive.arCurrentLabel")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatDashboardPercent(arCurrentPct)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("dashboard.executive.debtCoverageSnapshot")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatDashboardPercent(debtCoverage)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("dashboard.executive.activityEvents")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {journalEntries.length}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
