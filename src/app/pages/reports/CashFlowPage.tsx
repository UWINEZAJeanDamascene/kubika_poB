import { useState, useEffect, useMemo, type ReactNode } from "react";
import { reportsApi, CashFlowReport, CFSection } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  Waves,
  Printer,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  PiggyBank,
  Wallet,
  HandCoins,
  Landmark,
  Briefcase,
  Download,
  FileText,
  Activity,
  BarChart3,
  ArrowBigDownDash,
  ArrowBigUpDash,
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
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
};

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
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
  tone: "emerald" | "blue" | "amber" | "red" | "slate" | "purple" | "cyan";
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

/* ═══════════════════════════════════════════════════════════════
   CASH FLOW PIPELINE VISUAL (Hero)
   ═══════════════════════════════════════════════════════════════ */
function CashFlowPipeline({
  opening,
  operatingNet,
  investingNet,
  financingNet,
  closing,
}: {
  opening: number;
  operatingNet: number;
  investingNet: number;
  financingNet: number;
  closing: number;
}) {
  const totalFlow = Math.abs(operatingNet) + Math.abs(investingNet) + Math.abs(financingNet);
  const opPct = totalFlow > 0 ? (Math.abs(operatingNet) / totalFlow) * 100 : 0;
  const invPct = totalFlow > 0 ? (Math.abs(investingNet) / totalFlow) * 100 : 0;
  const finPct = totalFlow > 0 ? (Math.abs(financingNet) / totalFlow) * 100 : 0;

  const items = [
    { label: "Operating", value: operatingNet, pct: opPct, color: "bg-emerald-500", dark: "dark:bg-emerald-400" },
    { label: "Investing", value: investingNet, pct: invPct, color: "bg-blue-500", dark: "dark:bg-blue-400" },
    { label: "Financing", value: financingNet, pct: finPct, color: "bg-purple-500", dark: "dark:bg-purple-400" },
  ];

  return (
    <div className="w-full">
      {/* Main horizontal pipeline */}
      <div className="relative mx-auto w-11/12">
        {/* Opening node */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 ring-2 ring-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:ring-cyan-800">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Opening
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {fmt(opening)}
            </span>
          </div>

          {/* Flow arrow */}
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="flex h-full w-full">
                {items.map((it) => (
                  <div
                    key={it.label}
                    className={`h-full ${it.color} ${it.dark} transition-all duration-700`}
                    style={{ width: `${it.pct}%` }}
                  />
                ))}
              </div>
            </div>
            {/* Activity labels under flow */}
            <div className="mt-1 flex w-full">
              {items.map((it) => (
                <div
                  key={it.label}
                  className="flex flex-col items-center transition-all duration-700"
                  style={{ width: `${it.pct}%` }}
                >
                  {it.pct > 12 && (
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {it.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Closing node */}
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800">
              <PiggyBank className="h-5 w-5" />
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Closing
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {fmt(closing)}
            </span>
          </div>
        </div>

        {/* Vertical tributaries */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {items.map((it) => {
            const isPos = it.value >= 0;
            return (
              <div
                key={it.label}
                className="flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/30"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {it.label}
                </span>
                <div className="my-1 flex items-center gap-1">
                  {isPos ? (
                    <ArrowBigDownDash className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <ArrowBigUpDash className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span
                    className={`font-mono text-xs font-bold ${isPos ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                  >
                    {fmt(Math.abs(it.value))}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {isPos ? "Inflow" : "Outflow"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASH FLOW SECTION (Expandable)
   ═══════════════════════════════════════════════════════════════ */
function CashFlowSection({
  title,
  section,
  comparative,
  showComparative: _showComparative,
  defaultExpanded = false,
  accent = "emerald",
}: {
  title: string;
  section: CFSection;
  comparative?: CFSection;
  showComparative: boolean;
  defaultExpanded?: boolean;
  accent?: "emerald" | "blue" | "purple" | "amber";
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalLabel =
    title === "Operating"
      ? "net_cash_from_operating"
      : title === "Investing"
        ? "net_cash_from_investing"
        : "net_cash_from_financing";
  const net = section[totalLabel as keyof CFSection] as number;

  const accentBorder =
    accent === "emerald"
      ? "border-emerald-200 dark:border-emerald-900/40"
      : accent === "blue"
        ? "border-blue-200 dark:border-blue-900/40"
        : accent === "purple"
          ? "border-purple-200 dark:border-purple-900/40"
          : "border-amber-200 dark:border-amber-900/40";

  const accentIcon =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "blue"
        ? "text-blue-500"
        : accent === "purple"
          ? "text-purple-500"
          : "text-amber-500";

  return (
    <div className={`mt-2 rounded-lg border ${accentBorder} bg-white dark:bg-slate-950`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        )}
        <span className="flex-1 text-left">{title} Activities</span>
        <span
          className={`font-mono text-xs font-bold ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {fmt(net)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-3 pb-2 dark:border-slate-800">
          {/* Inflows */}
          {section.inflows.length > 0 && (
            <>
              <div className="flex items-center gap-1 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <ArrowDownRight className={`h-3.5 w-3.5 ${accentIcon}`} />
                Inflows
                <span className="ml-auto font-mono text-slate-500 dark:text-slate-400">
                  {fmt(section.total_inflows)}
                </span>
              </div>
              {section.inflows.map((item, idx) => {
                const compItem = comparative?.inflows.find(
                  (c) => c.source_type === item.source_type,
                );
                return (
                  <SectionRow
                    key={`in-${idx}`}
                    label={item.label}
                    current={item.cash_in}
                    comparative={compItem?.cash_in}
                    indent={1}
                  />
                );
              })}
            </>
          )}

          {/* Outflows */}
          {section.outflows.length > 0 && (
            <>
              <div className="flex items-center gap-1 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <ArrowUpRight className={`h-3.5 w-3.5 ${accentIcon}`} />
                Outflows
                <span className="ml-auto font-mono text-slate-500 dark:text-slate-400">
                  {fmt(section.total_outflows)}
                </span>
              </div>
              {section.outflows.map((item, idx) => {
                const compItem = comparative?.outflows.find(
                  (c) => c.source_type === item.source_type,
                );
                return (
                  <SectionRow
                    key={`out-${idx}`}
                    label={item.label}
                    current={item.cash_out}
                    comparative={compItem?.cash_out}
                    indent={1}
                    isNegative
                  />
                );
              })}
            </>
          )}

          {section.inflows.length === 0 && section.outflows.length === 0 && (
            <div className="py-2 pl-2 text-xs text-slate-500 dark:text-slate-400">
              No cash movements in this section
            </div>
          )}
        </div>
      )}

      {/* Section Net */}
      <SectionRow
        label={`Net Cash ${net >= 0 ? "from" : "used in"} ${title} Activities`}
        current={net}
        comparative={
          comparative
            ? (comparative[totalLabel as keyof CFSection] as number)
            : undefined
        }
        bold
        isNegative={net < 0}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INFLOW / OUTFLOW COMPACT BAR
   ═══════════════════════════════════════════════════════════════ */
function InOutBar({
  inflow,
  outflow,
  label,
}: {
  inflow: number;
  outflow: number;
  label: string;
}) {
  const total = Math.max(inflow + outflow, 1);
  const inPct = (inflow / total) * 100;
  const outPct = (outflow / total) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="font-mono text-slate-600 dark:text-slate-400">
          Net: {fmt(inflow - outflow)}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full bg-emerald-500 transition-all duration-700 dark:bg-emerald-400"
          style={{ width: `${inPct}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all duration-700 dark:bg-red-400"
          style={{ width: `${outPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>In: {fmt(inflow)}</span>
        <span>Out: {fmt(outflow)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function CashFlowPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showComparative, setShowComparative] = useState(false);
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");

  const fetchCF = async () => {
    setLoading(true);
    try {
      const params: any = { date_from: startDate, date_to: endDate };
      if (showComparative && compStartDate && compEndDate) {
        params.comparative_date_from = compStartDate;
        params.comparative_date_to = compEndDate;
      }
      const response = await reportsApi.getCashFlow(params);
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate Cash Flow Statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCF();
  }, []);

  const cur = report?.current;
  const comp = report?.comparative;
  const handlePrint = () => window.print();

  /* Section nets */
  const opNet = cur ? (cur.operating.net_cash_from_operating ?? 0) : 0;
  const invNet = cur ? (cur.investing.net_cash_from_investing ?? 0) : 0;
  const finNet = cur ? (cur.financing.net_cash_from_financing ?? 0) : 0;

  /* Waterfall chart data */
  const waterfallData = useMemo(() => {
    if (!cur) return [];
    return [
      { name: "Opening", value: cur.opening_cash_balance, fill: "#06b6d4" },
      {
        name: "Operating",
        value: cur.operating.net_cash_from_operating ?? 0,
        fill: "#10b981",
      },
      {
        name: "Investing",
        value: cur.investing.net_cash_from_investing ?? 0,
        fill: "#3b82f6",
      },
      {
        name: "Financing",
        value: cur.financing.net_cash_from_financing ?? 0,
        fill: "#8b5cf6",
      },
      { name: "Closing", value: cur.closing_cash_balance, fill: "#f59e0b" },
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
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_380px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-cyan-50 p-2.5 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60">
                    <Waves className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Cash Flow Statement
                  </h1>
                  <Badge variant="secondary" className="h-6">
                    IAS 7
                  </Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {report?.company_name ? `${report.company_name} — ` : ""}
                  Statement of Cash Flows for the period{" "}
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
              {/* Cash flow pipeline visual on desktop */}
              <div className="hidden xl:flex items-center justify-center">
                {cur ? (
                  <CashFlowPipeline
                    opening={cur.opening_cash_balance}
                    operatingNet={opNet}
                    investingNet={invNet}
                    financingNet={finNet}
                    closing={cur.closing_cash_balance}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Generate statement to see cash flow
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
                    className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                    className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <Button
                  onClick={fetchCF}
                  disabled={loading}
                  className="h-9 gap-2 bg-cyan-600 hover:bg-cyan-700"
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
                    className="h-4 w-4 rounded border-slate-300 accent-cyan-600"
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
                      className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricTile
                  title="Opening Cash Balance"
                  value={fmt(cur.opening_cash_balance)}
                  icon={<Wallet className="h-5 w-5" />}
                  tone="cyan"
                  subtitle="Cash at beginning of period"
                />
                <MetricTile
                  title="Operating Net Cash"
                  value={fmt(opNet)}
                  icon={<Briefcase className="h-5 w-5" />}
                  tone={opNet >= 0 ? "emerald" : "red"}
                  subtitle={opNet >= 0 ? "Cash generated" : "Cash used"}
                />
                <MetricTile
                  title="Investing Net Cash"
                  value={fmt(invNet)}
                  icon={<Landmark className="h-5 w-5" />}
                  tone={invNet >= 0 ? "emerald" : "red"}
                  subtitle={invNet >= 0 ? "Inflow from investments" : "Outflow to investments"}
                />
                <MetricTile
                  title="Financing Net Cash"
                  value={fmt(finNet)}
                  icon={<HandCoins className="h-5 w-5" />}
                  tone={finNet >= 0 ? "emerald" : "red"}
                  subtitle={finNet >= 0 ? "Cash raised" : "Cash returned"}
                />
                <MetricTile
                  title="Net Change in Cash"
                  value={fmt(cur.net_change_in_cash)}
                  icon={<ArrowRightLeft className="h-5 w-5" />}
                  tone={cur.net_change_in_cash >= 0 ? "emerald" : "red"}
                  subtitle="Total movement during period"
                />
                <MetricTile
                  title="Closing Cash Balance"
                  value={fmt(cur.closing_cash_balance)}
                  icon={<PiggyBank className="h-5 w-5" />}
                  tone={cur.closing_cash_balance >= 0 ? "emerald" : "red"}
                  subtitle="Cash at end of period"
                />
              </div>

              {/* ═══ RECONCILIATION BANNER ═══ */}
              <div
                className={`overflow-hidden rounded-xl border-2 p-5 shadow-sm ${
                  cur.is_reconciled
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/15"
                    : "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/15"
                }`}
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      cur.is_reconciled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {cur.is_reconciled ? (
                      <ShieldCheck className="h-6 w-6" />
                    ) : (
                      <AlertTriangle className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-bold ${
                        cur.is_reconciled
                          ? "text-emerald-800 dark:text-emerald-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {cur.is_reconciled
                        ? "Cash Flow is Reconciled"
                        : "Cash Flow is Not Reconciled"}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {cur.is_reconciled
                        ? "Opening + Net Change equals Closing Balance"
                        : `Difference of ${fmt(cur.reconciliation_diff)} detected`}
                    </p>
                  </div>
                  <div className="flex gap-5 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Opening
                      </p>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                        {fmt(cur.opening_cash_balance)}
                      </p>
                    </div>
                    <div className="text-xl font-light text-slate-300 dark:text-slate-600">
                      +
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Net Change
                      </p>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                        {fmt(cur.net_change_in_cash)}
                      </p>
                    </div>
                    <div className="text-xl font-light text-slate-300 dark:text-slate-600">
                      =
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Closing
                      </p>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                        {fmt(cur.closing_cash_balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ WATERFALL CHART + SECTION SUMMARIES ═══ */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
                  <PanelTitle
                    icon={<BarChart3 className="h-4 w-4 text-cyan-500" />}
                    title="Cash Flow Waterfall"
                    subtitle="Movement from Opening to Closing Balance"
                  />
                  <CardContent className="pb-5">
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={waterfallData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) =>
                              v >= 1000000
                                ? `${(v / 1000000).toFixed(1)}M`
                                : v >= 1000
                                  ? `${(v / 1000).toFixed(0)}K`
                                  : `${v}`
                            }
                          />
                          <RechartsTooltip
                            formatter={(val: number) => [fmt(val), "Amount"]}
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          />
                          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {waterfallData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelTitle
                    icon={<Activity className="h-4 w-4 text-emerald-500" />}
                    title="Activity Breakdown"
                    subtitle="Inflows vs Outflows by section"
                  />
                  <CardContent className="space-y-4 pb-5">
                    <InOutBar
                      label="Operating"
                      inflow={cur.operating.total_inflows}
                      outflow={cur.operating.total_outflows}
                    />
                    <InOutBar
                      label="Investing"
                      inflow={cur.investing.total_inflows}
                      outflow={cur.investing.total_outflows}
                    />
                    <InOutBar
                      label="Financing"
                      inflow={cur.financing.total_inflows}
                      outflow={cur.financing.total_outflows}
                    />
                    <div className="mt-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Total Net Change
                        </span>
                        <span
                          className={`font-mono font-bold ${cur.net_change_in_cash >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                        >
                          {fmt(cur.net_change_in_cash)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ═══ COMPARATIVE VARIANCE ═══ */}
              {comp && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    {
                      label: "Opening Balance",
                      cur: cur.opening_cash_balance,
                      prev: comp.opening_cash_balance,
                    },
                    {
                      label: "Operating Net",
                      cur: opNet,
                      prev: comp.operating.net_cash_from_operating ?? 0,
                    },
                    {
                      label: "Investing Net",
                      cur: invNet,
                      prev: comp.investing.net_cash_from_investing ?? 0,
                    },
                    {
                      label: "Financing Net",
                      cur: finNet,
                      prev: comp.financing.net_cash_from_financing ?? 0,
                    },
                    {
                      label: "Net Change",
                      cur: cur.net_change_in_cash,
                      prev: comp.net_change_in_cash,
                    },
                    {
                      label: "Closing Balance",
                      cur: cur.closing_cash_balance,
                      prev: comp.closing_cash_balance,
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

              {/* ═══ CASH FLOW STATEMENT ═══ */}
              <Card className="border-slate-200 bg-white shadow-sm print:shadow-none dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 text-center dark:border-slate-800">
                  {report?.company_name && (
                    <CardDescription className="text-base font-semibold text-slate-900 dark:text-white">
                      {report.company_name}
                    </CardDescription>
                  )}
                  <CardTitle className="text-xl text-slate-950 dark:text-white">
                    Statement of Cash Flows
                  </CardTitle>
                  <CardDescription className="text-sm">
                    For the period {format(new Date(startDate), "dd MMM yyyy")} to{" "}
                    {format(new Date(endDate), "dd MMM yyyy")}
                  </CardDescription>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    (Amounts in functional currency — Direct Method)
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

                  {/* ── 1. OPERATING ── */}
                  <CashFlowSection
                    title="Operating"
                    section={cur.operating}
                    comparative={comp?.operating}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="emerald"
                  />

                  {/* ── 2. INVESTING ── */}
                  <CashFlowSection
                    title="Investing"
                    section={cur.investing}
                    comparative={comp?.investing}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="blue"
                  />

                  {/* ── 3. FINANCING ── */}
                  <CashFlowSection
                    title="Financing"
                    section={cur.financing}
                    comparative={comp?.financing}
                    showComparative={showComparative}
                    defaultExpanded={true}
                    accent="purple"
                  />

                  {/* Net Change Hero */}
                  <div className="mt-3 rounded-xl border-2 border-cyan-200 bg-cyan-50/30 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/10">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="flex-1 text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                        Net Change in Cash &amp; Equivalents
                      </span>
                      <span
                        className={`font-mono text-xl font-bold sm:text-2xl ${cur.net_change_in_cash >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                      >
                        {fmt(cur.net_change_in_cash)}
                      </span>
                    </div>
                    {comp && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparative
                        </span>
                        <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                          {fmt(comp.net_change_in_cash)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Opening Balance */}
                  <div className="mt-2" />
                  <SectionRow
                    label="Cash & Cash Equivalents at Beginning of Period"
                    current={cur.opening_cash_balance}
                    comparative={comp?.opening_cash_balance}
                    bold
                  />

                  {/* Closing Balance Hero */}
                  <div className="mt-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="flex-1 text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                        Cash &amp; Cash Equivalents at End of Period
                      </span>
                      <span className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                        {fmt(cur.closing_cash_balance)}
                      </span>
                    </div>
                    {comp && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparative
                        </span>
                        <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                          {fmt(comp.closing_cash_balance)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reconciliation Check */}
                  {cur.is_reconciled ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Reconciled — Opening + Net Change = Closing
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Not reconciled — difference of{" "}
                        {fmt(cur.reconciliation_diff)}
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
                <p className="text-sm">Select a date range and click Generate</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
