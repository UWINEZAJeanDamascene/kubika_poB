import { Layout } from "../../../layout/Layout";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Download,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";

export type ReportTone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "indigo"
  | "slate"
  | "orange"
  | "teal";

export interface ReportCatalogItem {
  id: string;
  name: string;
  description: string;
  icon: ElementType;
  tone: ReportTone;
}

export interface ReportMetric {
  label: string;
  value: string;
  caption: string;
  icon: ElementType;
  tone: ReportTone;
}

const toneClass: Record<
  ReportTone,
  { icon: string; accent: string; text: string; badge: string }
> = {
  blue: {
    icon: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
    accent: "from-blue-500 to-cyan-500",
    text: "text-blue-600 dark:text-blue-300",
    badge: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
    accent: "from-violet-500 to-fuchsia-500",
    text: "text-violet-600 dark:text-violet-300",
    badge: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    accent: "from-emerald-500 to-teal-500",
    text: "text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    accent: "from-amber-500 to-orange-500",
    text: "text-amber-600 dark:text-amber-300",
    badge: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
    accent: "from-rose-500 to-red-500",
    text: "text-rose-600 dark:text-rose-300",
    badge: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
    accent: "from-cyan-500 to-blue-500",
    text: "text-cyan-600 dark:text-cyan-300",
    badge: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
  },
  indigo: {
    icon: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
    accent: "from-indigo-500 to-violet-500",
    text: "text-indigo-600 dark:text-indigo-300",
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800",
    accent: "from-slate-700 to-slate-500",
    text: "text-slate-600 dark:text-slate-300",
    badge: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800",
  },
  orange: {
    icon: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60",
    accent: "from-orange-500 to-amber-500",
    text: "text-orange-600 dark:text-orange-300",
    badge: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60",
  },
  teal: {
    icon: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60",
    accent: "from-teal-500 to-emerald-500",
    text: "text-teal-600 dark:text-teal-300",
    badge: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60",
  },
};

function Spinner() {
  return (
    <span className="mr-1.5 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
  );
}

export function ReportCollectionPage({
  title,
  subtitle,
  badge,
  icon: PageIcon,
  tone,
  reports,
  controls,
  infoTitle,
  infoBody,
  metrics,
  onBack,
  backLabel = "Back to Reports",
  onView,
  onDownloadPDF,
  onDownloadExcel,
  loading,
}: {
  title: string;
  subtitle: string;
  badge: string;
  icon: ElementType;
  tone: ReportTone;
  reports: ReportCatalogItem[];
  controls?: ReactNode;
  infoTitle: string;
  infoBody: string;
  metrics: ReportMetric[];
  onBack?: () => void;
  backLabel?: string;
  onView: (reportId: string) => void;
  onDownloadPDF?: (reportId: string) => void;
  onDownloadExcel?: (reportId: string) => void;
  loading?: string | null;
}) {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className={`h-1 bg-gradient-to-r ${toneClass[tone].accent}`} />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    {onBack && (
                      <Button
                        variant="outline"
                        onClick={onBack}
                        className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
                      </Button>
                    )}
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {badge}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <div className="rounded-xl bg-slate-950 p-3 text-white shadow-sm dark:bg-white dark:text-slate-950">
                      <PageIcon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        {title}
                      </h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-start gap-3">
                    <Clock className={`mt-0.5 h-5 w-5 flex-shrink-0 ${toneClass[tone].text}`} />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                        {infoTitle}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {infoBody}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {controls && (
                <Card className="border-slate-200 bg-slate-50 shadow-none dark:border-white/10 dark:bg-white/[0.04]">
                  <CardContent className="p-4">{controls}</CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card
                  key={metric.label}
                  className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {metric.label}
                        </p>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                          {metric.value}
                        </div>
                      </div>
                      <div className={`rounded-lg p-2.5 ring-1 ${toneClass[metric.tone].icon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">
                      {metric.caption}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon;
              const isLoadingPDF = loading === report.id;
              const isLoadingExcel = loading === `${report.id}-excel`;

              return (
                <Card
                  key={report.id}
                  className="group h-full overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className={`h-1 bg-gradient-to-r ${toneClass[report.tone].accent}`} />
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`rounded-lg p-3 ring-1 ${toneClass[report.tone].icon}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`ring-1 ${toneClass[tone].badge}`}
                      >
                        {badge}
                      </Badge>
                    </div>

                    <div className="mt-4 flex-1">
                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {report.name}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {report.description}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-2">
                      <Button size="sm" onClick={() => onView(report.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Report
                        <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>

                      {(onDownloadPDF || onDownloadExcel) && (
                        <div className="grid grid-cols-2 gap-2">
                          {onDownloadPDF && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                              onClick={() => onDownloadPDF(report.id)}
                              disabled={isLoadingPDF}
                            >
                              {isLoadingPDF ? <Spinner /> : <Download className="mr-1.5 h-4 w-4" />}
                              PDF
                            </Button>
                          )}
                          {onDownloadExcel && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                              onClick={() => onDownloadExcel(report.id)}
                              disabled={isLoadingExcel}
                            >
                              {isLoadingExcel ? <Spinner /> : <Download className="mr-1.5 h-4 w-4" />}
                              Excel
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p>
                  Reports are company scoped, permission aware, and ready for
                  review or export from the selected period.
                </p>
              </div>
              <Badge
                variant="outline"
                className="w-fit border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300"
              >
                Controlled access
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
