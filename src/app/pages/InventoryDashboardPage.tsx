import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../layout/Layout";
import { dashboardApi, type InventoryDashboardData } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDashboardError, formatDashboardDateTime } from "@/app/components/dashboard/dashboardPageUtils";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/app/components/ui/chart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ArrowRight, Package, RefreshCw } from "lucide-react";
import {
  IndustrialDashboardHeader,
  IndustrialKpiStrip,
  IndustrialSection,
  IndustrialSourceNote,
  IndustrialState,
  IndustrialStatusLabel,
  IndustrialTableFrame,
  IndustrialProgress,
  formatCompactRwf,
  formatCount,
  formatPercent,
  formatRwf,
  type DashboardTone,
} from "@/app/components/dashboard/IndustrialDashboard";

const movementConfig = { total_qty: { label: "Units moved", color: "var(--dashboard-blue-2)" } } satisfies ChartConfig;
const warehouseConfig = { total_value: { label: "Stock value", color: "var(--dashboard-blue)" } } satisfies ChartConfig;

export default function InventoryDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      setData(await dashboardApi.getInventory());
    } catch (err: any) {
      setError(formatDashboardError(err?.message || "Failed to load inventory dashboard"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useLiveRefresh(fetchDashboard);

  const summary = data?.summary;
  const lowStock = data?.low_stock_alerts.items ?? [];
  const deadStock = data?.dead_stock.items ?? [];
  const movements = data?.recent_movements ?? [];
  const warehouses = data?.warehouse_breakdown ?? [];
  const totalSku = summary?.total_sku_count ?? 0;
  const totalUnits = summary?.total_units ?? 0;
  const reserved = summary?.total_reserved ?? 0;
  const available = summary?.total_available ?? 0;
  const totalValue = summary?.total_value ?? 0;
  const stockCoverage = totalSku > 0 ? ((summary?.in_stock_count ?? 0) / totalSku) * 100 : 0;
  const availableRate = totalUnits > 0 ? (available / totalUnits) * 100 : 0;
  const reservedRate = totalUnits > 0 ? (reserved / totalUnits) * 100 : 0;
  const atRisk = (data?.low_stock_alerts.count ?? 0) + (summary?.zero_stock_count ?? 0);
  const riskRate = totalSku > 0 ? (atRisk / totalSku) * 100 : 0;

  const movementData = useMemo(() => data?.top_moving_products.slice(0, 7).map((item) => ({ name: item.product_name.length > 18 ? `${item.product_name.slice(0, 18)}…` : item.product_name, total_qty: item.total_qty })) ?? [], [data?.top_moving_products]);
  const warehouseData = useMemo(() => warehouses.slice(0, 7).map((item) => ({ name: item.warehouse_name || item.warehouse_code, total_value: item.total_value })), [warehouses]);

  const kpis = [
    { label: "Total SKUs", value: formatCount(totalSku), meta: `${formatCount(summary?.in_stock_count)} stocked · ${formatCount(summary?.zero_stock_count)} at zero`, tone: atRisk > 0 ? "warning" as const : "healthy" as const, sparkline: [4, 5, 5, 6, 6, 7, 8] },
    { label: "Total units", value: formatCount(totalUnits), meta: `${formatCount(reserved)} reserved · ${formatPercent(reservedRate)} of stock`, tone: "healthy" as const, sparkline: [5, 5, 6, 6, 7, 7, 8] },
    { label: "Stock value", value: formatCompactRwf(totalValue), meta: `Dead stock ${formatCompactRwf(data?.dead_stock.total_value ?? 0)}`, tone: "neutral" as const, sparkline: [3, 4, 4, 5, 6, 6, 7] },
    { label: "Available units", value: formatCount(available), delta: riskRate > 20 ? "Action" : "Stable", meta: `${formatPercent(availableRate)} available after reservations`, tone: riskRate > 20 ? "warning" as const : "healthy" as const, sparkline: [7, 7, 6, 7, 8, 8, 8] },
  ];

  return (
    <Layout>
      <div className="industrial-dashboard px-3 py-4 sm:px-5 lg:px-7">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <IndustrialDashboardHeader
            eyebrow="Operations · Inventory control"
            title="Inventory dashboard"
            subtitle="See what is available, what is running low, and where stock value sits by warehouse."
            endpoint="/dashboard/inventory"
            generatedAt={data?.generated_at}
            loading={loading}
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchDashboard(); }}
            tone={loading ? "neutral" : atRisk > 0 ? "warning" : "healthy"}
            context={<div className="industrial-filter"><span>Scope</span><strong>All warehouses</strong></div>}
            actions={<Button type="button" variant="outline" size="sm" className="industrial-button" onClick={() => navigate("/products/new")}><Package className="h-3.5 w-3.5" /> New product</Button>}
          />
          {error && <IndustrialState status="error" message={error} onRetry={fetchDashboard} />}
          <IndustrialKpiStrip items={kpis} />

          <IndustrialSection eyebrow="01 · Stock position" title="Inventory control room" subtitle="Availability, reservation pressure, and SKU risk in one operational view." action={<span className="industrial-mono text-[10px] text-(--dashboard-muted)">{formatPercent(stockCoverage)} SKU coverage</span>}>
            <div className="grid gap-4 border border-(--dashboard-rule-strong) bg-(--dashboard-surface) p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
              <div className="min-w-0">
                {loading ? <IndustrialState status="loading" /> : movementData.length === 0 ? <IndustrialState status="empty" message="No dispatch activity in this period." /> : <ChartContainer config={movementConfig} className="h-[260px] w-full"><BarChart accessibilityLayer data={movementData} layout="vertical" margin={{ left: 12, right: 24, top: 8, bottom: 8 }}><CartesianGrid strokeDasharray="2 4" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => formatCount(Number(value))} /><YAxis type="category" dataKey="name" width={116} axisLine={false} tickLine={false} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => `${formatCount(Number(value))} units`} />} /><Bar dataKey="total_qty" fill="var(--color-total_qty)" radius={[0, 2, 2, 0]}><LabelList dataKey="total_qty" position="right" formatter={(value: number) => formatCount(value)} className="fill-slate-600 text-[10px]" /></Bar></BarChart></ChartContainer>}
                <IndustrialSourceNote>Top moving products · last {data?.date_context.top_moving_window_days ?? 30} days · units dispatched</IndustrialSourceNote>
              </div>
              <div className="space-y-4 border-t border-(--dashboard-rule) pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <IndustrialProgress label="Available stock" value={availableRate} tone="healthy" />
                <IndustrialProgress label="Reserved stock" value={reservedRate} tone="neutral" />
                <IndustrialProgress label="SKU risk" value={Math.min(100, riskRate)} tone={riskRate > 20 ? "critical" : "warning"} />
                <div className="grid grid-cols-2 gap-3 border-t border-(--dashboard-rule) pt-4"><div><p className="industrial-eyebrow">Warehouses</p><p className="industrial-value mt-1 text-[24px]">{formatCount(warehouses.length)}</p></div><div><p className="industrial-eyebrow">Dead stock</p><p className="industrial-value mt-1 text-[24px]">{formatCount(deadStock.length)}</p></div></div>
              </div>
            </div>
          </IndustrialSection>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <IndustrialSection eyebrow="02 · Replenishment" title="Low-stock priorities" subtitle="Items below reorder point, ordered by shortage." action={<span className="industrial-mono text-[10px] industrial-tone-warning">{formatCount(data?.low_stock_alerts.count)} alerts</span>}>
              {loading ? <IndustrialState status="loading" /> : lowStock.length === 0 ? <IndustrialState status="empty" message="All products are above reorder point." /> : <IndustrialTableFrame><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Warehouse</TableHead><TableHead className="text-right">Available</TableHead><TableHead className="text-right">Shortage</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{lowStock.slice(0, 8).map((item) => <TableRow key={`${item.product_id}-${item.warehouse_id}`}><TableCell><div className="font-semibold">{item.product_name}</div><div className="industrial-mono mt-0.5 text-[10px] text-(--dashboard-muted)">{item.product_code}</div></TableCell><TableCell>{item.warehouse_name || "—"}</TableCell><TableCell className={`industrial-mono text-right font-semibold ${item.qty_available <= 0 ? "industrial-tone-critical" : ""}`}>{formatCount(item.qty_available)}</TableCell><TableCell className="text-right"><IndustrialStatusLabel label={`${formatCount(item.shortage)} short`} tone="warning" /></TableCell><TableCell className="text-right"><Button type="button" variant="outline" size="sm" className="industrial-button" onClick={() => navigate("/purchase-orders/new")}>Create PO <ArrowRight className="h-3 w-3" /></Button></TableCell></TableRow>)}</TableBody></Table></IndustrialTableFrame>}
              <IndustrialSourceNote>Source: /dashboard/inventory · click Create PO to continue the replenishment workflow.</IndustrialSourceNote>
            </IndustrialSection>
            <IndustrialSection eyebrow="03 · Warehouse value" title="Stock value by warehouse" subtitle="Allocation of current stock value across active warehouses.">
              {loading ? <IndustrialState status="loading" /> : warehouseData.length === 0 ? <IndustrialState status="empty" message="No warehouse data available." /> : <ChartContainer config={warehouseConfig} className="h-[290px] w-full"><BarChart accessibilityLayer data={warehouseData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}><CartesianGrid strokeDasharray="2 4" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactRwf(Number(value)).replace("RWF ", "")} /><YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} /><Bar dataKey="total_value" fill="var(--color-total_value)" radius={[0, 2, 2, 0]}><LabelList dataKey="total_value" position="right" formatter={(value: number) => formatCompactRwf(value).replace("RWF ", "")} className="fill-slate-600 text-[10px]" /></Bar></BarChart></ChartContainer>}
              <IndustrialSourceNote>Stock value is calculated from the live warehouse breakdown payload.</IndustrialSourceNote>
            </IndustrialSection>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <IndustrialSection eyebrow="04 · Aging inventory" title="Dead stock" subtitle={`No movement in the last ${data?.date_context.dead_stock_lookback_days ?? 90} days.`} action={<span className="industrial-mono text-[10px] industrial-tone-warning">{formatCompactRwf(data?.dead_stock.total_value ?? 0)}</span>}>
              {loading ? <IndustrialState status="loading" /> : deadStock.length === 0 ? <IndustrialState status="empty" message="No dead stock detected." /> : <IndustrialTableFrame><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Age</TableHead></TableRow></TableHeader><TableBody>{deadStock.slice(0, 8).map((item) => <TableRow key={item.product_id}><TableCell><div className="font-semibold">{item.product_name}</div><div className="industrial-mono mt-0.5 text-[10px] text-(--dashboard-muted)">{item.product_code}</div></TableCell><TableCell className="industrial-mono text-right">{formatCount(item.qty_on_hand)}</TableCell><TableCell className="industrial-mono text-right">{formatRwf(item.stock_value)}</TableCell><TableCell className="text-right"><IndustrialStatusLabel label={`${formatCount(item.days_no_movement)}d`} tone="warning" /></TableCell></TableRow>)}</TableBody></Table></IndustrialTableFrame>}
            </IndustrialSection>
            <IndustrialSection eyebrow="05 · Event stream" title="Recent movements" subtitle={`Latest ${data?.date_context.recent_movements_limit ?? 10} inventory events.`}>
              {loading ? <IndustrialState status="loading" /> : movements.length === 0 ? <IndustrialState status="empty" message="No recent movement activity." /> : <IndustrialTableFrame><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Movement</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Recorded</TableHead></TableRow></TableHeader><TableBody>{movements.slice(0, 8).map((movement: any, index) => <TableRow key={movement._id || movement.id || index}><TableCell className="font-semibold">{movement.product_name || movement.productName || movement.product?.name || "Inventory movement"}</TableCell><TableCell>{movement.type || movement.reason || "Movement"}{movement.warehouse_name ? ` · ${movement.warehouse_name}` : ""}</TableCell><TableCell className="industrial-mono text-right">{formatCount(Number(movement.quantity || movement.qty || movement.total_qty || 0))}</TableCell><TableCell className="industrial-mono text-right text-(--dashboard-muted)">{formatDashboardDateTime(movement.date || movement.movementDate || movement.createdAt)}</TableCell></TableRow>)}</TableBody></Table></IndustrialTableFrame>}
            </IndustrialSection>
          </div>
        </div>
      </div>
    </Layout>
  );
}
