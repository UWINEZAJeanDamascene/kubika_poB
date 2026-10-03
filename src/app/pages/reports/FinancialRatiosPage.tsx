import { useState, useEffect, useCallback, type ReactNode } from "react";
import { reportsApi, type FinancialRatiosReport, type FRCategory, type FRRatio } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  Gauge,
  Printer,
  CalendarDays,
  TrendingUp,
  Droplets,
  BarChart3,
  Cog,
  Scale,
  CheckCircle,
  AlertCircle,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  Activity,
  Database,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Landmark,
  Zap,
  Download,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Progress } from "@/app/components/ui/progress";
import { Separator } from "@/app/components/ui/separator";
import { Skeleton } from "@/app/components/ui/skeleton";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/app/components/ui/chart";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

/* ═══════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
type FinancialRatiosReportWithCache = FinancialRatiosReport & { from_cache?: boolean };

interface RatioMeta {
  good: number;
  warning: number;
  direction: "gte" | "lte";
  unit: string;
}

const RATIO_META: Record<string, RatioMeta> = {
  current_ratio: { good: 2, warning: 1, direction: "gte", unit: "x" },
  quick_ratio: { good: 1, warning: 0.5, direction: "gte", unit: "x" },
  cash_ratio: { good: 0.5, warning: 0.2, direction: "gte", unit: "x" },
  working_capital: { good: 1, warning: 0, direction: "gte", unit: "" },
  gross_margin_pct: { good: 40, warning: 20, direction: "gte", unit: "%" },
  net_profit_margin_pct: { good: 15, warning: 5, direction: "gte", unit: "%" },
  ebitda_margin_pct: { good: 20, warning: 10, direction: "gte", unit: "%" },
  return_on_assets: { good: 10, warning: 5, direction: "gte", unit: "%" },
  return_on_equity: { good: 15, warning: 8, direction: "gte", unit: "%" },
  inventory_turnover: { good: 6, warning: 3, direction: "gte", unit: "x" },
  days_inventory_outstanding: { good: 60, warning: 90, direction: "lte", unit: "d" },
  ar_turnover: { good: 8, warning: 4, direction: "gte", unit: "x" },
  days_sales_outstanding: { good: 45, warning: 60, direction: "lte", unit: "d" },
  ap_turnover: { good: 8, warning: 4, direction: "gte", unit: "x" },
  days_payable_outstanding: { good: 30, warning: 60, direction: "lte", unit: "d" },
  debt_to_equity: { good: 1, warning: 2, direction: "lte", unit: "x" },
  interest_coverage: { good: 3, warning: 1.5, direction: "gte", unit: "x" },
};

const STATUS_CONFIG = {
  good: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    progressClass: "[&>div]:bg-emerald-500",
    icon: CheckCircle,
    iconClass: "text-emerald-500",
    label: "Good",
    bannerGradient: "from-emerald-600 to-teal-700",
    bannerTitle: "Financially Healthy",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    ring: "stroke-emerald-500",
    light: "text-emerald-600 dark:text-emerald-300",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    progressClass: "[&>div]:bg-amber-500",
    icon: AlertCircle,
    iconClass: "text-amber-500",
    label: "Warning",
    bannerGradient: "from-amber-500 to-orange-600",
    bannerTitle: "Needs Attention",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    ring: "stroke-amber-500",
    light: "text-amber-600 dark:text-amber-300",
  },
  danger: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    progressClass: "[&>div]:bg-red-500",
    icon: XCircle,
    iconClass: "text-red-500",
    label: "Danger",
    bannerGradient: "from-red-600 to-rose-700",
    bannerTitle: "Critical Issues Detected",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
    ring: "stroke-red-500",
    light: "text-red-600 dark:text-red-300",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    progressClass: "[&>div]:bg-slate-400",
    icon: MinusCircle,
    iconClass: "text-slate-400",
    label: "N/A",
    bannerGradient: "from-slate-600 to-slate-700",
    bannerTitle: "Insufficient Data",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-200 dark:border-slate-700",
    ring: "stroke-slate-400",
    light: "text-slate-600 dark:text-slate-300",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const CATEGORY_META = {
  liquidity: {
    icon: Droplets,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    ring: "stroke-blue-500",
    shade: "#3b82f6",
  },
  profitability: {
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    ring: "stroke-emerald-500",
    shade: "#10b981",
  },
  efficiency: {
    icon: Cog,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
    ring: "stroke-purple-500",
    shade: "#8b5cf6",
  },
  leverage: {
    icon: Scale,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800",
    ring: "stroke-orange-500",
    shade: "#f97316",
  },
};

const HERO_RATIO_KEYS: Array<{ category: string; key: string }> = [
  { category: "liquidity", key: "current_ratio" },
  { category: "profitability", key: "gross_margin_pct" },
  { category: "efficiency", key: "days_sales_outstanding" },
  { category: "leverage", key: "debt_to_equity" },
];

const radarChartConfig: ChartConfig = {
  score: { label: "Health Score", color: "#6366f1" },
};

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function statusToScore(status: string): number {
  switch (status) {
    case "good": return 100;
    case "warning": return 60;
    case "danger": return 25;
    default: return 40;
  }
}

function computeProgress(ratioKey: string, value: number | null): number {
  if (value === null || value === undefined) return 0;
  const meta = RATIO_META[ratioKey];
  if (!meta) return 50;
  const { good, warning, direction } = meta;
  if (direction === "gte") {
    if (value >= good) return 100;
    if (value >= warning) {
      const range = good - warning;
      return range <= 0 ? 75 : 50 + ((value - warning) / range) * 50;
    }
    return warning > 0 ? Math.max(0, (value / warning) * 50) : 0;
  } else {
    if (value <= 0) return 100;
    if (value <= good) return 100;
    if (value <= warning) {
      const range = warning - good;
      return range <= 0 ? 75 : 50 + ((warning - value) / range) * 50;
    }
    return Math.max(5, (good / value) * 50);
  }
}

function fmtVal(v: number | null, unit = ""): string {
  if (v === null || v === undefined) return "N/A";
  const formatted =
    Math.abs(v) >= 10000
      ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit}` : formatted;
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatInputKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  tone: "emerald" | "blue" | "amber" | "red" | "slate" | "purple" | "orange";
  loading?: boolean;
  subtitle?: string;
}) {
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
    orange:
      "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60",
  };
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
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>{icon}</div>
        </div>
        {subtitle && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CIRCULAR SCORE RING
   ═══════════════════════════════════════════════════════════════ */
