import { useState, useEffect, useMemo, type ReactNode } from "react";
import { profitLossApi, companyApi, PLStatement, PLSection } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Printer,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  DollarSign,
  PiggyBank,
  Activity,
  Layers,
  Download,
  FileText,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  if (n === 0) return "-";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtSigned = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${formatted})` : formatted;
};

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

const toneClass: Record<string, string> = {
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
  slate:
    "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800",
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function MetricTile({
  title,
  value,
  change,
  icon,
  tone,
  loading,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  tone: "emerald" | "blue" | "amber" | "red" | "slate";
  loading?: boolean;
  subtitle?: string;
}) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-32" />
          {change && <Skeleton className="mt-2 h-3 w-20" />}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {value}
            </p>
            {change && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {change}
              </p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>
            {icon}
          </div>
        </div>
        {subtitle && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MarginBar({ label, value, tone = "blue" }: { label: string; value: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "red"
          ? "bg-red-500"
          : "bg-blue-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
          {fmtPct(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ProfitWaterfall({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(val: number) => fmt(val)}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionRow({
  label,
  current,
  comparative,
  bold = false,
  indent = 0,
  isNegative = false,
  className = "",
}: {
  label: string;
  current: number | string;
  comparative?: number | string;
  bold?: boolean;
  indent?: number;
  isNegative?: boolean;
  className?: string;
}) {
  const currentStr = typeof current === "number" ? fmt(current) : current;
  const compStr =
    comparative !== undefined
      ? typeof comparative === "number"
        ? fmt(comparative)
        : comparative
      : null;
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-2 sm:py-1.5 text-sm ${bold ? "font-semibold border-t border-b bg-slate-50/60 dark:bg-slate-900/40" : ""} ${className}`}
      style={{ paddingLeft: `${indent * 24}px` }}
    >
      <span
        className={`flex-1 ${bold ? "font-semibold" : ""} ${isNegative ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-2 sm:gap-0">
        <span
          className={`sm:w-36 text-left sm:text-right font-mono tabular-nums ${isNegative ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}
        >
          {currentStr}
        </span>
        {compStr !== null && (
          <span className="hidden sm:inline sm:w-36 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {compStr}
          </span>
        )}
      </div>
      {/* Mobile comparative */}
      {compStr !== null && (
        <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 pl-4">
          Compare: {compStr}
        </div>
      )}
    </div>
  );
}

