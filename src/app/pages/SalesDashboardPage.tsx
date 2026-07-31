import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../layout/Layout";
import { dashboardApi, type SalesDashboardData } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDashboardError } from "@/app/components/dashboard/dashboardPageUtils";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/app/components/ui/chart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
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

const billingConfig = { value: { label: "Amount", color: "var(--dashboard-blue)" } } satisfies ChartConfig;
const agingConfig = { not_due: { label: "Not due", color: "var(--dashboard-green)" }, days_1_30: { label: "1–30 days", color: "var(--dashboard-blue-2)" }, days_31_60: { label: "31–60 days", color: "var(--dashboard-amber)" }, days_61_90: { label: "61–90 days", color: "#c2410c" }, days_90_plus: { label: "90+ days", color: "var(--dashboard-red)" } } satisfies ChartConfig;

function statusTone(status: string): DashboardTone {
  if (status === "cancelled") return "critical";
  if (status === "fully_paid" || status === "confirmed") return "healthy";
  if (status === "partially_paid" || status === "draft") return "warning";
  return "neutral";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SalesDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      setData(await dashboardApi.getSales());
    } catch (err: any) {
      setError(formatDashboardError(err?.message || "Failed to load sales dashboard"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useLiveRefresh(fetchDashboard);

  const summary = data?.summary;
  const invoices = data?.invoices;
  const aging = data?.ar_aging;
  const topClients = data?.top_clients ?? [];
  const statuses = data?.by_status_list ?? [];
  const creditNotes = data?.credit_notes;
  const invoiced = invoices?.total_invoiced ?? summary?.total_invoiced_mtd ?? 0;
  const collected = invoices?.total_collected ?? 0;
  const outstanding = invoices?.total_outstanding ?? summary?.total_outstanding_ar ?? 0;
  const overdue = aging?.total_overdue ?? 0;
  const collectionRate = data?.collection_rate.collection_rate_pct ?? summary?.collection_rate_pct ?? 0;
  const overdueRate = outstanding > 0 ? (overdue / outstanding) * 100 : 0;
  const creditNoteRate = invoiced > 0 ? ((creditNotes?.total_value ?? 0) / invoiced) * 100 : 0;
  const health: DashboardTone = collectionRate < 65 ? "critical" : overdueRate > 25 ? "warning" : "healthy";

  const billingData = [
    { label: "Billed", value: invoiced, fill: "#1e3a8a" },
    { label: "Collected", value: collected, fill: "#16734a" },
    { label: "Open AR", value: outstanding, fill: "#d97706" },
    { label: "Overdue", value: overdue, fill: "#b42318" },
  ].filter((item) => item.value > 0);

  const kpis = [
    { label: "Invoices / MTD", value: formatCount(summary?.invoices_raised_mtd ?? 0), meta: "Confirmed and active invoices", tone: "neutral" as const, sparkline: [3, 4, 5, 5, 6, 7, 8] },
    { label: "Total invoiced", value: formatCompactRwf(invoiced), meta: "Month to date · excludes drafts", tone: "healthy" as const, sparkline: [3, 4, 5, 5, 6, 8, 9] },
    { label: "Total collected", value: formatCompactRwf(collected), meta: `Open AR ${formatCompactRwf(outstanding)}`, tone: "healthy" as const, sparkline: [2, 3, 4, 5, 6, 6, 8] },
    { label: "Collection rate", value: formatPercent(collectionRate, 1), delta: collectionRate < 65 ? "Action" : "Stable", meta: `Overdue exposure ${formatPercent(overdueRate)}`, tone: health, sparkline: [8, 7, 7, 8, 8, 9, 9] },
  ];

  return (
    <Layout>
      <div className="industrial-dashboard px-3 py-4 sm:px-5 lg:px-7">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <IndustrialDashboardHeader
            eyebrow="Operations · Sales & receivables"
            title="Sales dashboard"
            subtitle="Track billed revenue, collected cash, and the receivables that still need an owner."
            endpoint="/dashboard/sales"
            generatedAt={data?.generated_at}
            loading={loading}
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchDashboard(); }}
            tone={loading ? "neutral" : health}
            context={<div className="industrial-filter"><span>Period</span><strong>Current month</strong></div>}
            actions={<Button type="button" variant="outline" size="sm" className="industrial-button" onClick={() => navigate("/invoices/new")}><FileText className="h-3.5 w-3.5" /> New invoice</Button>}
          />
          {error && <IndustrialState status="error" message={error} onRetry={fetchDashboard} />}
          <IndustrialKpiStrip items={kpis} />

          <IndustrialSection eyebrow="01 · Billing conversion" title="Billing to cash" subtitle="Billed revenue, collected cash, open receivables, and overdue exposure in one view." action={<IndustrialStatusLabel label={health === "healthy" ? "Collection healthy" : "Collection needs attention"} tone={health} />}>
            <div className="grid gap-4 border border-(--dashboard-rule-strong) bg-(--dashboard-surface) p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
              <div className="min-w-0">
                {loading ? <IndustrialState status="loading" /> : billingData.length === 0 ? <IndustrialState status="empty" message="No sales conversion data for this period." /> : <ChartContainer config={billingConfig} className="h-[260px] w-full"><BarChart accessibilityLayer data={billingData} margin={{ left: 4, right: 26, top: 18, bottom: 10 }}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactRwf(Number(value)).replace("RWF ", "")} width={54} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} /><Bar dataKey="value" radius={[2, 2, 0, 0]}>{billingData.map((item) => <Bar key={item.label} dataKey="value" fill={item.fill} />)}<LabelList dataKey="value" position="top" formatter={(value: number) => formatCompactRwf(value).replace("RWF ", "")} className="fill-slate-700 text-[10px]" /></Bar></BarChart></ChartContainer>}
                <IndustrialSourceNote>Amount axis is RWF · the chart remains legible without hover and offers tooltips for exact values.</IndustrialSourceNote>
              </div>
              <div className="space-y-4 border-t border-(--dashboard-rule) pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"><IndustrialProgress label="Cash conversion" value={Math.min(100, collectionRate)} detail={formatPercent(collectionRate, 1)} tone="healthy" /><IndustrialProgress label="AR overdue exposure" value={Math.min(100, overdueRate)} detail={formatPercent(overdueRate)} tone={overdueRate > 25 ? "critical" : "warning"} /><IndustrialProgress label="Credit-note ratio" value={Math.min(100, creditNoteRate)} detail={formatPercent(creditNoteRate, 1)} tone="warning" /><div className="grid grid-cols-2 gap-3 border-t border-(--dashboard-rule) pt-4"><div><p className="industrial-eyebrow">Collected</p><p className="industrial-value mt-1 text-[21px]">{formatCompactRwf(collected)}</p></div><div><p className="industrial-eyebrow">Overdue</p><p className="industrial-value mt-1 text-[21px] industrial-tone-critical">{formatCompactRwf(overdue)}</p></div></div></div>
            </div>
          </IndustrialSection>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <IndustrialSection eyebrow="02 · Receivables" title="AR aging" subtitle="Outstanding receivables by due-status bucket." action={<span className="industrial-mono text-[10px] text-(--dashboard-muted)">{formatCompactRwf(outstanding)} outstanding</span>}>
              {loading ? <IndustrialState status="loading" /> : !aging || aging.total_ar_outstanding === 0 ? <IndustrialState status="empty" message="No outstanding receivables." /> : <div className="space-y-4"><ChartContainer config={agingConfig} className="h-[110px] w-full"><BarChart accessibilityLayer data={[{ label: "AR outstanding", ...aging }]} layout="vertical" margin={{ left: 0, right: 10, top: 10, bottom: 10 }}><XAxis type="number" hide domain={[0, aging.total_ar_outstanding]} /><YAxis type="category" dataKey="label" hide /><ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <span className="industrial-mono">{name}: {formatRwf(Number(value))}</span>} />} /><Bar dataKey="not_due" stackId="aging" fill="var(--color-not_due)" /><Bar dataKey="days_1_30" stackId="aging" fill="var(--color-days_1_30)" /><Bar dataKey="days_31_60" stackId="aging" fill="var(--color-days_31_60)" /><Bar dataKey="days_61_90" stackId="aging" fill="var(--color-days_61_90)" /><Bar dataKey="days_90_plus" stackId="aging" fill="var(--color-days_90_plus)" /></BarChart></ChartContainer><div className="grid gap-2 sm:grid-cols-5">{(["not_due", "days_1_30", "days_31_60", "days_61_90", "days_90_plus"] as const).map((key) => <div key={key} className="border-t border-(--dashboard-rule) pt-2"><p className="text-[10px] font-semibold text-(--dashboard-muted)">{agingConfig[key].label}</p><p className="industrial-mono mt-1 text-[11px] font-semibold">{formatCompactRwf(aging[key])}</p><p className="mt-0.5 text-[10px] text-(--dashboard-muted)">{formatPercent(aging.total_ar_outstanding > 0 ? (aging[key] / aging.total_ar_outstanding) * 100 : 0)}</p></div>)}</div></div>}
              <IndustrialSourceNote>Source: /dashboard/sales · amounts exclude draft invoices.</IndustrialSourceNote>
            </IndustrialSection>
            <IndustrialSection eyebrow="03 · Customer exposure" title="Top clients" subtitle="Revenue, collections, and remaining exposure by client.">
              {loading ? <IndustrialState status="loading" /> : topClients.length === 0 ? <IndustrialState status="empty" message="No client data available." /> : <IndustrialTableFrame><Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Invoiced</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader><TableBody>{topClients.slice(0, 7).map((client) => <TableRow key={client.client_id}><TableCell><div className="font-semibold">{client.client_name}</div><div className="industrial-mono text-[10px] text-(--dashboard-muted)">{client.client_code || "—"}</div></TableCell><TableCell className="industrial-mono text-right">{formatCompactRwf(client.total_invoiced)}</TableCell><TableCell className={`industrial-mono text-right ${client.outstanding > 0 ? "industrial-tone-warning" : ""}`}>{formatCompactRwf(client.outstanding)}</TableCell></TableRow>)}</TableBody></Table></IndustrialTableFrame>}
            </IndustrialSection>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <IndustrialSection eyebrow="04 · Invoice lifecycle" title="Invoice status" subtitle="Count and value by lifecycle state.">
              {loading ? <IndustrialState status="loading" /> : statuses.length === 0 ? <IndustrialState status="empty" message="No invoices found." /> : <IndustrialTableFrame><Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader><TableBody>{statuses.map((status) => { const total = statuses.reduce((sum, item) => sum + item.count, 0); const pct = total > 0 ? (status.count / total) * 100 : 0; return <TableRow key={status.status}><TableCell><IndustrialStatusLabel label={statusLabel(status.status)} tone={statusTone(status.status)} /></TableCell><TableCell className="industrial-mono text-right">{formatCount(status.count)}</TableCell><TableCell className="industrial-mono text-right">{formatCompactRwf(status.total_amount)}</TableCell><TableCell className="industrial-mono text-right">{formatPercent(pct)}</TableCell></TableRow>; })}</TableBody></Table></IndustrialTableFrame>}
            </IndustrialSection>
            <IndustrialSection eyebrow="05 · Revenue leakage" title="Credit notes this month" subtitle="Reversals against invoiced value." action={<Button type="button" variant="outline" size="sm" className="industrial-button" onClick={() => navigate("/credit-notes")}>Open credit notes <ArrowRight className="h-3 w-3" /></Button>}>
              {loading ? <IndustrialState status="loading" /> : <div className="grid gap-4 sm:grid-cols-3"><div><p className="industrial-eyebrow">Count</p><p className="industrial-value mt-2 text-[28px]">{formatCount(creditNotes?.count)}</p></div><div><p className="industrial-eyebrow">Total value</p><p className="industrial-value mt-2 text-[28px] industrial-tone-critical">{formatCompactRwf(creditNotes?.total_value)}</p></div><div><p className="industrial-eyebrow">Of invoiced</p><p className="industrial-value mt-2 text-[28px]">{formatPercent(creditNoteRate, 1)}</p></div></div>}
            </IndustrialSection>
          </div>
        </div>
      </div>
    </Layout>
  );
}
