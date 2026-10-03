import { useState, useEffect } from "react";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  CalendarDays,
  Printer,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  CalendarClock,
  ShieldAlert,
  Globe,
  Scale,
  AlertTriangle,
  Lock,
  Users,
  Landmark,
  Banknote,
  Percent,
  ArrowRight,
  Download,
  CheckCircle,
  BarChart3,
  Activity,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { reportsApi, type DebtMaturityReport, type DebtMaturityBucket, type DebtMaturityLoan } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  if (n === 0) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtCompact = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
};

/* ═══════════════════════════════════════════════════════════════
   METRIC TILE
   ═══════════════════════════════════════════════════════════════ */
function MetricTile({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone: "slate" | "blue" | "emerald" | "amber" | "red" | "indigo";
}) {
  const toneMap: Record<string, string> = {
    slate:
      "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800",
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
    indigo:
      "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
  };
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneMap[tone]}`}>{icon}</div>
        </div>
        {subtitle && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO HEADER
   ═══════════════════════════════════════════════════════════════ */
function HeroHeader({ report }: { report: DebtMaturityReport }) {
  const total = report?.summary?.total_debt ?? 0;
  const withMaturity = report?.summary?.debt_with_maturity_date ?? 0;
  const pct = total > 0 ? Math.round((withMaturity / total) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid items-stretch gap-5 p-5 xl:grid-cols-[1fr_200px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
              <Landmark className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Debt Maturity Schedule
            </h1>
            <Badge variant="secondary" className="h-6">
              IFRS 7
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Undiscounted cash flow &amp; maturity disclosure as at{" "}
            {format(parseISO(report.report_date), "dd MMM yyyy")}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {report?.summary?.total_loans ?? 0} loans ·{" "}
            {report?.buckets?.reduce((acc, b) => acc + (b.loan_count ?? 0), 0)} in buckets
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-9 gap-1.5 dark:border-slate-700 dark:text-slate-200"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 dark:border-slate-700 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Maturity Coverage
            </p>
            <p className="mt-1 text-4xl font-bold text-slate-950 dark:text-white">{pct}%</p>
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              {fmt(withMaturity)} / {fmt(total)}
            </p>
            <div className="mt-3 h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MATURITY TIMELINE BAR
   ═══════════════════════════════════════════════════════════════ */
function MaturityTimeline({ buckets }: { buckets: DebtMaturityBucket[] }) {
  const regular = buckets.filter((b) => b.key !== "undetermined");
  const maxFlow = Math.max(...regular.map((b) => b.total_cash_flow || 0), 1);

  const bucketMeta: Record<string, { color: string; bg: string; border: string }> = {
    current_year: { color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800" },
    year_1: { color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800" },
    year_2: { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800" },
    year_3: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800" },
    year_4: { color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800" },
    year_5: { color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800" },
    beyond_5_years: { color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-950/20", border: "border-slate-200 dark:border-slate-800" },
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <ArrowRight className="h-4 w-4 text-indigo-500" />
          Maturity Timeline
        </CardTitle>
        <CardDescription className="text-xs">Cash flow by maturity bucket</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {regular.map((bucket) => {
          const meta = bucketMeta[bucket.key] || bucketMeta.beyond_5_years;
          const pct = Math.min(100, ((bucket.total_cash_flow || 0) / maxFlow) * 100);
          const principalPct =
            bucket.total_cash_flow > 0
              ? Math.round(((bucket.principal_amount || 0) / bucket.total_cash_flow) * 100)
              : 0;
          const interestPct = 100 - principalPct;

          return (
            <div key={bucket.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{bucket.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-500">{bucket.loan_count} loans</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {fmt(bucket.total_cash_flow)}
                  </span>
                </div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-slate-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-full bg-indigo-500"
                    style={{ width: `${principalPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-500">
                <span>Principal {fmt(bucket.principal_amount)} ({principalPct}%)</span>
                <span>Interest {fmt(bucket.interest_amount)} ({interestPct}%)</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASH FLOW BAR CHART
   ═══════════════════════════════════════════════════════════════ */
function CashFlowChart({ buckets }: { buckets: DebtMaturityBucket[] }) {
  const regular = buckets.filter((b) => b.key !== "undetermined");
  const data = regular.map((b) => ({
    name: b.label.replace("Year ", "Y").replace("Current Year", "Current").replace("Beyond 5 Years", "5+ Yrs"),
    Principal: b.principal_amount || 0,
    Interest: b.interest_amount || 0,
  }));

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          Cash Flow Composition
        </CardTitle>
        <CardDescription className="text-xs">Principal vs Interest by bucket</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" tickFormatter={(v) => fmtCompact(v)} />
              <ReTooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Principal" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Interest" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECURITY CLASSIFICATION DONUT
   ═══════════════════════════════════════════════════════════════ */
function SecurityDonut({ report }: { report: DebtMaturityReport }) {
  const cb = report.classification_breakdown;
  const secured = cb?.security?.secured?.amount ?? 0;
  const unsecured = cb?.security?.unsecured?.amount ?? 0;
  const data = [
    { name: "Secured", value: secured, fill: "#10b981" },
    { name: "Unsecured", value: unsecured, fill: "#94a3b8" },
  ];
  const total = secured + unsecured;

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Lock className="h-4 w-4 text-emerald-500" />
          Security Breakdown
        </CardTitle>
        <CardDescription className="text-xs">IFRS 7.33 — Secured vs Unsecured</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ReTooltip formatter={(value: number) => fmt(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex w-full justify-center gap-4">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {d.name}: <span className="font-mono font-bold">{fmt(d.value)}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Total: {fmt(total)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TYPE CLASSIFICATION BARS
   ═══════════════════════════════════════════════════════════════ */
function TypeBreakdown({ report }: { report: DebtMaturityReport }) {
  const types = report.classification_breakdown?.type;
  if (!types) return null;
  const entries = Object.entries(types)
    .filter(([, v]) => v.count > 0)
    .sort(([, a], [, b]) => b.amount - a.amount);
  const maxAmt = Math.max(...entries.map(([, v]) => v.amount), 1);

  const typeColors: Record<string, string> = {
    bank_loan: "bg-blue-500",
    bond: "bg-indigo-500",
    finance_lease: "bg-purple-500",
    related_party: "bg-amber-500",
    other: "bg-slate-500",
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <BarChart3 className="h-4 w-4 text-purple-500" />
          Debt Type Breakdown
        </CardTitle>
        <CardDescription className="text-xs">By classification type</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([key, val]) => {
          const pct = Math.round((val.amount / maxAmt) * 100);
          const totalPct =
            report.summary.total_debt > 0 ? Math.round((val.amount / report.summary.total_debt) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">{val.label}</span>
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{fmt(val.amount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${typeColors[key] || "bg-slate-500"} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-500">
                <span>{val.count} loans</span>
                <span>{totalPct}% of total debt</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CURRENCY EXPOSURE
   ═══════════════════════════════════════════════════════════════ */
function CurrencyExposure({ report }: { report: DebtMaturityReport }) {
  if (!report.currency_breakdown?.length) return null;
  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Globe className="h-4 w-4 text-blue-500" />
          Currency Exposure
        </CardTitle>
        <CardDescription className="text-xs">IFRS 7.34 — Foreign currency debt</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {report.currency_breakdown.map((curr) => (
            <div
              key={curr.currency_code}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{curr.currency_code}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">{curr.count} loans</span>
              </div>
              <div className="min-w-0 text-right">
                <div
                  className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-white"
                  title={fmt(curr.amount)}
                >
                  {fmtCompact(curr.amount)}
                </div>
                {curr.currency_code !== "RWF" && curr.amount_in_rwf > 0 && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-500">
                    ≈ {fmt(curr.amount_in_rwf)} RWF @ {curr.exchange_rate_avg}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COVENANT WARNINGS
   ═══════════════════════════════════════════════════════════════ */
function CovenantWarnings({ report }: { report: DebtMaturityReport }) {
  if (!report.covenant_reclassifications?.length) return null;
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
          <ShieldAlert className="h-4 w-4" />
          IAS 1.74 — Covenant Breach Reclassifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-red-700 dark:text-red-300">
          The following loans have been reclassified to Current liabilities due to covenant breaches:
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {report.covenant_reclassifications.map((item) => (
            <div
              key={item.loan_id}
              className="flex items-start gap-2 rounded-lg border border-red-100 bg-white/60 p-3 dark:border-red-900/40 dark:bg-black/20"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.loan_number} — {item.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{item.note}</div>
                {item.breach_date && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Breach: {format(parseISO(item.breach_date), "dd MMM yyyy")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BALANCE SHEET RECONCILIATION
   ═══════════════════════════════════════════════════════════════ */
function BalanceSheetReconciliation({ report }: { report: DebtMaturityReport }) {
  const rec = report?.balance_sheet_reconciliation || {
    schedule_total: 0,
    balance_sheet_borrowings: 0,
    difference: 0,
    reconciled: false,
    note: "Data not available",
  };
  const reconciled = rec.reconciled;

  return (
    <Card
      className={`border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${
        reconciled ? "border-emerald-200 dark:border-emerald-800" : "border-amber-200 dark:border-amber-800"
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Scale className="h-4 w-4 text-indigo-500" />
          Balance Sheet Reconciliation
        </CardTitle>
        <CardDescription className="text-xs">Schedule total vs Balance Sheet borrowings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Schedule Total</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">{fmt(rec.schedule_total)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">BS Borrowings</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">{fmt(rec.balance_sheet_borrowings)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Difference</p>
            <p
              className={`mt-1 font-mono text-lg font-bold ${
                reconciled
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {fmt(rec.difference)}
            </p>
          </div>
        </div>
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs ${
            reconciled
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {reconciled ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {rec.note}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BUCKET CARD
   ═══════════════════════════════════════════════════════════════ */
function BucketCard({
  bucket,
  defaultExpanded = false,
}: {
  bucket: DebtMaturityBucket;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const bucketMeta: Record<string, { color: string; bg: string; border: string; bar: string }> = {
    current_year: { color: "text-rose-700", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", bar: "bg-rose-500" },
    year_1: { color: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", bar: "bg-orange-500" },
    year_2: { color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", bar: "bg-amber-500" },
    year_3: { color: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", bar: "bg-blue-500" },
    year_4: { color: "text-indigo-700", bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800", bar: "bg-indigo-500" },
    year_5: { color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", bar: "bg-emerald-500" },
    beyond_5_years: { color: "text-slate-700", bg: "bg-slate-50 dark:bg-slate-950/20", border: "border-slate-200 dark:border-slate-800", bar: "bg-slate-500" },
    undetermined: { color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", bar: "bg-amber-500" },
  };

  const meta = bucketMeta[bucket.key] || bucketMeta.beyond_5_years;
  const totalFlow = bucket.total_cash_flow || bucket.principal_amount || 0;
  const principalPct = totalFlow > 0 ? Math.round(((bucket.principal_amount || 0) / totalFlow) * 100) : 0;

  const classificationBadge = (cls: string) => {
    const map: Record<string, { label: string; bg: string }> = {
      bank_loan: { label: "Bank Loan", bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
      bond: { label: "Bond", bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
      finance_lease: { label: "Finance Lease", bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
      related_party: { label: "Related Party", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
      other: { label: "Other", bg: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
    };
    const m = map[cls] || map.other;
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${m.bg}`}>{m.label}</span>;
  };

  return (
    <Card className={`overflow-hidden border-2 ${meta.border} ${meta.bg} dark:bg-slate-950`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className={`h-5 w-5 opacity-80 ${meta.color}`} />
            <CardTitle className={`text-lg ${meta.color}`}>{bucket.label}</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {bucket.loan_count} loan{bucket.loan_count !== 1 ? "s" : ""}
          </Badge>
        </div>
        {bucket.endDate && bucket.startDate && (
          <CardDescription className="text-xs">
            {format(parseISO(bucket.startDate), "MMM yyyy")} — {format(parseISO(bucket.endDate), "MMM yyyy")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Principal */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Principal</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">{fmt(bucket.principal_amount)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white dark:bg-slate-800">
            <div className={`h-full rounded-full ${meta.bar} transition-all duration-700`} style={{ width: `${principalPct}%` }} />
          </div>
        </div>

        {/* Interest */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Interest (Undiscounted)</span>
          <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{fmt(bucket.interest_amount)}</span>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Total Cash Flow</span>
          <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">{fmt(bucket.total_cash_flow)}</span>
        </div>

        {(bucket.effective_interest_rate ?? 0) > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-500">Effective Interest Rate</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{bucket.effective_interest_rate}%</span>
          </div>
        )}

        {/* Loan details */}
        {(bucket?.loans?.length ?? 0) > 0 && (
          <div className="border-t border-slate-200/60 pt-3 dark:border-slate-800">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-indigo-500 dark:text-slate-400"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Details ({bucket.loans.length} loans)
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {bucket.loans.map((loan: DebtMaturityLoan) => (
                  <div
                    key={loan.loanId}
                    className={`rounded-lg border border-slate-100 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/40 ${
                      loan.covenantReclassified ? "border-l-4 border-l-red-400" : ""
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                        <span>{loan.loanNumber}</span>
                        <span className="text-slate-400">—</span>
                        <span className="truncate">{loan.name}</span>
                        {loan.isSecured && <Lock className="h-3 w-3 text-emerald-500" />}
                        {loan.covenantBreach && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        {loan.classification === "related_party" && <Users className="h-3 w-3 text-amber-500" />}
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {fmt(loan.principalAmount)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {loan.lenderName && <span className="text-slate-500 dark:text-slate-500">{loan.lenderName}</span>}
                      {loan.endDate && (
                        <span className="text-slate-500 dark:text-slate-500">
                          Matures {format(parseISO(loan.endDate), "dd MMM yyyy")}
                        </span>
                      )}
                      {classificationBadge(loan.classification)}
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {loan.currencyCode}
                      </Badge>
                      {loan.interestAmount > 0 && (
                        <span className="text-slate-500 dark:text-slate-500">
                          Interest {fmt(loan.interestAmount)} @ {loan.interestRate}%
                        </span>
                      )}
                    </div>
                    {loan.covenantReclassified && (
                      <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                        Reclassified to Current (IAS 1.74)
                      </p>
                    )}
                    {loan.liabilityAccount && (
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                        {loan.liabilityAccount.code} — {loan.liabilityAccount.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   IFRS NOTES
   ═══════════════════════════════════════════════════════════════ */
function IfrsNotes({ report }: { report: DebtMaturityReport }) {
  if (!report.ifrs_disclosure_notes?.length) return null;
  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <FileText className="h-4 w-4 text-slate-500" />
          IFRS 7 Disclosure Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-600 dark:text-slate-400">
          {report.ifrs_disclosure_notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function DebtMaturityPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DebtMaturityReport | null>(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getDebtMaturitySchedule({ as_of_date: asOfDate });
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate Debt Maturity Schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handlePrint = () => window.print();

  const buckets = report?.buckets || [];
  const undeterminedBucket = buckets.find((b) => b.key === "undetermined");
  const regularBuckets = buckets.filter((b) => b.key !== "undetermined");

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Debt Maturity Schedule
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                IFRS 7 Financial Instruments — Undiscounted Cash Flow &amp; Maturity Disclosure
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 gap-1.5 dark:border-slate-700 dark:text-slate-200"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          {/* Filters */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">As At Date</Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <Button
                  onClick={fetchReport}
                  disabled={loading}
                  className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  {loading ? "Generating…" : "Generate Schedule"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {loading && <LoadingSkeleton />}

          {/* Empty */}
          {!report && !loading && (
            <Card className="border-dashed border-slate-300 dark:border-slate-700">
              <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                <CalendarClock className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm">Select a date and click Generate to view the Debt Maturity Schedule.</p>
              </CardContent>
            </Card>
          )}

          {/* Report */}
          {report && (
            <div className="space-y-6">
              {/* Hero Header */}
              <HeroHeader report={report} />

              {/* KPI Metric Tiles */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  title="Total Principal"
                  value={fmt(report.summary.total_debt)}
                  subtitle={`${report.summary.total_loans} loans`}
                  icon={<Banknote className="h-5 w-5" />}
                  tone="slate"
                />
                <MetricTile
                  title="Total Interest"
                  value={fmt(report.summary.total_interest)}
                  subtitle="Undiscounted"
                  icon={<Percent className="h-5 w-5" />}
                  tone="blue"
                />
                <MetricTile
                  title="Total Cash Flow"
                  value={fmt(report.summary.total_cash_flow)}
                  subtitle="Principal + Interest"
                  icon={<Activity className="h-5 w-5" />}
                  tone="emerald"
                />
                <MetricTile
                  title="Debt w/ Maturity"
                  value={fmt(report.summary.debt_with_maturity_date)}
                  subtitle={`${
                    report.summary.total_debt > 0
                      ? Math.round((report.summary.debt_with_maturity_date / report.summary.total_debt) * 100)
                      : 0
                  }% of total`}
                  icon={<CalendarClock className="h-5 w-5" />}
                  tone="indigo"
                />
              </div>

              {/* Covenant Breach Alert */}
              {(report.summary.covenant_breach_count ?? 0) > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {report.summary.covenant_breach_count} loan
                      {report.summary.covenant_breach_count !== 1 ? "s" : ""} with covenant breach
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Reclassified to Current liabilities per IAS 1.74. See details below.
                    </p>
                  </div>
                </div>
              )}

              {/* Undetermined Warning */}
              {(undeterminedBucket?.principal_amount ?? 0) > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {undeterminedBucket?.loan_count ?? 0} loan
                      {(undeterminedBucket?.loan_count ?? 0) !== 1 ? "s" : ""} without maturity date
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Loans without end dates cannot be classified into time buckets. Update loan records with maturity
                      dates for complete IFRS disclosure.
                    </p>
                  </div>
                </div>
              )}

              {/* Maturity Timeline + Cash Flow Chart */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <MaturityTimeline buckets={buckets} />
                <CashFlowChart buckets={buckets} />
              </div>

              {/* Classification + Type + Currency */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <SecurityDonut report={report} />
                <TypeBreakdown report={report} />
                <CurrencyExposure report={report} />
              </div>

              {/* Covenant Reclassifications */}
              <CovenantWarnings report={report} />

              {/* Balance Sheet Reconciliation */}
              <BalanceSheetReconciliation report={report} />

              {/* Time Buckets */}
              <div>
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Maturity Buckets
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {regularBuckets.map((bucket) => (
                    <BucketCard
                      key={bucket.key}
                      bucket={bucket}
                      defaultExpanded={bucket.key === "current_year" || bucket.key === "year_1"}
                    />
                  ))}
                </div>
              </div>

              {/* Undetermined */}
              {undeterminedBucket && (undeterminedBucket?.principal_amount ?? 0) > 0 && (
                <BucketCard bucket={undeterminedBucket} defaultExpanded={false} />
              )}

              {/* IFRS Notes */}
              <IfrsNotes report={report} />

              {/* Footer */}
              <p className="pb-2 text-center text-[11px] text-slate-400 dark:text-slate-600">
                Generated {format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
