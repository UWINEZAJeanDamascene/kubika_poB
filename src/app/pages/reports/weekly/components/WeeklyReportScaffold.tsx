import { Layout } from "../../../../layout/Layout";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import type { ReportTone } from "../../components/ReportCollectionPage";

const toneClass: Record<ReportTone, { icon: string; accent: string; text: string }> = {
  blue: { icon: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60", accent: "from-blue-500 to-cyan-500", text: "text-blue-600 dark:text-blue-300" },
  violet: { icon: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60", accent: "from-violet-500 to-fuchsia-500", text: "text-violet-600 dark:text-violet-300" },
  emerald: { icon: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60", accent: "from-emerald-500 to-teal-500", text: "text-emerald-600 dark:text-emerald-300" },
  amber: { icon: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60", accent: "from-amber-500 to-orange-500", text: "text-amber-600 dark:text-amber-300" },
  rose: { icon: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60", accent: "from-rose-500 to-red-500", text: "text-rose-600 dark:text-rose-300" },
  cyan: { icon: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60", accent: "from-cyan-500 to-blue-500", text: "text-cyan-600 dark:text-cyan-300" },
  indigo: { icon: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60", accent: "from-indigo-500 to-violet-500", text: "text-indigo-600 dark:text-indigo-300" },
  slate: { icon: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800", accent: "from-slate-700 to-slate-500", text: "text-slate-600 dark:text-slate-300" },
  orange: { icon: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60", accent: "from-orange-500 to-amber-500", text: "text-orange-600 dark:text-orange-300" },
  teal: { icon: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60", accent: "from-teal-500 to-emerald-500", text: "text-teal-600 dark:text-teal-300" },
};

export interface WeeklyMetric {
  label: string;
  value: ReactNode;
  caption?: string;
  icon: ElementType;
  tone: ReportTone;
}

export function WeeklyReportScaffold({
  title,
  shortTitle,
  subtitle,
  icon: PageIcon,
  tone,
  weekStart,
  weekLabel,
  onWeekChange,
  loading,
  downloading,
  onBack,
  backLabel = "Back to Weekly Reports",
  onDownloadPDF,
  onDownloadExcel,
  metrics,
  children,
}: {
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: ElementType;
  tone: ReportTone;
  weekStart?: string;
  weekLabel?: string;
  onWeekChange?: (value: string) => void;
  loading?: boolean;
  downloading: "pdf" | "excel" | null;
  onBack: () => void;
  backLabel?: string;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
  metrics: WeeklyMetric[];
  children: ReactNode;
}) {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className={`h-1 bg-gradient-to-r ${toneClass[tone].accent}`} />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={onBack} className="border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-white/5"><ArrowLeft className="mr-2 h-4 w-4" />{backLabel}</Button>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Weekly Report</Badge>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className={`rounded-xl p-3 ring-1 ${toneClass[tone].icon}`}><PageIcon className="h-7 w-7" /></div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl"><span className="hidden sm:inline">{title}</span><span className="sm:hidden">{shortTitle}</span></h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
                  </div>
                </div>
              </div>
              <Card className="border-slate-200 bg-slate-50 shadow-none dark:border-white/10 dark:bg-white/[0.04]">
                <CardContent className="space-y-4 p-4">
                  {weekStart && onWeekChange ? (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      <div className="min-w-0">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Week Starting</label>
                        <Input type="date" value={weekStart} onChange={(event) => onWeekChange(event.target.value)} className="mt-2 h-9 w-44 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
                        {weekLabel && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{weekLabel}</p>}
                      </div>
                      {loading && <Loader2 className={`h-4 w-4 animate-spin ${toneClass[tone].text}`} />}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400"><Calendar className="h-5 w-5" /> Current operational snapshot</div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={onDownloadPDF} disabled={downloading === "pdf"} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">{downloading === "pdf" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}PDF</Button>
                    <Button variant="outline" size="sm" onClick={onDownloadExcel} disabled={downloading === "excel"} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">{downloading === "excel" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}Excel</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {metrics.length > 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <Card key={metric.label} className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{metric.label}</p><div className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{metric.value}</div></div><div className={`rounded-lg p-2.5 ring-1 ${toneClass[metric.tone].icon}`}><Icon className="h-5 w-5" /></div></div>{metric.caption && <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">{metric.caption}</p>}</CardContent></Card>; })}</div>}
          {children}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" /><p>Weekly report data is company scoped, permission controlled, and generated for the selected weekly context.</p></div></div>
        </div>
      </div>
    </Layout>
  );
}

export const weeklyReportCardClass = "border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";
