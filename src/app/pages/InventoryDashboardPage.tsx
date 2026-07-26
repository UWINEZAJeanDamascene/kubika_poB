import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../layout/Layout";
import { dashboardApi, type InventoryDashboardData } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDashboardPercent, percentBarWidth } from "@/lib/dashboardMetrics";
import { DashboardErrorBanner, DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { formatDashboardError, formatDashboardDateTime } from "@/app/components/dashboard/dashboardPageUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
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
  Package,
  Layers,
  Banknote,
  CheckCircle,
  ArrowUpRight,
  AlertCircle,
  ShoppingCart,
  Archive,
  Activity,
  Boxes,
  Clock3,
  ShieldCheck,
  TrendingUp,
  Warehouse,
} from "lucide-react";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number): string {
  return `RWF ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#0d9488",
];

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone: "blue" | "green" | "amber" | "violet";
  loading?: boolean;
}

const toneClass = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  loading,
}: SummaryCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-28" />
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

function EmptyState({
  icon,
  message,
}: {
  icon: ReactNode;
  message: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
      <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

const topMovingChartConfig = {
  total_qty: {
    label: "Units moved",
    color: "#2563eb",
  },
} satisfies ChartConfig;

const warehouseChartConfig = {
  value: {
    label: "Value",
  },
} satisfies ChartConfig;

const stockCompositionChartConfig = {
  value: {
    label: "Units",
  },
} satisfies ChartConfig;

export default function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getInventory();
      setData(result);
    } catch (err: any) {
      setError(formatDashboardError(err.message || "Failed to load inventory dashboard"));
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
  const lowStockItems = data?.low_stock_alerts?.items || [];
  const topMoving = data?.top_moving_products || [];
  const warehouseBreakdown = data?.warehouse_breakdown || [];
  const deadStockItems = data?.dead_stock?.items || [];
  const recentMovements = data?.recent_movements || [];

  const totalSku = summary?.total_sku_count ?? 0;
  const zeroStock = summary?.zero_stock_count ?? 0;
  const inStock = summary?.in_stock_count ?? 0;
  const totalUnits = summary?.total_units ?? 0;
  const reserved = summary?.total_reserved ?? 0;
  const available = summary?.total_available ?? 0;
  const totalValue = summary?.total_value ?? 0;
  const alertCount = data?.low_stock_alerts?.count ?? lowStockItems.length;
  const deadStockValue = data?.dead_stock?.total_value ?? 0;
  const stockCoverage = totalSku > 0 ? Math.round((inStock / totalSku) * 100) : 0;
  const reservedRate =
    totalUnits > 0 ? Math.round((reserved / totalUnits) * 100) : 0;
  const availableRate =
    totalUnits > 0 ? Math.round((available / totalUnits) * 100) : 0;
  const atRiskCount = alertCount + zeroStock;
  const atRiskRate = totalSku > 0 ? Math.round((atRiskCount / totalSku) * 100) : 0;

  const pieData = warehouseBreakdown.map((wh) => ({
    name: wh.warehouse_name || wh.warehouse_code,
    value: wh.total_value,
    units: wh.total_units,
    skus: wh.sku_count,
  }));

  const movementData = topMoving.slice(0, 6).map((p) => ({
    name:
      p.product_name?.length > 18
        ? `${p.product_name.substring(0, 18)}...`
        : p.product_name,
    total_qty: p.total_qty,
    value: p.total_value,
  }));

  const maxWarehouseValue = Math.max(
    ...warehouseBreakdown.map((warehouse) => warehouse.total_value),
    0,
  );

  const stockCompositionData = [
    { name: "Available", value: Math.max(available, 0), fill: "#16a34a" },
    { name: "Reserved", value: Math.max(reserved, 0), fill: "#2563eb" },
  ].filter((item) => item.value > 0);

  const stockRiskSignals = [
    {
      label: "Available stock",
      value: formatDashboardPercent(availableRate),
      width: Math.min(availableRate, 100),
      tone: "bg-emerald-500",
    },
    {
      label: "Reserved stock",
      value: formatDashboardPercent(reservedRate),
      width: Math.min(reservedRate, 100),
      tone: "bg-blue-500",
    },
    {
      label: "SKU risk",
      value: formatDashboardPercent(atRiskRate),
      width: Math.min(atRiskRate, 100),
      tone: atRiskRate > 20 ? "bg-red-500" : "bg-amber-500",
    },
  ];

  return (
    <Layout>
      <div className="erp-dashboard min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          <DashboardPageHeader
            title="Inventory Dashboard"
            subtitle="See what you have in stock, what is running low, and where inventory sits by warehouse."
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
                    variant={atRiskCount > 0 ? "destructive" : "secondary"}
                    className="h-6"
                  >
                    {atRiskCount > 0 ? `${atRiskCount} at risk` : "Healthy"}
                  </Badge>
                )}
              </>
            }
            stats={[
              {
                label: "Stock coverage",
                value: loading ? "—" : formatDashboardPercent(stockCoverage),
              },
            ]}
          />

          {error && <DashboardErrorBanner message={error} />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total SKUs"
              value={formatNumber(totalSku)}
              subtitle={`${formatNumber(inStock)} stocked, ${formatNumber(zeroStock)} at zero`}
              icon={<Package className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <SummaryCard
              title="Total Units"
              value={formatNumber(totalUnits)}
              subtitle={`${formatNumber(reserved)} reserved (${reservedRate}%)`}
              icon={<Boxes className="h-5 w-5" />}
              tone="green"
              loading={loading}
            />
            <SummaryCard
              title="Stock Value"
              value={formatCurrency(totalValue)}
              subtitle={`Dead stock value ${formatCurrency(deadStockValue)}`}
              icon={<Banknote className="h-5 w-5" />}
              tone="amber"
              loading={loading}
            />
            <SummaryCard
              title="Available Units"
              value={formatNumber(available)}
              subtitle={`${availableRate}% available after reservations`}
              icon={<ShieldCheck className="h-5 w-5" />}
              tone="violet"
              loading={loading}
            />
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<Layers className="h-4 w-4 text-emerald-500" />}
              title="Stock Command View"
              subtitle="Available units, reserved units, and SKU risk in one operational view"
              action={
                !loading && (
                  <Badge variant={atRiskCount > 0 ? "destructive" : "secondary"}>
                    {atRiskCount > 0 ? `${formatNumber(atRiskCount)} at risk` : "Healthy"}
                  </Badge>
                )
              }
            />
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : stockCompositionData.length === 0 ? (
                <EmptyState
                  icon={<Package className="h-8 w-8" />}
                  message="No stock quantity available"
                />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_260px] xl:items-center">
                  <ChartContainer
                    config={stockCompositionChartConfig}
                    className="mx-auto h-[220px] w-full max-w-[260px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatNumber(Number(value))}
                          />
                        }
                      />
                      <Pie
                        data={stockCompositionData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={94}
                        paddingAngle={2}
                      >
                        {stockCompositionData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-4">
                    {stockRiskSignals.map((item) => (
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
                  </div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Low-stock alerts
                      </p>
                      <p className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
                        {formatNumber(alertCount)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dead stock value
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                        {formatCurrency(deadStockValue)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
              <PanelTitle
                icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                title="Replenishment Priorities"
                subtitle="Items below reorder point, ordered by shortage"
                action={
                  !loading && (
                    <Badge variant={alertCount > 0 ? "destructive" : "secondary"}>
                      {formatNumber(alertCount)} alerts
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
                    message="All products are above reorder point"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[220px]">Product</TableHead>
                          <TableHead>Warehouse</TableHead>
                          <TableHead className="text-right">On Hand</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead className="text-right">Reorder</TableHead>
                          <TableHead className="text-right">Shortage</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockItems.map((item) => (
                          <TableRow
                            key={`${item.product_id}-${item.warehouse_id}`}
                            className="align-middle"
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-950 dark:text-white">
                                  {item.product_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.product_code}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-300">
                              {item.warehouse_name || "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.qty_on_hand)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                <span
                                  className={`font-mono font-semibold ${
                                    item.qty_available <= 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-slate-950 dark:text-white"
                                  }`}
                                >
                                  {formatNumber(item.qty_available)}
                                </span>
                                {item.qty_reserved > 0 && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    {formatNumber(item.qty_reserved)} reserved
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-500">
                              {formatNumber(item.reorder_point)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="destructive"
                                className="font-mono"
                              >
                                {formatNumber(item.shortage)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/purchase-orders/new")}
                                className="h-8 gap-1.5"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Create PO
                              </Button>
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
                icon={<Activity className="h-4 w-4 text-blue-500" />}
                title="Inventory Health"
                subtitle="Availability and risk snapshot"
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
                          Available capacity
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {availableRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: percentBarWidth(availableRate) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Reserved stock
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {reservedRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: percentBarWidth(reservedRate) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          SKU risk
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {atRiskRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{ width: percentBarWidth(atRiskRate) }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Warehouses
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                          {formatNumber(warehouseBreakdown.length)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Dead stock
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                          {formatNumber(deadStockItems.length)}
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
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                title="Top Moving Products"
                subtitle={`Last ${data?.date_context?.top_moving_window_days ?? 30} days by dispatched units`}
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[220px] md:h-[300px] xl:h-[360px] w-full" />
                ) : movementData.length === 0 ? (
                  <EmptyState
                    icon={<Package className="h-8 w-8" />}
                    message="No dispatch activity in this period"
                  />
                ) : (
                  <ChartContainer
                    config={topMovingChartConfig}
                    className="h-[160px] sm:h-[220px] md:h-[300px] xl:h-[360px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={movementData}
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
                        tick={{ fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="total_qty"
                        fill="var(--color-total_qty)"
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
                icon={<Warehouse className="h-4 w-4 text-violet-500" />}
                title="Warehouse Value Mix"
                subtitle="Stock value distribution by warehouse"
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[300px] xl:h-[300px] w-full" />
                ) : pieData.length === 0 ? (
                  <EmptyState
                    icon={<Archive className="h-8 w-8" />}
                    message="No warehouse data available"
                  />
                ) : (
                  <div className="grid gap-5 md:grid-cols-[minmax(140px,200px)_1fr] md:items-center lg:grid-cols-[minmax(160px,240px)_1fr] xl:grid-cols-[minmax(200px,300px)_1fr] overflow-hidden">
                    <ChartContainer
                      config={warehouseChartConfig}
                      className="mx-auto h-[160px] sm:h-[200px] md:h-[250px] xl:h-[300px] w-full min-w-0"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{name}</span>
                                  <span className="font-mono">
                                    {formatCurrency(Number(value))}
                                  </span>
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
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-3 min-w-0">
                      {warehouseBreakdown.map((warehouse, index) => {
                        const pct =
                          totalValue > 0
                            ? Math.round((warehouse.total_value / totalValue) * 100)
                            : 0;
                        const barPct =
                          maxWarehouseValue > 0
                            ? Math.round(
                                (warehouse.total_value / maxWarehouseValue) * 100,
                              )
                            : 0;

                        return (
                          <div key={warehouse.warehouse_id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      PIE_COLORS[index % PIE_COLORS.length],
                                  }}
                                />
                                <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                                  {warehouse.warehouse_name ||
                                    warehouse.warehouse_code}
                                </span>
                              </div>
                              <span className="shrink-0 font-mono text-xs text-slate-600 dark:text-slate-300">
                                {pct}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: percentBarWidth(barPct),
                                  backgroundColor:
                                    PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              />
                            </div>
                            <div className="flex justify-between gap-2 overflow-hidden text-xs text-slate-500 dark:text-slate-400">
                              <span className="shrink-0">{formatNumber(warehouse.sku_count)} SKUs</span>
                              <span className="min-w-0 text-right">{formatCurrency(warehouse.total_value)}</span>
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
                icon={<Archive className="h-4 w-4 text-slate-500" />}
                title="Dead Stock"
                subtitle={`No movement in the last ${data?.date_context?.dead_stock_lookback_days ?? 90} days`}
                action={
                  !loading && (
                    <Badge variant="secondary">
                      {formatCurrency(deadStockValue)}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : deadStockItems.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
                    message="No dead stock detected"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">On Hand</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Age</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deadStockItems.map((item) => (
                          <TableRow key={item.product_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-950 dark:text-white">
                                  {item.product_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.product_code}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.qty_on_hand)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.stock_value)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {item.days_no_movement}+ days
                              </Badge>
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
                icon={<Clock3 className="h-4 w-4 text-blue-500" />}
                title="Recent Movements"
                subtitle={`Latest ${data?.date_context?.recent_movements_limit ?? 10} inventory events`}
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-11 w-full" />
                    ))}
                  </div>
                ) : recentMovements.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-8 w-8" />}
                    message="No recent movement activity"
                  />
                ) : (
                  <div className="space-y-3">
                    {recentMovements.slice(0, 6).map((movement, index) => (
                      <div
                        key={
                          movement._id ||
                          movement.id ||
                          `${movement.product_id || "movement"}-${index}`
                        }
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">
                            {movement.product_name ||
                              movement.productName ||
                              movement.product?.name ||
                              "Inventory movement"}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {movement.type || movement.reason || "Movement"}{" "}
                            {movement.warehouse_name
                              ? `- ${movement.warehouse_name}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                            {formatNumber(
                              Number(
                                movement.quantity ||
                                  movement.qty ||
                                  movement.total_qty ||
                                  0,
                              ),
                            )}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDashboardDateTime(
                              movement.date ||
                                movement.movementDate ||
                                movement.createdAt,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
