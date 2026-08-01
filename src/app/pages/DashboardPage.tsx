import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../layout/Layout";
import {
  dashboardApi,
  type ExecutiveDashboardData,
  type FinanceDashboardData,
  type InventoryDashboardData,
  type PurchaseDashboardData,
} from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDashboardError, formatDashboardDate, formatJournalDescription, formatJournalSourceType } from "@/app/components/dashboard/dashboardPageUtils";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/app/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowRight, FileText } from "lucide-react";
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

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--dashboard-blue-2)" },
  expenses: { label: "Expenses", color: "var(--dashboard-amber)" },
  amount: { label: "Amount", color: "var(--dashboard-blue)" },
} satisfies ChartConfig;

interface SupportData {
  inventory: InventoryDashboardData | null;
  purchase: PurchaseDashboardData | null;
  finance: FinanceDashboardData | null;
}

interface PriorityRow {
  tone: DashboardTone;
  issue: string;
  reference: string;
  exposure: string;
  age: string;
  owner: string;
  status: string;
  action: string;
  route: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [support, setSupport] = useState<SupportData>({ inventory: null, purchase: null, finance: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (opts?: { bustCache?: boolean }) => {
    try {
      setError(null);
      // Load the executive dashboard first so the page renders without waiting
      // for inventory, purchase, and finance aggregations.
      const executive = await dashboardApi.getExecutive({ refresh: Boolean(opts?.bustCache) });
      setData(executive);
      setLoading(false);
      setRefreshing(false);

      // Load support panels in the background.
      const [inventory, purchase, finance] = await Promise.allSettled([
        dashboardApi.getInventory(),
        dashboardApi.getPurchase(),
        dashboardApi.getFinance(),
      ]);
      setSupport({
        inventory: inventory.status === "fulfilled" ? inventory.value : null,
        purchase: purchase.status === "fulfilled" ? purchase.value : null,
        finance: finance.status === "fulfilled" ? finance.value : null,
      });
    } catch (err: any) {
      setError(formatDashboardError(err?.message || "Failed to load executive dashboard"));
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard({ bustCache: true });
  }, [fetchDashboard]);
  useLiveRefresh(() => fetchDashboard());

  const metrics = data?.key_metrics;
  const ar = data?.accounts_receivable;
  const entries = data?.recent_journal_entries ?? [];
  const debt = data?.upcoming_debt_payments;
  const revenue = metrics?.revenue.this_month ?? 0;
  const expenses = metrics?.expenses.this_month ?? 0;
  const profit = metrics?.net_profit.this_month ?? 0;
  const cash = metrics?.cash_balance.current ?? 0;
  const arOutstanding = ar?.outstanding_total ?? 0;
  const arOverdue = ar?.overdue_total ?? 0;
  const arCurrent = Math.max(arOutstanding - arOverdue, 0);
  const arCurrentPct = arOutstanding > 0 ? (arCurrent / arOutstanding) * 100 : 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const debtCoverage = debt?.totalAmount ? (cash / debt.totalAmount) * 100 : 100;
  const score = Math.max(0, Math.min(100, 50 + Math.min(margin, 40) * 0.7 + Math.min(arCurrentPct, 100) * 0.2 + Math.min(debtCoverage, 200) * 0.05 - (cash < 0 ? 30 : 0)));
  const statusTone: DashboardTone = cash < 0 || score < 50 ? "critical" : score < 75 ? "warning" : "healthy";
  const periodKind = data?.date_context?.selected_period_kind;
  const selectedPeriodLabel = (() => {
    if (periodKind === "fiscal_ytd") return "Fiscal year to date";
    if (data?.date_context?.selected_period_is_fallback && periodKind === "prior_month") {
      return data.date_context.selected_period_start
        ? `Prior month · ${formatDashboardDate(data.date_context.selected_period_start)} - ${formatDashboardDate(data.date_context.selected_period_end)}`
        : "Prior month";
    }
    if (data?.date_context?.selected_period_start) {
      return `${formatDashboardDate(data.date_context.selected_period_start)} - ${formatDashboardDate(data.date_context.selected_period_end)}`;
    }
    return "Current month";
  })();

  const pulseData = useMemo(() => {
    const prior = data?.period_comparison?.prior_month;
    const current = data?.period_comparison?.current_month;
    if (prior && current) {
      return [
        {
          period: "Prior",
          revenue: Math.max(prior.revenue, 0),
          expenses: Math.abs(prior.expenses),
          profit: prior.net_profit,
        },
        {
          period: "Current",
          revenue: Math.max(current.revenue, 0),
          expenses: Math.abs(current.expenses),
          profit: current.net_profit,
        },
      ];
    }
    // Legacy fallback if absolute series is missing from an older cached payload.
    const previous = (currentValue: number, change: number | null | undefined) => {
      if (change === null || change === undefined) return 0;
      if (Math.abs(currentValue) < 0.005 && change <= -99.99) return 0;
      const denom = 1 + change / 100;
      if (Math.abs(denom) < 0.0001) return 0;
      return currentValue / denom;
    };
    return [
      { period: "Prior", revenue: Math.max(previous(revenue, metrics?.revenue.vs_last_month), 0), expenses: Math.abs(previous(expenses, metrics?.expenses.vs_last_month)), profit: previous(profit, metrics?.net_profit.vs_last_month) },
      { period: "Current", revenue: Math.max(revenue, 0), expenses: Math.abs(expenses), profit },
    ];
  }, [data?.period_comparison, expenses, metrics?.expenses.vs_last_month, metrics?.net_profit.vs_last_month, metrics?.revenue.vs_last_month, profit, revenue]);

  const paymentsDue = debt?.totalAmount ?? 0;
  const openingCash = Math.max(cash - profit, 0);
  const bridgeScale = Math.max(openingCash, Math.abs(profit), paymentsDue, cash, 1);
  const bridgePct = (amount: number) => Math.max(0, Math.min(100, (Math.abs(amount) / bridgeScale) * 100));

  const priorityRows = useMemo<PriorityRow[]>(() => {
    const rows: PriorityRow[] = [];
    if (arOverdue > 0) {
      rows.push({ tone: "critical", issue: "Overdue receivables", reference: `${ar?.overdue_count ?? 0} invoices in collection queue`, exposure: formatRwf(arOverdue), age: `${ar?.overdue_count ?? 0} items`, owner: "Collections", status: "Critical", action: "Review AR", route: "/ar-aging" });
    }
    support.inventory?.low_stock_alerts.items.slice(0, 2).forEach((item) => {
      rows.push({ tone: "warning", issue: `Low stock · ${item.product_name}`, reference: `${item.product_code} · ${item.warehouse_name || "warehouse"}`, exposure: `${formatCount(item.shortage)} units short`, age: "—", owner: "Inventory", status: "Action", action: "Create PO", route: "/purchase-orders/new" });
    });
    if ((debt?.totalUpcoming ?? 0) > 0) {
      const payment = debt?.payments[0];
      if (payment) rows.push({ tone: payment.daysUntil <= 7 ? "warning" : "neutral", issue: `Payment due · ${payment.loanName}`, reference: payment.loanNumber || "scheduled settlement", exposure: formatRwf(payment.estimatedAmount), age: `${payment.daysUntil}d`, owner: "Finance", status: payment.daysUntil <= 7 ? "Due soon" : "Scheduled", action: "Review", route: "/dashboard/finance" });
    }
    if ((support.purchase?.grn_pending.count ?? 0) > 0) {
      rows.push({ tone: "warning", issue: "GRN receiving backlog", reference: `${formatCount(support.purchase?.grn_pending.count)} purchase orders`, exposure: formatRwf(support.purchase?.grn_pending.total_value), age: "Open", owner: "Receiving", status: "Pending", action: "Receive", route: "/grn" });
    }
    return rows.slice(0, 6);
  }, [ar, arOverdue, debt, support.inventory, support.purchase]);

  const revenueDelta = metrics?.revenue.vs_last_month;
  const profitDelta = metrics?.net_profit.vs_last_month;
  const kpis = [
    {
      label: periodKind === "fiscal_ytd" ? "Revenue / FYTD" : periodKind === "prior_month" ? "Revenue / prior month" : "Revenue / MTD",
      value: formatCompactRwf(revenue),
      delta: revenueDelta == null ? undefined : `${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(1)}%`,
      meta: "RWF · vs last month",
      tone: (revenueDelta != null && revenueDelta < 0 ? "critical" : "healthy") as DashboardTone,
      sparkline: pulseData.map((p) => Math.max(p.revenue, 0)),
    },
    {
      label: periodKind === "fiscal_ytd" ? "Net profit / FYTD" : periodKind === "prior_month" ? "Net profit / prior month" : "Net profit / MTD",
      value: formatCompactRwf(profit),
      delta: profitDelta == null ? undefined : `${profitDelta >= 0 ? "+" : ""}${profitDelta.toFixed(1)}%`,
      meta: `${formatPercent(margin, 1)} margin`,
      tone: (profit >= 0 ? "healthy" : "critical") as DashboardTone,
      sparkline: pulseData.map((p) => p.profit),
    },
    { label: "Cash position", value: formatCompactRwf(cash), delta: undefined, meta: "RWF · available liquidity", tone: cash >= 0 ? "healthy" as const : "critical" as const, sparkline: [openingCash, cash] },
    { label: "Overdue AR", value: formatCompactRwf(arOverdue), delta: arOverdue > 0 ? "Action" : "Clear", meta: `${formatPercent(ar?.overdue_pct_of_outstanding ?? 0)} of outstanding`, tone: arOverdue > 0 ? "warning" as const : "healthy" as const, sparkline: [arOutstanding, arOverdue] },
  ];

  return (
    <Layout>
      <div className="industrial-dashboard px-3 py-4 sm:px-5 lg:px-7">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <IndustrialDashboardHeader
            title="Executive overview"
            subtitle="A decision-ready view of cash, margin, collections, and operational exposure."
            endpoint="/dashboard/executive"
            generatedAt={data?.generated_at}
            loading={loading}
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchDashboard({ bustCache: true }); }}
            tone={loading ? "neutral" : statusTone}
            context={<div className="industrial-filter"><span>Period</span><strong>{selectedPeriodLabel}</strong></div>}
            actions={<Button type="button" variant="outline" size="sm" className="industrial-button" onClick={() => window.print()}><FileText className="h-3.5 w-3.5" /> Export report</Button>}
          />

          {error && <IndustrialState status="error" message={error} onRetry={fetchDashboard} />}

          <IndustrialKpiStrip items={kpis} />

          <IndustrialSection eyebrow="01 · Financial telemetry" title="Profit and liquidity telemetry" subtitle="Visible scales, labeled units, and direct values for first-pass decisions.">
            <div className="grid gap-4 border border-(--dashboard-rule-strong) bg-(--dashboard-surface) xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
              <div className="min-w-0 border-b border-(--dashboard-rule) p-4 xl:border-b-0 xl:border-r">
                {loading ? <IndustrialState status="loading" /> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <AreaChart accessibilityLayer data={pulseData} margin={{ left: 8, right: 18, top: 18, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="2 4" vertical />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactRwf(Number(value)).replace("RWF ", "")} width={52} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <span className="industrial-mono">{name}: {formatRwf(Number(value))}</span>} />} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--dashboard-blue-2)" fill="var(--dashboard-blue-2)" fillOpacity={0.08} strokeWidth={2} name="Revenue" />
                      <Area type="monotone" dataKey="expenses" stroke="var(--dashboard-amber)" fill="var(--dashboard-amber)" fillOpacity={0.08} strokeWidth={2} name="Expenses" />
                      <Area type="monotone" dataKey="profit" stroke="var(--dashboard-green)" fill="var(--dashboard-green)" fillOpacity={0.06} strokeWidth={2} name="Profit" />
                    </AreaChart>
                  </ChartContainer>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--dashboard-rule) pt-2 text-[10px] text-(--dashboard-muted)">
                  <span>Two-period comparison from executive metrics{data?.date_context?.selected_period_is_fallback ? " · KPI cards use prior period with activity" : ""}</span>
                  <span className="industrial-mono">Revenue {formatCompactRwf(revenue)} · Expense {formatCompactRwf(expenses)}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between border-b border-(--dashboard-rule) pb-2">
                  <h3 className="text-sm font-bold text-(--dashboard-ink)">Cash bridge / 30d</h3>
                  <IndustrialStatusLabel label={debtCoverage >= 100 ? "Coverage healthy" : "Coverage short"} tone={debtCoverage >= 100 ? "healthy" : "critical"} />
                </div>
                <div className="mt-4 space-y-4">
                  <IndustrialProgress label="Opening cash" value={bridgePct(openingCash)} detail={formatCompactRwf(openingCash)} tone="neutral" />
                  <IndustrialProgress label="Net inflow" value={bridgePct(profit)} detail={formatCompactRwf(profit)} tone={profit >= 0 ? "healthy" : "critical"} />
                  <IndustrialProgress label="Payments due" value={bridgePct(paymentsDue)} detail={formatCompactRwf(paymentsDue)} tone="warning" />
                </div>
                <div className="mt-5 border-t-2 border-(--dashboard-ink) pt-3">
                  <div className="flex items-end justify-between gap-4">
                    <div><p className="industrial-eyebrow">Closing cash</p><p className="industrial-value mt-1 text-[28px]">{formatCompactRwf(cash)}</p></div>
                    <div className="text-right"><p className="industrial-eyebrow">Debt coverage</p><p className={`industrial-value mt-1 text-[18px] industrial-tone-${debtCoverage >= 100 ? "healthy" : "critical"}`}>{formatPercent(debtCoverage)}</p></div>
                  </div>
                  <div className="mt-3 h-2 bg-slate-100"><div className={`h-2 ${debtCoverage >= 100 ? "bg-(--dashboard-green)" : "bg-(--dashboard-red)"}`} style={{ width: `${Math.max(0, Math.min(100, debtCoverage / 1.5))}%` }} /></div>
                </div>
              </div>
            </div>
          </IndustrialSection>

          <IndustrialSection eyebrow="02 · Operating controls" title="Priority manifest" subtitle="Live exceptions ranked by exposure and paired with the next operational action." action={<span className="industrial-mono text-[10px] text-(--dashboard-muted)">{formatCount(priorityRows.length)} visible controls</span>}>
            {loading ? <IndustrialState status="loading" /> : priorityRows.length === 0 ? <IndustrialState status="empty" message="No operational exceptions for the selected period." /> : (
              <IndustrialTableFrame>
                <Table>
                  <TableHeader><TableRow><TableHead className="w-5" /><TableHead>Entity / issue</TableHead><TableHead>Exposure</TableHead><TableHead>Age</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Next action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {priorityRows.map((row) => (
                      <TableRow key={`${row.issue}-${row.reference}`}>
                        <TableCell><span className={`block h-2.5 w-2.5 ${row.tone === "critical" ? "bg-(--dashboard-red)" : row.tone === "warning" ? "bg-(--dashboard-amber)" : "bg-slate-400"}`} aria-label={row.tone} /></TableCell>
                        <TableCell><div className="font-semibold">{row.issue}</div><div className="industrial-mono mt-0.5 text-[10px] text-(--dashboard-muted)">{row.reference}</div></TableCell>
                        <TableCell className="industrial-mono font-semibold">{row.exposure}</TableCell><TableCell className="industrial-mono">{row.age}</TableCell><TableCell>{row.owner}</TableCell><TableCell><IndustrialStatusLabel label={row.status} tone={row.tone} /></TableCell>
                        <TableCell className="text-right"><Button type="button" variant={row.tone === "critical" ? "default" : "outline"} size="sm" className="industrial-button" onClick={() => navigate(row.route)}>{row.action}<ArrowRight className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </IndustrialTableFrame>
            )}
            <IndustrialSourceNote>Sources: /dashboard/executive + /dashboard/inventory + /dashboard/purchase · rows are omitted when an optional source endpoint is unavailable.</IndustrialSourceNote>
          </IndustrialSection>

          <IndustrialSection eyebrow="03 · Audit record" title="Recent journal activity" subtitle="Latest entries returned by the executive endpoint, aligned for review and export." action={<span className="industrial-mono text-[10px] text-(--dashboard-muted)">{formatCount(entries.length)} records</span>}>
            {loading ? <IndustrialState status="loading" /> : entries.length === 0 ? <IndustrialState status="empty" message="No journal entries for the selected period." /> : (
              <IndustrialTableFrame>
                <Table>
                  <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Source</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                  <TableBody>{entries.slice(0, 8).map((entry) => <TableRow key={entry._id}><TableCell className="industrial-mono text-(--dashboard-muted)">{formatDashboardDate(entry.date)}</TableCell><TableCell>{formatJournalSourceType(entry.sourceType)}</TableCell><TableCell className="font-semibold">{formatJournalDescription(entry.description) || entry.entryNumber || "Journal entry"}</TableCell><TableCell className="industrial-mono text-right">{formatRwf(entry.totalDebit ?? 0)}</TableCell><TableCell className="industrial-mono text-right">{formatRwf(entry.totalCredit ?? 0)}</TableCell><TableCell className="text-right"><IndustrialStatusLabel label="Posted" tone="healthy" /></TableCell></TableRow>)}</TableBody>
                </Table>
              </IndustrialTableFrame>
            )}
            <IndustrialSourceNote>Journal values are fetched from the executive snapshot and exclude presentation-only placeholder records.</IndustrialSourceNote>
          </IndustrialSection>

          <div className="flex flex-col gap-2 border-t border-(--dashboard-rule-strong) pt-3 text-[10px] text-(--dashboard-muted) sm:flex-row sm:items-center sm:justify-between">
            <span>State coverage · Loading preserves geometry · Error provides retry · Empty states explain scope</span>
            <span className="industrial-mono">KUBIKA · live dashboard system</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
