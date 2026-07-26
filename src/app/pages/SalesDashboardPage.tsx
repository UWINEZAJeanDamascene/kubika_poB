import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Layout } from "../layout/Layout";
import { dashboardApi, type SalesDashboardData } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDashboardPercent, percentBarWidth } from "@/lib/dashboardMetrics";
import { DashboardErrorBanner, DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { formatDashboardError } from "@/app/components/dashboard/dashboardPageUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/app/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import {
  FileText,
  PiggyBank,
  Percent,
  AlertCircle,
  CheckCircle,
  Users,
  FileWarning,
  Activity,
  Banknote,
  Clock3,
  ShieldCheck,
  TrendingUp,
  ReceiptText,
} from "lucide-react";

import { formatCurrency } from '@/lib/currencyUtils';

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "fully_paid":
      return "default";
    case "confirmed":
    case "partially_paid":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

const STATUS_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

const agingBuckets = [
  { key: "not_due", label: "Not due", color: "#16a34a" },
  { key: "days_1_30", label: "1-30 days", color: "#2563eb" },
  { key: "days_31_60", label: "31-60 days", color: "#f59e0b" },
  { key: "days_61_90", label: "61-90 days", color: "#ea580c" },
  { key: "days_90_plus", label: "90+ days", color: "#dc2626" },
] as const;

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone: "blue" | "green" | "violet" | "amber";
  loading?: boolean;
}