function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  color,
  label,
  sublabel,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="-mt-9 text-center">
        <span className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(score)}</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">/100</span>
      </div>
      <span className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {sublabel && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{sublabel}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MINI GAUGE BAR
   ═══════════════════════════════════════════════════════════════ */
function MiniGauge({ value, max = 100, tone = "blue" }: { value: number; max?: number; tone?: string }) {
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
            : tone === "orange"
              ? "bg-orange-500"
              : "bg-blue-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[(status as StatusKey)] ?? STATUS_CONFIG.neutral;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO HEADER WITH OVERALL HEALTH SCORE RING
   ═══════════════════════════════════════════════════════════════ */
function HeroHeader({ report }: { report: FinancialRatiosReportWithCache }) {
  const { summary } = report;
  const cfg = STATUS_CONFIG[(summary.overall as StatusKey)] ?? STATUS_CONFIG.neutral;

  // Compute overall weighted score
  const overallScore = Math.round(
    (statusToScore(summary.liquidity) +
      statusToScore(summary.profitability) +
      statusToScore(summary.efficiency) +
      statusToScore(summary.leverage)) /
      4,
  );

  const ringColor =
    summary.overall === "good"
      ? "#10b981"
      : summary.overall === "warning"
        ? "#f59e0b"
        : summary.overall === "danger"
          ? "#ef4444"
          : "#94a3b8";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid items-stretch gap-5 p-5 xl:grid-cols-[1fr_220px]">
        {/* Left: info */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
              <Gauge className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Financial Ratios
            </h1>
            <Badge variant="secondary" className="h-6">
              IAS/IFRS
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {report.company_name ? `${report.company_name} — ` : ""}
            Financial health indicators as at {format(new Date(report.as_of_date), "dd MMM yyyy")}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Period: {format(new Date(report.date_from), "dd MMM yyyy")} –{" "}
            {format(new Date(report.date_to), "dd MMM yyyy")} ({report.days_in_period} days)
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
            {report.from_cache && (
              <Badge
                variant="outline"
                className="h-9 gap-1.5 border-slate-200 px-2.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                <Clock className="h-3.5 w-3.5" />
                Cached
              </Badge>
            )}
          </div>
        </div>

        {/* Right: overall score ring */}
        <div className="flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
          <ScoreRing
            score={overallScore}
            size={140}
            strokeWidth={10}
            color={ringColor}
            label="Overall Health"
            sublabel={cfg.bannerTitle}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATUS DISTRIBUTION DONUT
   ═══════════════════════════════════════════════════════════════ */
function StatusDonut({ report }: { report: FinancialRatiosReportWithCache }) {
  const { summary } = report;
  const data = [
    { name: "Good", value: summary.good_count, fill: "#10b981" },
    { name: "Warning", value: summary.warning_count, fill: "#f59e0b" },
    { name: "Danger", value: summary.danger_count, fill: "#ef4444" },
  ];
  const total = summary.good_count + summary.warning_count + summary.danger_count;

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Zap className="h-4 w-4 text-amber-500" />
          Status Distribution
        </CardTitle>
        <CardDescription className="text-xs">Ratio health across all categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex w-full justify-center gap-4">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {d.name}: <span className="font-mono font-bold">{d.value}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Total: {total} ratios</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY SCORE GRID
   ═══════════════════════════════════════════════════════════════ */
function CategoryScoreGrid({ report }: { report: FinancialRatiosReportWithCache }) {
  const entries = [
    { key: "liquidity", status: report.summary.liquidity },
    { key: "profitability", status: report.summary.profitability },
    { key: "efficiency", status: report.summary.efficiency },
    { key: "leverage", status: report.summary.leverage },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Target className="h-4 w-4 text-indigo-500" />
          Category Health
        </CardTitle>
        <CardDescription className="text-xs">Scores by financial category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {entries.map(({ key, status }) => {
            const cat = report.ratios[key as keyof typeof report.ratios];
            const catMeta = CATEGORY_META[key as keyof typeof CATEGORY_META];
            const score = statusToScore(status);
            const ratios = Object.values(cat.ratios);
            const goodCount = ratios.filter((r) => r.status === "good").length;
            const totalCount = ratios.length;
            const CategoryIcon = catMeta.icon;

            return (
              <div
                key={key}
                className={`flex flex-col items-center rounded-lg border ${catMeta.border} ${catMeta.bg} p-3 transition-colors`}
              >
                <CategoryIcon className={`h-4 w-4 ${catMeta.color}`} />
                <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {cat.label}
                </span>
                <ScoreRing
                  score={score}
                  size={80}
                  strokeWidth={6}
                  color={catMeta.shade}
                  label=""
                  sublabel={`${goodCount}/${totalCount} good`}
                />
                <StatusBadge status={status} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEALTH RADAR CHART
   ═══════════════════════════════════════════════════════════════ */
function HealthRadarChart({ report }: { report: FinancialRatiosReportWithCache }) {
  const { summary } = report;
  const radarData = [
    { category: "Liquidity", score: statusToScore(summary.liquidity), fullMark: 100 },
    { category: "Profitability", score: statusToScore(summary.profitability), fullMark: 100 },
    { category: "Efficiency", score: statusToScore(summary.efficiency), fullMark: 100 },
    { category: "Leverage", score: statusToScore(summary.leverage), fullMark: 100 },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Activity className="h-4 w-4 text-indigo-500" />
          Financial Health Radar
        </CardTitle>
        <CardDescription className="text-xs">
          Category-level health — 100 = Good · 60 = Warning · 25 = Danger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={radarChartConfig} className="h-[260px] w-full">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => <span className="font-mono">{Number(value).toFixed(0)}</span>}
                />
              }
            />
            <PolarGrid stroke="rgba(148,163,184,0.25)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 12, fill: "currentColor", className: "text-slate-600 dark:text-slate-400" }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Health Score"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 } as any}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO RATIO KPI CARDS
   ═══════════════════════════════════════════════════════════════ */
function HeroRatioCards({ report }: { report: FinancialRatiosReportWithCache }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {HERO_RATIO_KEYS.map(({ category, key }) => {
        const cat = report.ratios[category as keyof typeof report.ratios];
        const ratio = cat?.ratios?.[key as keyof typeof cat.ratios] as FRRatio | undefined;
        if (!ratio) return null;

        const catMeta = CATEGORY_META[category as keyof typeof CATEGORY_META];
        const ratioMeta = RATIO_META[key];
        const CategoryIcon = catMeta.icon;
        const progress = computeProgress(key, ratio.value);
        const displayValue = fmtVal(ratio.value, ratioMeta?.unit);
        const toneMap: Record<string, string> = {
          liquidity: "blue",
          profitability: "emerald",
          efficiency: "purple",
          leverage: "orange",
        };

        return (
          <Card
            key={key}
            className={`overflow-hidden border ${catMeta.border} ${catMeta.bg} transition-all hover:shadow-md dark:bg-slate-950`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className={`h-4 w-4 ${catMeta.color}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {category}
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {displayValue}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{ratio.label}</p>
                </div>
                <StatusBadge status={ratio.status} />
              </div>
              <div className="mt-4 space-y-1.5">
                <MiniGauge value={progress} tone={toneMap[category] || "blue"} />
                <p className="text-[10px] text-slate-500 dark:text-slate-500">{ratio.benchmark}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RATIO ROW
   ═══════════════════════════════════════════════════════════════ */
function RatioRow({ ratioKey, ratio }: { ratioKey: string; ratio: FRRatio }) {
  const [expanded, setExpanded] = useState(false);
  const meta = RATIO_META[ratioKey];
  const progress = computeProgress(ratioKey, ratio.value);
  const cfg = STATUS_CONFIG[(ratio.status as StatusKey)] ?? STATUS_CONFIG.neutral;
  const Icon = cfg.icon;
  const displayValue = fmtVal(ratio.value, meta?.unit);
  const inputEntries = ratio.inputs ? Object.entries(ratio.inputs) : [];

  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0 dark:border-slate-800">
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.iconClass}`} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <span className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">
              {ratio.label}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                {displayValue}
              </span>
              <StatusBadge status={ratio.status} />
            </div>
          </div>
          <div className="mb-1">
            <Progress value={progress} className={`h-1.5 ${cfg.progressClass}`} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] leading-snug text-slate-500 dark:text-slate-500">
              {ratio.benchmark}
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex shrink-0 items-center gap-0.5 text-[10px] text-slate-400 transition-colors hover:text-indigo-500"
              aria-expanded={expanded}
            >
              {expanded ? "Hide" : "Details"}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          {expanded && (
            <div className="mt-2 space-y-1.5 rounded-md bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Formula: </span>
                {ratio.formula}
              </div>
              {inputEntries.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Inputs: </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {inputEntries.map(([k, v]) => (
                      <span key={k}>
                        {formatInputKey(k)}:{" "}
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {fmtCurrency(v as number)}
                        </span>
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY CARD
   ═══════════════════════════════════════════════════════════════ */
function CategoryCard({ catKey, category }: { catKey: string; category: FRCategory }) {
  const catMeta = CATEGORY_META[catKey as keyof typeof CATEGORY_META];
  const CategoryIcon = catMeta?.icon ?? BarChart3;
  const ratioEntries = Object.entries(category.ratios);
  const goodCount = ratioEntries.filter(([, r]) => r.status === "good").length;

  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
            <CategoryIcon className={`h-5 w-5 ${catMeta?.color ?? "text-slate-500"}`} />
            {category.label}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {goodCount}/{ratioEntries.length} good
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {ratioEntries.map(([key, ratio]) => (
          <RatioRow key={key} ratioKey={key} ratio={ratio} />
        ))}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INPUT DATA SECTION
   ═══════════════════════════════════════════════════════════════ */
function InputDataSection({ report }: { report: FinancialRatiosReportWithCache }) {
  const [open, setOpen] = useState(false);
  const allInputs: Record<string, number> = {};
  Object.values(report.ratios).forEach((cat) => {
    Object.values(cat.ratios).forEach((ratio) => {
      if (ratio.inputs) {
        Object.entries(ratio.inputs).forEach(([k, v]) => {
          if (!(k in allInputs)) allInputs[k] = v as number;
        });
      }
    });
  });
  const inputEntries = Object.entries(allInputs).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Database className="h-4 w-4 text-slate-500" />
                Source Data &amp; Inputs ({inputEntries.length} values)
              </CardTitle>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                {open ? "Collapse" : "Expand"}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {inputEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="mb-1 truncate text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                    {formatInputKey(key)}
                  </div>
                  <div className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">
                    {fmtCurrency(value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEBT METRICS PANEL
   ═══════════════════════════════════════════════════════════════ */
function DebtMetricsPanel({ report }: { report: FinancialRatiosReportWithCache }) {
  if (!report.debt_metrics?.metrics) return null;
  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-white">
          <Landmark className="h-5 w-5 text-indigo-500" />
          Debt &amp; Borrowing Metrics
        </CardTitle>
        <CardDescription className="text-xs">Leverage and debt service indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {Object.entries(report.debt_metrics.metrics).map(([key, metric]: [string, any]) => (
            <div
              key={key}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {metric.label}
              </p>
              <p
                className={`text-lg font-bold font-mono ${
                  metric.status === "good"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : metric.status === "warning"
                      ? "text-amber-700 dark:text-amber-300"
                      : metric.status === "danger"
                        ? "text-red-700 dark:text-red-300"
                        : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {metric.value !== null && metric.value !== undefined
                  ? metric.value.toLocaleString() + (metric.unit || "")
                  : "-"}
              </p>
              {metric.description && (
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">{metric.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function FinancialRatiosPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FinancialRatiosReportWithCache | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchRatios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportsApi.getFinancialRatios({
        as_of_date: asOfDate,
        date_from: startDate,
        date_to: endDate,
      });
      setReport(response as FinancialRatiosReportWithCache);
    } catch (err: any) {
      const msg = err.message || "Failed to compute financial ratios";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [asOfDate, startDate, endDate]);

  useEffect(() => {
    fetchRatios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => window.print();

  // Collect all ratios for quick stats
  const allRatios = report
    ? Object.entries(report.ratios).flatMap(([catKey, cat]) =>
        Object.entries(cat.ratios).map(([key, ratio]) => ({ key, ratio, category: catKey })),
      )
    : [];
  const goodCount = allRatios.filter((r) => r.ratio.status === "good").length;
  const warnCount = allRatios.filter((r) => r.ratio.status === "warning").length;
  const dangerCount = allRatios.filter((r) => r.ratio.status === "danger").length;
  const total = allRatios.length;

  return (
    <Layout>
      <TooltipProvider>
        <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Financial Ratios
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  IAS/IFRS-compliant financial health indicators
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-300">Period Start</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-300">Period End</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <Button
                    onClick={fetchRatios}
                    disabled={loading}
                    className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                    {loading ? "Computing…" : "Compute Ratios"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Error */}
            {error && !loading && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <CardContent className="flex items-center gap-3 py-4">
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <p className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchRatios}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton />}

            {/* Empty */}
            {!loading && !report && !error && (
              <Card className="border-dashed border-slate-300 dark:border-slate-700">
                <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                  <Gauge className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">Select dates and click Compute Ratios</p>
                </CardContent>
              </Card>
            )}

            {/* Main Dashboard */}
            {!loading && report && (
              <div className="space-y-6">
                {/* Hero header with score ring */}
                <HeroHeader report={report} />

                {/* Quick stats metric tiles */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricTile
                    title="Total Ratios"
                    value={total}
                    icon={<BarChart3 className="h-5 w-5" />}
                    tone="slate"
                    subtitle="Indicators computed"
                  />
                  <MetricTile
                    title="Good"
                    value={goodCount}
                    icon={<CheckCircle className="h-5 w-5" />}
                    tone="emerald"
                    subtitle="Healthy indicators"
                  />
                  <MetricTile
                    title="Needs Attention"
                    value={warnCount}
                    icon={<AlertCircle className="h-5 w-5" />}
                    tone="amber"
                    subtitle="Review recommended"
                  />
                  <MetricTile
                    title="Critical"
                    value={dangerCount}
                    icon={<XCircle className="h-5 w-5" />}
                    tone="red"
                    subtitle="Immediate action"
                  />
                </div>

                {/* Hero KPI Cards */}
                <HeroRatioCards report={report} />

                {/* Radar + Status donut + Category scores */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <HealthRadarChart report={report} />
                  <StatusDonut report={report} />
                  <CategoryScoreGrid report={report} />
                </div>

                {/* Detailed Ratio Analysis */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <BarChart2 className="h-3.5 w-3.5" />
                    Detailed Ratio Analysis
                  </p>
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {Object.entries(report.ratios).map(([key, category]) => (
                      <CategoryCard key={key} catKey={key} category={category} />
                    ))}
                  </div>
                </div>

                {/* Debt Metrics */}
                <DebtMetricsPanel report={report} />

                {/* Source data */}
                <InputDataSection report={report} />

                {/* Footer */}
                <p className="pb-2 text-center text-[11px] text-slate-400 dark:text-slate-600">
                  Generated {format(new Date(report.generated_at), "dd MMM yyyy HH:mm")} · Period:{" "}
                  {report.days_in_period} days
                  {report.from_cache && " · Cached result"}
                </p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </Layout>
  );
}
