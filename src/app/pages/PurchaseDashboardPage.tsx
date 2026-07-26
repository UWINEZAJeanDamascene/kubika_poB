import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Layout } from "../layout/Layout";
import { dashboardApi, type PurchaseDashboardData } from "@/lib/api";
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
  ShoppingCart,
  Truck,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp,
  RotateCcw,
  Activity,
  Banknote,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

function formatCurrency(value: number): string {
  return `RWF ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "fully_received":
      return "default";
    case "approved":
    case "partially_received":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  tone: "blue" | "indigo" | "amber" | "red";
  loading?: boolean;
}

const toneClass = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  indigo:
    "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
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

const supplierChartConfig = {
  total_value: { label: "Value", color: "#2563eb" },
} satisfies ChartConfig;

const statusChartConfig = {
  count: { label: "Purchase orders", color: "#2563eb" },
} satisfies ChartConfig;

const procurementFunnelChartConfig = {
  value: { label: "Value", color: "#2563eb" },
} satisfies ChartConfig;

export default function PurchaseDashboardPage() {
  const [data, setData] = useState<PurchaseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getPurchase();
      setData(result);
    } catch (err: any) {
      setError(formatDashboardError(err.message || "Failed to load purchase dashboard"));
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
  const purchaseOrders = data?.purchase_orders;
  const grnPending = data?.grn_pending;
  const purchaseReturns = data?.purchase_returns;
  const apAging = data?.ap_aging;
  const topSuppliers = data?.top_suppliers || [];
  const byStatusList = data?.by_status_list || [];
  const ap = data?.accounts_payable;

  const poCount = purchaseOrders?.po_count ?? summary?.po_count_mtd ?? 0;
  const poTotalValue = purchaseOrders?.total_value ?? 0;
  const openPoCount = purchaseOrders?.open_count ?? 0;
  const openPoValue = summary?.po_open_value ?? purchaseOrders?.open_value ?? 0;
  const grnPendingCount = summary?.grn_pending_count ?? grnPending?.count ?? 0;
  const grnPendingValue = grnPending?.total_value ?? 0;
  const apOutstanding =
    summary?.ap_total_outstanding ?? ap?.total_outstanding ?? apAging?.total_outstanding ?? 0;
  const apOverdue = summary?.ap_overdue_amount ?? ap?.overdue_amount ?? 0;
  const overdueRate =
    apOutstanding > 0 ? Math.round((apOverdue / apOutstanding) * 100) : 0;
  const openPoRate = poCount > 0 ? Math.round((openPoCount / poCount) * 100) : 0;
  const receivingBacklogRate =
    poTotalValue > 0 ? Math.round((grnPendingValue / poTotalValue) * 100) : 0;
  const returnRate =
    poTotalValue > 0 && purchaseReturns
      ? (purchaseReturns.total_amount / poTotalValue) * 100
      : 0;
  const topSupplierValue = topSuppliers[0]?.total_value ?? 0;
  const supplierConcentration =
    poTotalValue > 0 ? Math.round((topSupplierValue / poTotalValue) * 100) : 0;
  const healthBadge =
    overdueRate > 25 || receivingBacklogRate > 50
      ? "At risk"
      : openPoCount > 0 || grnPendingCount > 0
        ? "Active"
        : "Stable";

  const agingBarData = apAging
    ? [
        {
          label: "AP Outstanding",
          not_due: apAging.not_due,
          days_1_30: apAging.days_1_30,
          days_31_60: apAging.days_31_60,
          days_61_90: apAging.days_61_90,
          days_90_plus: apAging.days_90_plus,
        },
      ]
    : [];

  const pieData = byStatusList
    .filter((status) => status.count > 0)
    .map((status) => ({
      name: formatStatusLabel(status.status),
      status: status.status,
      value: status.count,
      amount: status.total_value,
    }));

  const supplierChartData = topSuppliers.slice(0, 6).map((supplier) => ({
    name:
      supplier.supplier_name?.length > 18
        ? `${supplier.supplier_name.substring(0, 18)}...`
        : supplier.supplier_name,
    total_value: supplier.total_value,
    grn_count: supplier.grn_count,
  }));

  const procurementFunnelData = [
    { label: "PO Value", value: poTotalValue, fill: "#2563eb" },
    { label: "Open PO", value: openPoValue, fill: "#7c3aed" },
    { label: "GRN Pending", value: grnPendingValue, fill: "#f59e0b" },
    { label: "AP Outstanding", value: apOutstanding, fill: "#0891b2" },
    { label: "AP Overdue", value: apOverdue, fill: "#dc2626" },
  ].filter((item) => item.value > 0);

  const procurementSignals = [
    {
      label: "Open PO rate",
      value: formatDashboardPercent(openPoRate),
      width: Math.min(openPoRate, 100),
      tone: "bg-violet-500",
    },
    {
      label: "Receiving backlog",
      value: formatDashboardPercent(receivingBacklogRate),
      width: Math.min(receivingBacklogRate, 100),
      tone: receivingBacklogRate > 50 ? "bg-red-500" : "bg-amber-500",
    },
    {
      label: "Supplier concentration",
      value: formatDashboardPercent(supplierConcentration),
      width: Math.min(supplierConcentration, 100),
      tone: supplierConcentration > 40 ? "bg-amber-500" : "bg-emerald-500",
    },
  ];

  return (
    <Layout>
      <div className="erp-dashboard min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          <DashboardPageHeader
            title="Purchase Dashboard"
            subtitle="See open orders, what is waiting to arrive, and what you owe suppliers."
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
                    variant={healthBadge === "At risk" ? "destructive" : "secondary"}
                    className="h-6"
                  >
                    {healthBadge}
                  </Badge>
                )}
              </>
            }
            stats={[
              {
                label: "Overdue bills",
                value: loading ? "—" : formatDashboardPercent(overdueRate),
              },
            ]}
          />

          {error && <DashboardErrorBanner message={error} />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="POs This Month"
              value={formatNumber(summary?.po_count_mtd ?? 0)}
              subtitle={`${formatNumber(openPoCount)} open, ${formatCurrency(poTotalValue)} total`}
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <MetricCard
              title="Open PO Value"
              value={formatCurrency(openPoValue)}
              subtitle={`${openPoRate}% of purchase orders still open`}
              icon={<Banknote className="h-5 w-5" />}
              tone="indigo"
              loading={loading}
            />
            <MetricCard
              title="GRN Pending"
              value={formatNumber(grnPendingCount)}
              subtitle={`${formatCurrency(grnPendingValue)} pending receiving value`}
              icon={<Truck className="h-5 w-5" />}
              tone="amber"
              loading={loading}
            />
            <MetricCard
              title="AP Overdue"
              value={formatCurrency(apOverdue)}
              subtitle={`${formatCurrency(apOutstanding)} total outstanding`}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="red"
              loading={loading}
            />
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<ClipboardCheck className="h-4 w-4 text-blue-500" />}
              title="Procurement Command View"
              subtitle="Purchase value moving through orders, receiving, payables, and overdue exposure"
              action={
                !loading && (
                  <Badge variant={healthBadge === "At risk" ? "destructive" : "secondary"}>
                    {healthBadge}
                  </Badge>
                )
              }
            />
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : procurementFunnelData.length === 0 ? (
                <EmptyState
                  icon={<PackageCheck className="h-8 w-8" />}
                  message="No procurement movement for this period"
                />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
                  <ChartContainer
                    config={procurementFunnelChartConfig}
                    className="h-[220px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={procurementFunnelData}
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
                        {procurementFunnelData.map((entry) => (
                          <Cell key={entry.label} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="space-y-4">
                    {procurementSignals.map((item) => (
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
                          Return ratio
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          {formatDashboardPercent(returnRate, { decimals: 1 })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          AP overdue
                        </p>
                        <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(apOverdue)}
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
                title="AP Aging"
                subtitle="Outstanding supplier payables by age bucket"
                action={
                  !loading && (
                    <Badge variant={apOverdue > 0 ? "destructive" : "secondary"}>
                      {formatCurrency(apOutstanding)}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[120px] sm:h-[160px] md:h-[220px] xl:h-[260px] w-full" />
                ) : !apAging || apAging.total_outstanding === 0 ? (
                  <EmptyState
                    icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
                    message="No outstanding payables"
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
                        margin={{ left: 16, right: 20, top: 8, bottom: 8 }}
                      >
                        <YAxis type="category" dataKey="label" hide />
                        <XAxis
                          type="number"
                          hide
                          domain={[0, apAging.total_outstanding]}
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
                        const value = apAging[bucket.key];
                        const pct =
                          apAging.total_outstanding > 0
                            ? (value / apAging.total_outstanding) * 100
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
                              {formatDashboardPercent(pct)} of AP
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
                title="Procurement Health"
                subtitle="Backlog, exposure, and supplier concentration"
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
                          Receiving backlog
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {receivingBacklogRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{
                            width: percentBarWidth(receivingBacklogRate),
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Overdue AP
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
                          Top supplier concentration
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {supplierConcentration}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{
                            width: percentBarWidth(supplierConcentration),
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Pending GRNs
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                          {formatNumber(grnPendingCount)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Returns
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                          {formatDashboardPercent(returnRate, { decimals: 1 })}
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
                title="Supplier Spend Ranking"
                subtitle="Top suppliers by GRN value"
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[220px] md:h-[300px] xl:h-[360px] w-full" />
                ) : supplierChartData.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    message="No supplier data available"
                  />
                ) : (
                  <ChartContainer
                    config={supplierChartConfig}
                    className="h-[160px] sm:h-[220px] md:h-[300px] xl:h-[360px] w-full -ml-4"
                  >
                    <BarChart
                      accessibilityLayer
                      data={supplierChartData}
                      layout="vertical"
                      margin={{ left: 16, right: 20, top: 8, bottom: 8 }}
                    >
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        width={120}
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => formatCurrency(Number(value))}
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
                      <Bar
                        dataKey="total_value"
                        fill="var(--color-total_value)"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<ReceiptText className="h-4 w-4 text-blue-500" />}
                title="Purchase Orders by Status"
                subtitle="PO lifecycle count and committed value"
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[300px] xl:h-[340px] w-full" />
                ) : pieData.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingCart className="h-8 w-8" />}
                    message="No purchase orders found"
                  />
                ) : (
                  <div className="grid gap-5 md:grid-cols-[minmax(160px,260px)_1fr] xl:grid-cols-[minmax(200px,300px)_1fr] md:items-center">
                    <ChartContainer
                      config={statusChartConfig}
                      className="mx-auto h-[160px] sm:h-[200px] md:h-[250px] xl:h-[300px] w-full -ml-2"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{name}</span>
                                  <span>{formatNumber(Number(value))} POs</span>
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
                    <div className="space-y-3">
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
                              <span>{pct}% of POs</span>
                              <span>{formatCurrency(status.total_value)}</span>
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Banknote className="h-4 w-4 text-emerald-500" />}
                title="Accounts Payable Summary"
                subtitle="Supplier invoices awaiting settlement"
              />
              <CardContent>
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Total outstanding
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        {formatCurrency(ap?.total_outstanding ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Pending invoices
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        {formatNumber(ap?.invoice_count ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Overdue amount
                      </p>
                      <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(ap?.overdue_amount ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Overdue invoices
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {formatNumber(ap?.overdue_count ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<RotateCcw className="h-4 w-4 text-violet-500" />}
                title="Purchase Returns"
                subtitle="Returned goods and reversal value this month"
              />
              <CardContent>
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Total returns
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        {formatNumber(purchaseReturns?.total_count ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Total value
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        {formatCurrency(purchaseReturns?.total_amount ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Draft
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {formatNumber(purchaseReturns?.draft_count ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Confirmed
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(purchaseReturns?.confirmed_count ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<ClipboardCheck className="h-4 w-4 text-blue-500" />}
              title="Operational Snapshot"
              subtitle="Derived controls for procurement review"
            />
            <CardContent>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <PackageCheck className="h-4 w-4" />
                      <p className="text-sm">Receiving backlog</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {receivingBacklogRate}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="h-4 w-4" />
                      <p className="text-sm">Open PO rate</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {openPoRate}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Users className="h-4 w-4" />
                      <p className="text-sm">Top supplier share</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {supplierConcentration}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <RotateCcw className="h-4 w-4" />
                      <p className="text-sm">Return ratio</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatDashboardPercent(returnRate, { decimals: 1 })}
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