const toneClass = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800">
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

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <div className="dashboard-kpi-value mt-3">
              {value}
            </div>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>
            {icon}
          </div>
        </div>
        {subtitle && (
          <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
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
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
      <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

const agingChartConfig = {
  not_due: { label: "Not due", color: "#16a34a" },
  days_1_30: { label: "1-30 days", color: "#2563eb" },
  days_31_60: { label: "31-60 days", color: "#f59e0b" },
  days_61_90: { label: "61-90 days", color: "#ea580c" },
  days_90_plus: { label: "90+ days", color: "#dc2626" },
} satisfies ChartConfig;

const statusChartConfig = {
  count: { label: "Invoices", color: "#2563eb" },
} satisfies ChartConfig;

const conversionChartConfig = {
  value: { label: "Amount", color: "#2563eb" },
} satisfies ChartConfig;

export default function SalesDashboardPage() {
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getSales();
      setData(result);
    } catch (err: any) {
      setError(formatDashboardError(err.message || "Failed to load sales dashboard"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  useLiveRefresh(fetchDashboard);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
  };

  const summary = data?.summary;
  const arAging = data?.ar_aging;
  const topClients = data?.top_clients || [];
  const byStatusList = data?.by_status_list || [];
  const creditNotes = data?.credit_notes;
  const collectionRate =
    data?.collection_rate?.collection_rate_pct ??
    summary?.collection_rate_pct ??
    0;
  const totalInvoiced =
    data?.invoices?.total_invoiced ?? summary?.total_invoiced_mtd ?? 0;
  const totalCollected = data?.invoices?.total_collected ?? 0;
  const totalOutstanding =
    arAging?.total_ar_outstanding ??
    data?.invoices?.total_outstanding ??
    summary?.total_outstanding_ar ??
    0;
  const overdueAmount = arAging?.total_overdue ?? 0;
  const overdueRate =
    totalOutstanding > 0 ? Math.round((overdueAmount / totalOutstanding) * 100) : 0;
  const creditNoteRate =
    totalInvoiced > 0 && creditNotes
      ? (creditNotes.total_value / totalInvoiced) * 100
      : 0;
  const collectionBadge =
    collectionRate >= 90 ? "Excellent" : collectionRate >= 65 ? "Watch" : "At risk";

  const agingBarData = arAging
    ? [
        {
          label: "AR Outstanding",
          not_due: arAging.not_due,
          days_1_30: arAging.days_1_30,
          days_31_60: arAging.days_31_60,
          days_61_90: arAging.days_61_90,
          days_90_plus: arAging.days_90_plus,
        },
      ]
    : [];

  const pieData = byStatusList
    .filter((status) => status.count > 0)
    .map((status) => ({
      name: formatStatusLabel(status.status),
      status: status.status,
      value: status.count,
      amount: status.total_amount,
    }));

  const conversionData = [
    { label: "Billed", value: totalInvoiced, fill: "#2563eb" },
    { label: "Collected", value: totalCollected, fill: "#16a34a" },
    { label: "Outstanding", value: totalOutstanding, fill: "#f59e0b" },
    { label: "Overdue", value: overdueAmount, fill: "#dc2626" },
  ].filter((item) => item.value > 0);

  const conversionSummary = [
    {
      label: "Cash conversion",
      value: formatDashboardPercent(collectionRate, { decimals: 1 }),
      width: Math.min(collectionRate, 100),
      tone: "bg-emerald-500",
    },
    {
      label: "AR overdue exposure",
      value: formatDashboardPercent(overdueRate),
      width: Math.min(overdueRate, 100),
      tone: overdueRate > 25 ? "bg-red-500" : "bg-amber-500",
    },
    {
      label: "Credit note ratio",
      value: formatDashboardPercent(creditNoteRate, { decimals: 1 }),
      width: Math.min(creditNoteRate, 100),
      tone: "bg-violet-500",
    },
  ];

  return (
    <Layout>
      <div className="erp-dashboard min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          <DashboardPageHeader
            title="Sales Dashboard"
            subtitle="Track what you sold, how much was collected, and who still owes you."
            generatedAt={data?.generated_at}
            loading={loading}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            badges={
              <>
                <Badge className="h-6 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200">
                  Live data
                </Badge>
                {!loading && (
                  <Badge
                    variant={collectionRate >= 65 ? "secondary" : "destructive"}
                    className="h-6"
                  >
                    {collectionBadge}
                  </Badge>
                )}
              </>
            }
            stats={[
              {
                label: "Overdue invoices",
                value: loading ? "—" : formatDashboardPercent(overdueRate),
              },
            ]}
          />

          {error && <DashboardErrorBanner message={error} />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Invoices Raised"
              value={formatNumber(summary?.invoices_raised_mtd ?? 0)}
              subtitle="Confirmed and active invoices this month"
              icon={<FileText className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <MetricCard
              title="Total Invoiced"
              value={formatCurrency(totalInvoiced)}
              subtitle="Month to date, excluding drafts"
              icon={<Banknote className="h-5 w-5" />}
              tone="green"
              loading={loading}
            />
            <MetricCard
              title="Total Collected"
              value={formatCurrency(totalCollected)}
              subtitle={`Outstanding AR ${formatCurrency(totalOutstanding)}`}
              icon={<PiggyBank className="h-5 w-5" />}
              tone="violet"
              loading={loading}
            />
            <MetricCard
              title="Collection Rate"
              value={formatDashboardPercent(collectionRate, { decimals: 1 })}
              subtitle="Collected vs billed MTD"
              icon={<Percent className="h-5 w-5" />}
              tone="amber"
              loading={loading}
            />
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<Banknote className="h-4 w-4 text-emerald-500" />}
              title="Billing to Cash Command View"
              subtitle="Billed revenue, collected cash, open receivables, and overdue exposure"
              action={
                !loading && (
                  <Badge variant={collectionRate >= 65 ? "secondary" : "destructive"}>
                    {collectionBadge}
                  </Badge>
                )
              }
            />
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : conversionData.length === 0 ? (
                <EmptyState
                  icon={<ReceiptText className="h-8 w-8" />}
                  message="No sales conversion data for this period"
                />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
                  <ChartContainer
                    config={conversionChartConfig}
                    className="h-[220px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={conversionData}
                      margin={{ left: 0, right: 12, top: 12, bottom: 8 }}
                    >
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={56}
                        tickFormatter={(value) => formatCompact(Number(value))}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                        }
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {conversionData.map((entry) => (
                          <Cell key={entry.label} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="space-y-4">
                    {conversionSummary.map((item) => (
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
                          Open AR
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          {formatCurrency(totalOutstanding)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Overdue
                        </p>
                        <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(overdueAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
              <PanelTitle
                icon={<Clock3 className="h-4 w-4 text-blue-500" />}
                title="AR Aging"
                subtitle="Outstanding receivables by due-status bucket"
                action={
                  !loading && (
                    <Badge variant={overdueAmount > 0 ? "destructive" : "secondary"}>
                      {formatCurrency(totalOutstanding)}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[120px] sm:h-[160px] md:h-[220px] xl:h-[260px] w-full" />
                ) : !arAging || arAging.total_ar_outstanding === 0 ? (
                  <EmptyState
                    icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
                    message="No outstanding receivables"
                  />
                ) : (
                  <div className="space-y-5">
                    <ChartContainer
                      config={agingChartConfig}
                      className="h-[92px] sm:h-[120px] md:h-[160px] xl:h-[200px] w-full -ml-2"
                    >
                      <BarChart
                        accessibilityLayer
                        data={agingBarData}
                        layout="vertical"
                        margin={{ left: 0, right: 0, top: 8, bottom: 8 }}
                      >
                        <YAxis type="category" dataKey="label" hide />
                        <XAxis
                          type="number"
                          hide
                          domain={[0, arAging.total_ar_outstanding]}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex justify-between gap-4">
                                  <span>
                                    {agingChartConfig[
                                      name as keyof typeof agingChartConfig
                                    ]?.label || name}
                                  </span>
                                  <span className="font-mono">
                                    {formatCurrency(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Bar
                          dataKey="not_due"
                          stackId="aging"
                          fill="var(--color-not_due)"
                          radius={[6, 0, 0, 6]}
                        />
                        <Bar
                          dataKey="days_1_30"
                          stackId="aging"
                          fill="var(--color-days_1_30)"
                        />
                        <Bar
                          dataKey="days_31_60"
                          stackId="aging"
                          fill="var(--color-days_31_60)"
                        />
                        <Bar
                          dataKey="days_61_90"
                          stackId="aging"
                          fill="var(--color-days_61_90)"
                        />
                        <Bar
                          dataKey="days_90_plus"
                          stackId="aging"
                          fill="var(--color-days_90_plus)"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ChartContainer>

                    <div className="grid gap-3 sm:grid-cols-5">
                      {agingBuckets.map((bucket) => {
                        const value = arAging[bucket.key];
                        const pct =
                          arAging.total_ar_outstanding > 0
                            ? (value / arAging.total_ar_outstanding) * 100
                            : 0;
                        return (
                          <div
                            key={bucket.key}
                            className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: bucket.color }}
                              />
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {bucket.label}
                              </span>
                            </div>
                            <p className="mt-2 font-mono text-sm font-semibold text-slate-950 dark:text-white">
                              {formatCurrency(value)}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {formatDashboardPercent(pct)} of AR
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Activity className="h-4 w-4 text-emerald-500" />}
                title="Collection Health"
                subtitle="Cash conversion and credit-note impact"
              />
              <CardContent className="space-y-5">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Collection rate
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {formatDashboardPercent(collectionRate, { decimals: 1 })}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: percentBarWidth(collectionRate) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Overdue AR
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {overdueRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-red-500"
                          style={{ width: percentBarWidth(overdueRate) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Credit-note ratio
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {formatDashboardPercent(creditNoteRate, { decimals: 1 })}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{ width: percentBarWidth(creditNoteRate) }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Collected
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                          {formatCurrency(totalCollected)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Overdue
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                          {formatCurrency(overdueAmount)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Users className="h-4 w-4 text-violet-500" />}
                title="Top Clients by Revenue"
                subtitle="Revenue, collection, and remaining exposure"
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : topClients.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    message="No client data available"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[220px]">Client</TableHead>
                          <TableHead className="text-right">Invoiced</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right">Invoices</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topClients.map((client) => (
                          <TableRow key={client.client_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-950 dark:text-white">
                                  {client.client_name}
                                </p>
                                {client.client_code && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {client.client_code}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(client.total_invoiced)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(client.total_paid)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {client.outstanding > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {formatCurrency(client.outstanding)}
                                </span>
                              ) : (
                                <span className="text-slate-400">{formatCurrency(0)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-500">
                              {formatNumber(client.invoice_count)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<ReceiptText className="h-4 w-4 text-blue-500" />}
                title="Invoices by Status"
                subtitle="Invoice count and value by lifecycle state"
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[250px] xl:h-[300px] w-full" />
                ) : pieData.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    message="No invoices found"
                  />
                ) : (
                  <div className="grid gap-5 md:grid-cols-[minmax(160px,260px)_1fr] xl:grid-cols-[minmax(200px,300px)_1fr] md:items-center overflow-hidden">
                    <ChartContainer
                      config={statusChartConfig}
                      className="mx-auto h-[160px] sm:h-[200px] md:h-[250px] xl:h-[300px] w-full -ml-2 min-w-0"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{name}</span>
                                  <span>{formatNumber(Number(value))} invoices</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {pieData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-3 min-w-0">
                      {byStatusList.map((status, index) => {
                        const totalCount = byStatusList.reduce(
                          (sum, item) => sum + item.count,
                          0,
                        );
                        const pct =
                          totalCount > 0 ? Math.round((status.count / totalCount) * 100) : 0;
                        return (
                          <div key={status.status} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      STATUS_COLORS[index % STATUS_COLORS.length],
                                  }}
                                />
                                <Badge
                                  variant={getStatusBadgeVariant(status.status)}
                                  className="h-5 px-1.5 text-[10px]"
                                >
                                  {formatStatusLabel(status.status)}
                                </Badge>
                              </div>
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                {formatNumber(status.count)}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: percentBarWidth(pct),
                                  backgroundColor:
                                    STATUS_COLORS[index % STATUS_COLORS.length],
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span>{pct}% of invoices</span>
                              <span>{formatCurrency(status.total_amount)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<FileWarning className="h-4 w-4 text-red-500" />}
              title="Credit Notes This Month"
              subtitle="Revenue reversals and leakage against invoiced value"
            />
            <CardContent>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Count
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                      {formatNumber(creditNotes?.count ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Total value
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(creditNotes?.total_value ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Percent of invoiced
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                      {formatDashboardPercent(creditNoteRate, { decimals: 1 })}
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