function ExpandableSection({
  title,
  current,
  comparative,
  showComparative: _showComparative,
  defaultExpanded = false,
  accent = "blue",
  showNegativeLinesAsDeductions = false,
}: {
  title: string;
  current: PLSection;
  comparative?: PLSection;
  showComparative: boolean;
  defaultExpanded?: boolean;
  accent?: "blue" | "emerald" | "amber" | "red";
  showNegativeLinesAsDeductions?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (current.lines.length === 0) return null;

  const accentBorder =
    accent === "emerald"
      ? "border-emerald-200 dark:border-emerald-900/40"
      : accent === "amber"
        ? "border-amber-200 dark:border-amber-900/40"
        : accent === "red"
          ? "border-red-200 dark:border-red-900/40"
          : "border-blue-200 dark:border-blue-900/40";

  return (
    <div className={`mb-1 rounded-lg border ${accentBorder} bg-white dark:bg-slate-950`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        )}
        <span className="flex-1 text-left">{title}</span>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {fmt(current.total)}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-3 pb-2 dark:border-slate-800">
          {current.lines.map((line) => {
            const compLine = comparative?.lines.find(
              (l) => l.account_code === line.account_code,
            );
            return (
              <SectionRow
                key={line.account_code}
                label={`${line.account_code} ${line.account_name}`}
                current={showNegativeLinesAsDeductions && line.amount < 0 ? Math.abs(line.amount) : line.amount}
                comparative={
                  showNegativeLinesAsDeductions && compLine && compLine.amount < 0
                    ? Math.abs(compLine.amount)
                    : compLine?.amount
                }
                indent={1}
                isNegative={!showNegativeLinesAsDeductions && line.amount < 0}
              />
            );
          })}
        </div>
      )}
    </div>
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

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function ProfitLossPage() {
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState<PLStatement | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showComparative, setShowComparative] = useState(false);
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");

  const fetchCompany = async () => {
    try {
      const res = await companyApi.getMe();
      if (res && (res as any).data) {
        const company = (res as any).data;
        setCompanyName(company.name || "");
      }
    } catch {
      // silent
    }
  };

  const fetchPL = async () => {
    setLoading(true);
    try {
      const params: any = {
        date_from: startDate,
        date_to: endDate,
      };
      if (showComparative && compStartDate && compEndDate) {
        params.comparative_date_from = compStartDate;
        params.comparative_date_to = compEndDate;
      }
      const response = await profitLossApi.getStatement(params);
      setStatement(response);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate P&L");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
    fetchPL();
  }, []);

  const cur = statement?.current;
  const comp = statement?.comparative;

  const handlePrint = () => window.print();

  /* Waterfall data */
  const waterfallData = useMemo(() => {
    if (!cur) return [];
    return [
      { name: "Revenue", value: cur.revenue.total, color: "#3b82f6" },
      { name: "Gross", value: cur.gross_profit, color: "#10b981" },
      { name: "Operating", value: cur.operating_profit, color: "#06b6d4" },
      { name: "Net", value: cur.profit_for_period, color: "#f59e0b" },
    ];
  }, [cur]);

  /* Variance helpers */
  const variance = (a: number, b: number) => {
    const diff = a - b;
    const pct = b !== 0 ? ((diff / Math.abs(b)) * 100).toFixed(1) : "N/A";
    return { diff, pct, up: diff >= 0 };
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* ═══ HERO HEADER ═══ */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_340px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Profit & Loss
                  </h1>
                  <Badge variant="secondary" className="h-6">
                    IAS 1
                  </Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {companyName
                    ? `${companyName} — `
                    : ""}
                  Statement of Profit or Loss and Other Comprehensive Income for{" "}
                  {format(new Date(startDate), "dd MMM yyyy")} to{" "}
                  {format(new Date(endDate), "dd MMM yyyy")}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
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
              {/* Mini waterfall on desktop */}
              <div className="hidden xl:block">
                {cur ? (
                  <ProfitWaterfall data={waterfallData} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Generate statement to see chart
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ FILTERS ═══ */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-300">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <Button
                  onClick={fetchPL}
                  disabled={loading}
                  className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarDays className="h-4 w-4" />
                  )}
                  Generate
                </Button>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:ml-auto">
                  <input
                    type="checkbox"
                    checked={showComparative}
                    onChange={(e) => setShowComparative(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Compare Period
                </label>
              </div>
              {showComparative && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-300">
                      Compare Start
                    </Label>
                    <Input
                      type="date"
                      value={compStartDate}
                      onChange={(e) => setCompStartDate(e.target.value)}
                      className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-300">
                      Compare End
                    </Label>
                    <Input
                      type="date"
                      value={compEndDate}
                      onChange={(e) => setCompEndDate(e.target.value)}
                      className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ LOADING SKELETONS ═══ */}
          {loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <MetricTile
                    key={i}
                    title="Loading"
                    value=""
                    icon={<Activity className="h-5 w-5" />}
                    tone="slate"
                    loading
                  />
                ))}
              </div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          )}

          {/* ═══ KPI CARDS ═══ */}
          {cur && !loading && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  title="Revenue"
                  value={fmt(cur.revenue.total)}
                  icon={<DollarSign className="h-5 w-5" />}
                  tone="blue"
                  subtitle={`${fmtPct(cur.gross_margin_pct)} gross margin`}
                />
                <MetricTile
                  title="Gross Profit"
                  value={fmt(cur.gross_profit)}
                  icon={<Layers className="h-5 w-5" />}
                  tone="emerald"
                  subtitle="After cost of sales"
                />
                <MetricTile
                  title="Operating Profit"
                  value={fmt(cur.operating_profit)}
                  icon={<Activity className="h-5 w-5" />}
                  tone="amber"
                  subtitle={fmtPct(cur.operating_margin_pct) + " operating margin"}
                />
                <MetricTile
                  title="Net Profit"
                  value={fmt(cur.profit_for_period)}
                  icon={<PiggyBank className="h-5 w-5" />}
                  tone={cur.profit_for_period >= 0 ? "emerald" : "red"}
                  subtitle={fmtPct(cur.net_margin_pct) + " net margin"}
                />
              </div>

              {/* ═══ MARGIN DASHBOARD + WATERFALL ═══ */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="col-span-1 lg:col-span-2 border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelTitle
                    icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                    title="Profit Journey"
                    subtitle="Revenue to Net Profit waterfall"
                  />
                  <CardContent className="pb-5">
                    <ProfitWaterfall data={waterfallData} />
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelTitle
                    icon={<Info className="h-4 w-4 text-blue-500" />}
                    title="Key Margins"
                    subtitle="Profitability ratios"
                  />
                  <CardContent className="space-y-4 pb-5">
                    <MarginBar label="Gross Margin" value={cur.gross_margin_pct} tone="emerald" />
                    <MarginBar label="Operating Margin" value={cur.operating_margin_pct} tone="blue" />
                    <MarginBar label="EBITDA Margin" value={cur.ebitda_margin_pct} tone="amber" />
                    <MarginBar label="Net Margin" value={cur.net_margin_pct} tone="blue" />
                    <MarginBar label="Effective Tax Rate" value={cur.effective_tax_rate} tone="red" />
                  </CardContent>
                </Card>
              </div>

              {/* ═══ COMPARATIVE VARIANCE BANNER ═══ */}
              {comp && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Revenue", cur: cur.revenue.total, prev: comp.revenue.total },
                    { label: "Gross Profit", cur: cur.gross_profit, prev: comp.gross_profit },
                    { label: "Operating Profit", cur: cur.operating_profit, prev: comp.operating_profit },
                    { label: "Net Profit", cur: cur.profit_for_period, prev: comp.profit_for_period },
                  ].map((item) => {
                    const v = variance(item.cur, item.prev);
                    return (
                      <Card
                        key={item.label}
                        className={`border shadow-sm ${v.up ? "border-emerald-200 dark:border-emerald-900/40" : "border-red-200 dark:border-red-900/40"}`}
                      >
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {item.label} vs Prior
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {v.up ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span
                              className={`text-lg font-bold ${v.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {v.diff >= 0 ? "+" : ""}
                              {fmt(v.diff)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {v.up ? "↑" : "↓"} {v.pct}% from comparative
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* ═══ P&L STATEMENT ═══ */}
              <Card className="border-slate-200 bg-white shadow-sm print:shadow-none dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 text-center dark:border-slate-800">
                  {companyName && (
                    <CardDescription className="text-base font-semibold text-slate-900 dark:text-white">
                      {companyName}
                    </CardDescription>
                  )}
                  <CardTitle className="text-xl text-slate-950 dark:text-white">
                    Statement of Profit or Loss
                  </CardTitle>
                  <CardDescription className="text-sm">
                    For the period {format(new Date(startDate), "dd MMM yyyy")} to{" "}
                    {format(new Date(endDate), "dd MMM yyyy")}
                  </CardDescription>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    (Amounts in functional currency)
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-6 pt-4 sm:px-6">
                  {/* Column Headers */}
                  <div className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-white py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <span className="flex-1">Description</span>
                    <span className="w-32 text-right sm:w-36">Current</span>
                    {comp && (
                      <span className="hidden w-36 text-right sm:inline">
                        Comparative
                      </span>
                    )}
                  </div>

                  {/* ── Revenue ── */}
                  <ExpandableSection
                    title="Revenue"
                    current={cur.revenue}
                    comparative={comp?.revenue}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="emerald"
                  />
                  <SectionRow
                    label="Total Revenue"
                    current={cur.revenue.total}
                    comparative={comp?.revenue.total}
                    bold
                  />

                  {/* ── COGS ── */}
                  <div className="mt-2" />
                  <ExpandableSection
                    title="Cost of Sales"
                    current={cur.cogs}
                    comparative={comp?.cogs}
                    showComparative={showComparative}
                    defaultExpanded={false}
                    accent="red"
                    showNegativeLinesAsDeductions
                  />
                  <SectionRow
                    label="Total Cost of Sales"
                    current={cur.cogs.total}
                    comparative={comp?.cogs.total}
                    bold
                    isNegative
                  />

                  {/* ── Gross Profit ── */}
                  <div className="mt-2" />
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                    <SectionRow
                      label="Gross Profit"
                      current={cur.gross_profit}
                      comparative={comp?.gross_profit}
                      bold
                    />
                    <SectionRow
                      label="Gross Margin"
                      current={fmtPct(cur.gross_margin_pct)}
                      comparative={
                        comp ? fmtPct(comp.gross_margin_pct) : undefined
                      }
                      className="text-slate-500 dark:text-slate-400"
                    />
                  </div>

                  {/* ── Other Income ── */}
                  {cur.other_income.lines.length > 0 && (
                    <>
                      <div className="mt-2" />
                      <ExpandableSection
                        title="Other Income"
                        current={cur.other_income}
                        comparative={comp?.other_income}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="emerald"
                      />
                      <SectionRow
                        label="Total Other Income"
                        current={cur.other_income.total}
                        comparative={comp?.other_income.total}
                        bold
                      />
                    </>
                  )}

                  {/* ── Distribution Costs ── */}
                  {cur.distribution_costs.lines.length > 0 && (
                    <>
                      <div className="mt-2" />
                      <ExpandableSection
                        title="Distribution Costs"
                        current={cur.distribution_costs}
                        comparative={comp?.distribution_costs}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="red"
                      />
                      <SectionRow
                        label="Total Distribution Costs"
                        current={cur.distribution_costs.total}
                        comparative={comp?.distribution_costs.total}
                        bold
                        isNegative
                      />
                    </>
                  )}

                  {/* ── Admin Expenses ── */}
                  {cur.administrative_expenses.lines.length > 0 && (
                    <>
                      <div className="mt-2" />
                      <ExpandableSection
                        title="Administrative Expenses"
                        current={cur.administrative_expenses}
                        comparative={comp?.administrative_expenses}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="red"
                      />
                      <SectionRow
                        label="Total Administrative Expenses"
                        current={cur.administrative_expenses.total}
                        comparative={comp?.administrative_expenses.total}
                        bold
                        isNegative
                      />
                    </>
                  )}

                  {/* ── Other Expenses ── */}
                  {cur.other_expenses.lines.length > 0 && (
                    <>
                      <div className="mt-2" />
                      <ExpandableSection
                        title="Other Expenses"
                        current={cur.other_expenses}
                        comparative={comp?.other_expenses}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="red"
                      />
                      <SectionRow
                        label="Total Other Expenses"
                        current={cur.other_expenses.total}
                        comparative={comp?.other_expenses.total}
                        bold
                        isNegative
                      />
                    </>
                  )}

                  {/* ── Operating Profit ── */}
                  <div className="mt-2" />
                  <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-900/40 dark:bg-amber-950/10">
                    <SectionRow
                      label="Operating Profit (EBIT)"
                      current={cur.operating_profit}
                      comparative={comp?.operating_profit}
                      bold
                    />
                    <SectionRow
                      label="Operating Margin"
                      current={fmtPct(cur.operating_margin_pct)}
                      comparative={
                        comp ? fmtPct(comp.operating_margin_pct) : undefined
                      }
                      className="text-slate-500 dark:text-slate-400"
                    />
                  </div>

                  {/* ── EBITDA ── */}
                  <SectionRow
                    label="EBITDA"
                    current={cur.ebitda}
                    comparative={comp?.ebitda}
                    className="text-slate-500 dark:text-slate-400"
                  />
                  <SectionRow
                    label="EBITDA Margin"
                    current={fmtPct(cur.ebitda_margin_pct)}
                    comparative={
                      comp ? fmtPct(comp.ebitda_margin_pct) : undefined
                    }
                    className="text-slate-500 dark:text-slate-400"
                  />
                  {cur.depreciation_and_amortisation > 0 && (
                    <SectionRow
                      label="Depreciation & Amortisation"
                      current={cur.depreciation_and_amortisation}
                      comparative={comp?.depreciation_and_amortisation}
                      indent={1}
                      isNegative
                      className="text-xs text-slate-500 dark:text-slate-400"
                    />
                  )}

                  {/* ── Finance Income ── */}
                  {cur.finance_income && cur.finance_income.lines.length > 0 && (
                    <>
                      <div className="mt-2" />
                      <ExpandableSection
                        title="Finance Income"
                        current={cur.finance_income}
                        comparative={comp?.finance_income}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="emerald"
                      />
                      <SectionRow
                        label="Total Finance Income"
                        current={cur.finance_income.total}
                        comparative={comp?.finance_income?.total}
                        bold
                      />
                    </>
                  )}

                  {/* ── Finance Costs ── */}
                  {cur.finance_costs.lines.length > 0 && (
                    <>
                      <div className="mt-2" />
                      <ExpandableSection
                        title="Finance Costs"
                        current={cur.finance_costs}
                        comparative={comp?.finance_costs}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="red"
                      />
                      <SectionRow
                        label="Total Finance Costs"
                        current={cur.finance_costs.total}
                        comparative={comp?.finance_costs.total}
                        bold
                        isNegative
                      />
                    </>
                  )}

                  {/* ── Share of Associates ── */}
                  {cur.share_of_associates !== 0 && (
                    <SectionRow
                      label="Share of Profit of Associates / JVs"
                      current={cur.share_of_associates}
                      comparative={comp?.share_of_associates}
                    />
                  )}

                  {/* ── PBT ── */}
                  <div className="mt-2" />
                  <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 dark:border-blue-900/40 dark:bg-blue-950/10">
                    <SectionRow
                      label="Profit Before Tax"
                      current={cur.profit_before_tax}
                      comparative={comp?.profit_before_tax}
                      bold
                    />
                  </div>

                  {/* ── Tax ── */}
                  <div className="mt-1" />
                  {cur.tax.lines.length > 0 ? (
                    <>
                      <ExpandableSection
                        title="Income Tax Expense"
                        current={cur.tax}
                        comparative={comp?.tax}
                        showComparative={showComparative}
                        defaultExpanded={true}
                        accent="red"
                      />
                      <SectionRow
                        label="Total Income Tax"
                        current={cur.tax.total}
                        comparative={comp?.tax.total}
                        bold
                        isNegative
                      />
                    </>
                  ) : (
                    <SectionRow
                      label={`Income Tax Expense (${(cur.corporate_tax_rate * 100).toFixed(0)}% of PBT)`}
                      current={cur.tax.total}
                      comparative={comp?.tax.total}
                      bold
                      isNegative
                    />
                  )}
                  {cur.computed_tax && (
                    <div className="px-1 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Auto-computed at {(cur.corporate_tax_rate * 100).toFixed(0)}%
                      of Profit Before Tax
                    </div>
                  )}
                  <SectionRow
                    label="Effective Tax Rate"
                    current={fmtPct(cur.effective_tax_rate)}
                    comparative={
                      comp ? fmtPct(comp.effective_tax_rate) : undefined
                    }
                    className="text-slate-500 dark:text-slate-400"
                  />

                  {/* ── PAT ── */}
                  <div className="mt-2" />
                  <SectionRow
                    label="Profit After Tax (Continuing Operations)"
                    current={cur.profit_after_tax}
                    comparative={comp?.profit_after_tax}
                    bold
                  />

                  {/* ── Discontinued Operations ── */}
                  {cur.discontinued_operations.total !== 0 && (
                    <SectionRow
                      label="Profit/(Loss) from Discontinued Operations"
                      current={cur.discontinued_operations.total}
                      comparative={comp?.discontinued_operations.total}
                      isNegative={cur.discontinued_operations.total < 0}
                    />
                  )}

                  {/* ── Net Profit Hero ── */}
                  <div
                    className={`mt-3 rounded-xl border-2 p-4 sm:p-5 ${cur.profit_for_period >= 0 ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/15" : "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/15"}`}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="flex-1 text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                        Profit for the Period{" "}
                        {cur.is_profit ? "" : "(Loss)"}
                      </span>
                      <span
                        className={`font-mono text-xl font-bold sm:text-2xl ${cur.profit_for_period >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                      >
                        {fmt(cur.profit_for_period)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        Net Margin
                      </span>
                      <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                        {fmtPct(cur.net_margin_pct)}
                      </span>
                    </div>
                    {comp && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparative
                        </span>
                        <span
                          className={`font-mono text-sm font-medium ${comp.profit_for_period >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {fmt(comp.profit_for_period)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ═══ OCI ═══ */}
                  <div className="mt-6 mb-2">
                    <h3 className="border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Other Comprehensive Income
                    </h3>
                  </div>
                  {cur.other_comprehensive_income.lines.length > 0 ? (
                    <>
                      <ExpandableSection
                        title="OCI Items"
                        current={cur.other_comprehensive_income}
                        comparative={comp?.other_comprehensive_income}
                        showComparative={showComparative}
                        defaultExpanded={false}
                        accent="blue"
                      />
                      <SectionRow
                        label="Total Other Comprehensive Income"
                        current={cur.other_comprehensive_income.total}
                        comparative={comp?.other_comprehensive_income.total}
                        bold
                      />
                    </>
                  ) : (
                    <>
                      <SectionRow
                        label="Total Other Comprehensive Income"
                        current={0}
                        comparative={comp ? 0 : undefined}
                        bold
                      />
                      <div className="px-1 py-0.5 text-xs italic text-slate-500 dark:text-slate-400">
                        No OCI items — revaluation surplus, FX translation and
                        similar items will appear here when posted
                      </div>
                    </>
                  )}

                  {/* ── Total Comprehensive Income ── */}
                  <div className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/10">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="flex-1 text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                        Total Comprehensive Income
                      </span>
                      <span
                        className={`font-mono text-xl font-bold sm:text-2xl ${cur.total_comprehensive_income >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}
                      >
                        {fmt(cur.total_comprehensive_income)}
                      </span>
                    </div>
                    {comp && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparative
                        </span>
                        <span
                          className={`font-mono text-sm font-medium ${comp.total_comprehensive_income >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {fmt(comp.total_comprehensive_income)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Attribution ── */}
                  <div className="mt-6 mb-2">
                    <h3 className="border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Profit Attributable To
                    </h3>
                  </div>
                  <SectionRow
                    label="Owners of the Parent"
                    current={cur.profit_attributable_to_owners}
                    comparative={comp?.profit_attributable_to_owners}
                    indent={1}
                  />
                  <SectionRow
                    label="Non-Controlling Interests"
                    current={cur.profit_attributable_to_nci}
                    comparative={comp?.profit_attributable_to_nci}
                    indent={1}
                  />
                  <div className="mt-3 mb-2">
                    <h3 className="border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Total Comprehensive Income Attributable To
                    </h3>
                  </div>
                  <SectionRow
                    label="Owners of the Parent"
                    current={cur.comprehensive_income_attributable_to_owners}
                    comparative={comp?.comprehensive_income_attributable_to_owners}
                    indent={1}
                  />
                  <SectionRow
                    label="Non-Controlling Interests"
                    current={cur.comprehensive_income_attributable_to_nci}
                    comparative={comp?.comprehensive_income_attributable_to_nci}
                    indent={1}
                  />

                  {/* ── EPS ── */}
                  <div className="mt-6 mb-2">
                    <h3 className="border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      Earnings Per Share
                    </h3>
                  </div>
                  <SectionRow
                    label="Basic EPS"
                    current={
                      cur.earnings_per_share.basic_eps !== null
                        ? fmtSigned(cur.earnings_per_share.basic_eps)
                        : "N/A"
                    }
                    comparative={
                      comp && comp.earnings_per_share.basic_eps !== null
                        ? fmtSigned(comp.earnings_per_share.basic_eps)
                        : undefined
                    }
                  />
                  <SectionRow
                    label="Diluted EPS"
                    current={
                      cur.earnings_per_share.diluted_eps !== null
                        ? fmtSigned(cur.earnings_per_share.diluted_eps)
                        : "N/A"
                    }
                    comparative={
                      comp && comp.earnings_per_share.diluted_eps !== null
                        ? fmtSigned(comp.earnings_per_share.diluted_eps)
                        : undefined
                    }
                  />

                  {/* Generated timestamp */}
                  {statement?.generated_at && (
                    <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      Generated{" "}
                      {format(
                        new Date(statement.generated_at),
                        "dd MMM yyyy HH:mm",
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty */}
          {!cur && !loading && (
            <Card className="border-dashed border-slate-300 dark:border-slate-700">
              <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm">Select a date range and click Generate</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
