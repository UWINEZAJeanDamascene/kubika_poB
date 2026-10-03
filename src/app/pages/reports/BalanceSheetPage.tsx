import { useState, useEffect, useMemo, type ReactNode } from "react";
import { reportsApi, BalanceSheetReport, BSSection } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  Scale,
  Printer,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Building2,
  Landmark,
  Wallet,
  Clock,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Briefcase,
  Landmark as BankIcon,
  Download,
  FileText,
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
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

const toneClass: Record<string, string> = {
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
  slate:
    "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800",
  purple:
    "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900/60",
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function MetricTile({
  title,
  value,
  icon,
  tone,
  loading,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: "emerald" | "blue" | "amber" | "red" | "slate" | "purple";
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
          {subtitle && <Skeleton className="mt-2 h-3 w-20" />}
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

function ProgressBar({
  label,
  value,
  max = 100,
  tone = "blue",
  suffix = "%",
}: {
  label: string;
  value: number;
  max?: number;
  tone?: string;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "red"
          ? "bg-red-500"
          : tone === "purple"
            ? "bg-purple-500"
            : "bg-blue-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
          {value.toFixed(2)}
          {suffix}
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

function MiniDonut({
  data,
  size = 140,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.48}
              dataKey="value"
              stroke="none"
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(val: number, name: string) => [fmt(val), name]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-slate-600 dark:text-slate-300">
              {d.name}
            </span>
          </div>
        ))}
      </div>
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
  const currentStr =
    typeof current === "number" ? fmt(current) : current;
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
      {compStr !== null && (
        <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 pl-4">
          Compare: {compStr}
        </div>
      )}
    </div>
  );
}

function MaturityBadge({
  classification,
}: {
  classification?: string;
}) {
  if (!classification) return null;
  const isCurrent = classification === "current";
  const isNonCurrent =
    classification === "non_current" ||
    classification === "non_current_assumed";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
        isCurrent
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40"
          : isNonCurrent
            ? "bg-purple-50 text-purple-700 ring-1 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900/40"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {isCurrent ? (
        <>
          <Clock className="h-3 w-3" /> Current (&lt;12m)
        </>
      ) : isNonCurrent ? (
        <>
          <CalendarClock className="h-3 w-3" /> Non-Current (&gt;12m)
        </>
      ) : null}
    </span>
  );
}

function ExpandableSection({
  title,
  current,
  comparative,
  showComparative: _showComparative,
  defaultExpanded = false,
  showMaturity = false,
  accent = "blue",
}: {
  title: string;
  current: BSSection;
  comparative?: BSSection;
  showComparative: boolean;
  defaultExpanded?: boolean;
  showMaturity?: boolean;
  accent?: "blue" | "emerald" | "amber" | "red" | "purple";
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
          : accent === "purple"
            ? "border-purple-200 dark:border-purple-900/40"
            : "border-blue-200 dark:border-blue-900/40";

  return (
    <div
      className={`mb-1 rounded-lg border ${accentBorder} bg-white dark:bg-slate-950`}
    >
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
            const hasMaturityData =
              line.maturity_classification ||
              line.due_within_12_months !== undefined;
            return (
              <div key={line.account_code}>
                <SectionRow
                  label={`${line.account_code} ${line.account_name}`}
                  current={line.amount}
                  comparative={compLine?.amount}
                  indent={1}
                  isNegative={line.amount < 0}
                />
                {showMaturity && hasMaturityData && (
                  <div className="flex flex-wrap items-center gap-2 py-0.5 sm:pl-8">
                    <MaturityBadge
                      classification={line.maturity_classification}
                    />
                    {line.due_within_12_months !== undefined &&
                      line.due_after_12_months !== undefined && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Due &le;12m: {fmt(line.due_within_12_months)} | Due
                          &gt;12m: {fmt(line.due_after_12_months)}
                        </span>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BALANCE SCALE VISUAL
   ═══════════════════════════════════════════════════════════════ */
function BalanceScaleVisual({
  assets,
  equityAndLiabilities,
  isBalanced,
  difference,
}: {
  assets: number;
  equityAndLiabilities: number;
  isBalanced: boolean;
  difference: number;
}) {
  const max = Math.max(Math.abs(assets), Math.abs(equityAndLiabilities), 1);
  const assetPct = (Math.abs(assets) / max) * 100;
  const elPct = (Math.abs(equityAndLiabilities) / max) * 100;
  const tilt = isBalanced
    ? 0
    : assets > equityAndLiabilities
      ? -3
      : 3;

  return (
    <div className="relative w-full">
      {/* Scale beam */}
      <div
        className="relative mx-auto h-1.5 w-4/5 rounded-full bg-slate-200 transition-transform duration-500 dark:bg-slate-700"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        {/* Center pivot */}
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 ring-4 ring-white dark:bg-slate-600 dark:ring-slate-900" />
      </div>

      {/* Pans */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        {/* Left pan — Assets */}
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-16 items-end justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/15">
            <div
              className="w-6 rounded-t bg-emerald-500 transition-all duration-700 dark:bg-emerald-400"
              style={{ height: `${assetPct}%` }}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Assets
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
            {fmt(assets)}
          </p>
        </div>

        {/* Right pan — Equity + Liabilities */}
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-16 items-end justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/15">
            <div
              className="w-6 rounded-t bg-blue-500 transition-all duration-700 dark:bg-blue-400"
              style={{ height: `${elPct}%` }}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Equity + Liab.
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
            {fmt(equityAndLiabilities)}
          </p>
        </div>
      </div>

      {/* Balance status */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {isBalanced ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Perfectly Balanced
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40">
            <XCircle className="h-3.5 w-3.5" />
            Out by {fmt(difference)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showComparative, setShowComparative] = useState(false);
  const [compDate, setCompDate] = useState("");

  const fetchBS = async () => {
    setLoading(true);
    try {
      const params: any = { as_of_date: asOfDate };
      if (showComparative && compDate) {
        params.comparative_date = compDate;
      }
      const response = await reportsApi.getBalanceSheet(params);
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate Balance Sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBS();
  }, []);

  const cur = report?.current;
  const comp = report?.comparative;
  const handlePrint = () => window.print();

  /* Computed ratios */
  const workingCapital = useMemo(() => {
    if (!cur) return 0;
    return cur.current_assets.total - cur.current_liabilities.total;
  }, [cur]);

  const currentRatio = useMemo(() => {
    if (!cur || cur.current_liabilities.total === 0) return 0;
    return cur.current_assets.total / cur.current_liabilities.total;
  }, [cur]);

  const debtToEquity = useMemo(() => {
    if (!cur || cur.equity.total === 0) return 0;
    return cur.total_liabilities / cur.equity.total;
  }, [cur]);

  /* Donut data */
  const assetMixData = useMemo(() => {
    if (!cur) return [];
    return [
      {
        name: "Non-Current",
        value: cur.non_current_assets.total,
        color: "#3b82f6",
      },
      {
        name: "Current",
        value: cur.current_assets.total,
        color: "#10b981",
      },
    ];
  }, [cur]);

  const capitalStructureData = useMemo(() => {
    if (!cur) return [];
    return [
      { name: "Equity", value: cur.equity.total, color: "#10b981" },
      {
        name: "Non-Current Liab.",
        value: cur.non_current_liabilities.total,
        color: "#8b5cf6",
      },
      {
        name: "Current Liab.",
        value: cur.current_liabilities.total,
        color: "#f59e0b",
      },
    ];
  }, [cur]);

  /* Variance helper */
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
                    <Scale className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Balance Sheet
                  </h1>
                  <Badge variant="secondary" className="h-6">
                    IAS 1
                  </Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {report?.company_name
                    ? `${report.company_name} — `
                    : ""}
                  Statement of Financial Position as at{" "}
                  {format(new Date(asOfDate), "dd MMM yyyy")}
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
              {/* Balance scale visual on desktop */}
              <div className="hidden xl:flex items-center justify-center">
                {cur ? (
                  <BalanceScaleVisual
                    assets={cur.total_assets}
                    equityAndLiabilities={cur.total_equity_and_liabilities}
                    isBalanced={cur.is_balanced}
                    difference={cur.difference}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Generate statement to see balance
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
                    As At Date
                  </Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <Button
                  onClick={fetchBS}
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
                      Compare As At
                    </Label>
                    <Input
                      type="date"
                      value={compDate}
                      onChange={(e) => setCompDate(e.target.value)}
                      className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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

          {/* ═══ KPI CARDS + BALANCE VERIFICATION ═══ */}
          {cur && !loading && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  title="Total Assets"
                  value={fmt(cur.total_assets)}
                  icon={<Briefcase className="h-5 w-5" />}
                  tone="blue"
                  subtitle={`${fmt(cur.non_current_assets.total)} non-current`}
                />
                <MetricTile
                  title="Total Equity"
                  value={fmt(cur.equity.total)}
                  icon={<Landmark className="h-5 w-5" />}
                  tone="emerald"
                  subtitle="Shareholders' funds"
                />
                <MetricTile
                  title="Total Liabilities"
                  value={fmt(cur.total_liabilities)}
                  icon={<BankIcon className="h-5 w-5" />}
                  tone="amber"
                  subtitle={`${fmt(cur.current_liabilities.total)} current`}
                />
                <MetricTile
                  title="Working Capital"
                  value={fmt(workingCapital)}
                  icon={<Wallet className="h-5 w-5" />}
                  tone={workingCapital >= 0 ? "emerald" : "red"}
                  subtitle="Current Assets - Current Liabilities"
                />
              </div>

              {/* ═══ BALANCE VERIFICATION BANNER ═══ */}
              <div
                className={`overflow-hidden rounded-xl border-2 p-5 shadow-sm ${
                  cur.is_balanced
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/15"
                    : "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/15"
                }`}
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      cur.is_balanced
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {cur.is_balanced ? (
                      <ShieldCheck className="h-6 w-6" />
                    ) : (
                      <AlertTriangle className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-bold ${
                        cur.is_balanced
                          ? "text-emerald-800 dark:text-emerald-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {cur.is_balanced
                        ? "Balance Sheet is Balanced"
                        : "Balance Sheet is Out of Balance"}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {cur.is_balanced
                        ? "Assets exactly equal Equity + Liabilities"
                        : `Difference of ${fmt(cur.difference)} detected between both sides`}
                    </p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total Assets
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
                        {fmt(cur.total_assets)}
                      </p>
                    </div>
                    <div className="text-2xl font-light text-slate-300 dark:text-slate-600">
                      =
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        E + L
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
                        {fmt(cur.total_equity_and_liabilities)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ COMPOSITION CHARTS ═══ */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelTitle
                    icon={<PieChartIcon className="h-4 w-4 text-blue-500" />}
                    title="Asset Mix"
                    subtitle="Non-Current vs Current Assets"
                  />
                  <CardContent className="flex justify-center pb-5">
                    <MiniDonut data={assetMixData} size={160} />
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelTitle
                    icon={<BarChart3 className="h-4 w-4 text-purple-500" />}
                    title="Capital Structure"
                    subtitle="How the business is financed"
                  />
                  <CardContent className="flex justify-center pb-5">
                    <MiniDonut data={capitalStructureData} size={160} />
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelTitle
                    icon={<Activity className="h-4 w-4 text-amber-500" />}
                    title="Liquidity & Leverage"
                    subtitle="Key financial health indicators"
                  />
                  <CardContent className="space-y-4 pb-5">
                    <ProgressBar
                      label="Current Ratio"
                      value={currentRatio}
                      max={3}
                      tone={currentRatio >= 1 ? "emerald" : "red"}
                      suffix="x"
                    />
                    <ProgressBar
                      label="Debt-to-Equity"
                      value={debtToEquity}
                      max={2}
                      tone={debtToEquity > 1 ? "red" : "blue"}
                      suffix="x"
                    />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-lg border border-slate-200 p-3 text-center dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Working Capital
                        </p>
                        <p
                          className={`mt-1 font-mono text-base font-bold ${
                            workingCapital >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-red-700 dark:text-red-300"
                          }`}
                        >
                          {fmt(workingCapital)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 text-center dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Current Period P/L
                        </p>
                        <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                          {fmt(cur.current_period_net_profit)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ═══ MATURITY PROFILE ═══ */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <PanelTitle
                  icon={<CalendarClock className="h-4 w-4 text-indigo-500" />}
                  title="Liability Maturity Profile"
                  subtitle="Current vs Non-Current breakdown"
                />
                <CardContent className="pb-5">
                  <div className="space-y-3">
                    {/* Non-Current Liabilities bar */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          Non-Current Liabilities
                        </span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {fmt(cur.non_current_liabilities.total)}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-700"
                          style={{
                            width: `${
                              cur.total_liabilities > 0
                                ? (cur.non_current_liabilities.total /
                                    cur.total_liabilities) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* Current Liabilities bar */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          Current Liabilities
                        </span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {fmt(cur.current_liabilities.total)}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-700"
                          style={{
                            width: `${
                              cur.total_liabilities > 0
                                ? (cur.current_liabilities.total /
                                    cur.total_liabilities) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* Combined stacked visual */}
                    <div className="mt-2 flex h-6 w-full overflow-hidden rounded-lg">
                      <div
                        className="flex items-center justify-center bg-purple-500 text-xs font-medium text-white transition-all duration-700"
                        style={{
                          width: `${
                            cur.total_liabilities > 0
                              ? (cur.non_current_liabilities.total /
                                  cur.total_liabilities) *
                                100
                              : 0
                          }%`,
                        }}
                      >
                        {cur.total_liabilities > 0 &&
                          cur.non_current_liabilities.total /
                            cur.total_liabilities >=
                            0.15 &&
                          `${(
                            (cur.non_current_liabilities.total /
                              cur.total_liabilities) *
                            100
                          ).toFixed(0)}%`}
                      </div>
                      <div
                        className="flex items-center justify-center bg-amber-500 text-xs font-medium text-white transition-all duration-700"
                        style={{
                          width: `${
                            cur.total_liabilities > 0
                              ? (cur.current_liabilities.total /
                                  cur.total_liabilities) *
                                100
                              : 0
                          }%`,
                        }}
                      >
                        {cur.total_liabilities > 0 &&
                          cur.current_liabilities.total /
                            cur.total_liabilities >=
                            0.15 &&
                          `${(
                            (cur.current_liabilities.total /
                              cur.total_liabilities) *
                            100
                          ).toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ═══ COMPARATIVE VARIANCE ═══ */}
              {comp && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total Assets",
                      cur: cur.total_assets,
                      prev: comp.total_assets,
                    },
                    {
                      label: "Total Equity",
                      cur: cur.equity.total,
                      prev: comp.equity.total,
                    },
                    {
                      label: "Total Liabilities",
                      cur: cur.total_liabilities,
                      prev: comp.total_liabilities,
                    },
                    {
                      label: "Working Capital",
                      cur: workingCapital,
                      prev:
                        comp.current_assets.total -
                        comp.current_liabilities.total,
                    },
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

              {/* ═══ BALANCE SHEET STATEMENT ═══ */}
              <Card className="border-slate-200 bg-white shadow-sm print:shadow-none dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 text-center dark:border-slate-800">
                  {report?.company_name && (
                    <CardDescription className="text-base font-semibold text-slate-900 dark:text-white">
                      {report.company_name}
                    </CardDescription>
                  )}
                  <CardTitle className="text-xl text-slate-950 dark:text-white">
                    Statement of Financial Position
                  </CardTitle>
                  <CardDescription className="text-sm">
                    As at {format(new Date(asOfDate), "dd MMM yyyy")}
                  </CardDescription>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    (Amounts in functional currency)
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-6 pt-4 sm:px-6">
                  {/* Column Headers */}
                  <div className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-white py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <span className="flex-1">Description</span>
                    <span className="w-32 text-right sm:w-36">
                      {format(new Date(asOfDate), "dd MMM")}
                    </span>
                    {comp && (
                      <span className="hidden w-36 text-right sm:inline">
                        {format(new Date(compDate), "dd MMM")}
                      </span>
                    )}
                  </div>

                  {/* ═══ ASSETS ═══ */}
                  <div className="mt-2 mb-2">
                    <h3 className="flex items-center gap-2 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                      ASSETS
                    </h3>
                  </div>

                  <ExpandableSection
                    title="Non-Current Assets"
                    current={cur.non_current_assets}
                    comparative={comp?.non_current_assets}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="blue"
                  />
                  <SectionRow
                    label="Total Non-Current Assets"
                    current={cur.non_current_assets.total}
                    comparative={comp?.non_current_assets.total}
                    bold
                  />

                  <div className="mt-2" />
                  <ExpandableSection
                    title="Current Assets"
                    current={cur.current_assets}
                    comparative={comp?.current_assets}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="emerald"
                  />
                  <SectionRow
                    label="Total Current Assets"
                    current={cur.current_assets.total}
                    comparative={comp?.current_assets.total}
                    bold
                  />

                  {/* Total Assets Hero */}
                  <div className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/10">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="flex-1 text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                        TOTAL ASSETS
                      </span>
                      <span className="font-mono text-xl font-bold text-blue-700 dark:text-blue-300 sm:text-2xl">
                        {fmt(cur.total_assets)}
                      </span>
                    </div>
                    {comp && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparative
                        </span>
                        <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                          {fmt(comp.total_assets)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ═══ EQUITY & LIABILITIES ═══ */}
                  <div className="mt-6 mb-2">
                    <h3 className="flex items-center gap-2 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <Landmark className="h-4 w-4 text-purple-500" />
                      EQUITY &amp; LIABILITIES
                    </h3>
                  </div>

                  <ExpandableSection
                    title="Equity"
                    current={cur.equity}
                    comparative={comp?.equity}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="emerald"
                  />
                  {cur.current_period_net_profit !== 0 && (
                    <div className="px-1 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Retained Earnings includes current period net profit of{" "}
                      {fmt(cur.current_period_net_profit)}
                    </div>
                  )}
                  <SectionRow
                    label="Total Equity"
                    current={cur.equity.total}
                    comparative={comp?.equity.total}
                    bold
                  />

                  <div className="mt-2" />
                  <ExpandableSection
                    title="Non-Current Liabilities"
                    current={cur.non_current_liabilities}
                    comparative={comp?.non_current_liabilities}
                    showComparative={showComparative}
                    defaultExpanded={false}
                    showMaturity={true}
                    accent="purple"
                  />
                  <SectionRow
                    label="Total Non-Current Liabilities"
                    current={cur.non_current_liabilities.total}
                    comparative={comp?.non_current_liabilities.total}
                    bold
                  />

                  <div className="mt-2" />
                  <ExpandableSection
                    title="Current Liabilities"
                    current={cur.current_liabilities}
                    comparative={comp?.current_liabilities}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    showMaturity={true}
                    accent="amber"
                  />
                  <SectionRow
                    label="Total Current Liabilities"
                    current={cur.current_liabilities.total}
                    comparative={comp?.current_liabilities.total}
                    bold
                  />

                  <div className="mt-2" />
                  <SectionRow
                    label="Total Liabilities"
                    current={cur.total_liabilities}
                    comparative={comp?.total_liabilities}
                    bold
                  />

                  {/* Total Equity & Liabilities Hero */}
                  <div className="mt-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="flex-1 text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                        TOTAL EQUITY &amp; LIABILITIES
                      </span>
                      <span className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                        {fmt(cur.total_equity_and_liabilities)}
                      </span>
                    </div>
                    {comp && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparative
                        </span>
                        <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                          {fmt(comp.total_equity_and_liabilities)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Balance Check */}
                  {cur.is_balanced ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Balanced — Assets = Equity + Liabilities
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Out of balance by {fmt(cur.difference)}
                      </Badge>
                    </div>
                  )}

                  {/* Warning */}
                  {(report as any)?.warning && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {(report as any).warning}
                    </div>
                  )}

                  {/* Generated timestamp */}
                  {report?.generated_at && (
                    <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      Generated{" "}
                      {format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}
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
                <p className="text-sm">Select a date and click Generate</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
