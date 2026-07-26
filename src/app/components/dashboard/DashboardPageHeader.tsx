import type { ReactNode } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { formatDashboardDateTime } from "./dashboardPageUtils";

interface DashboardPageHeaderProps {
  title: string;
  subtitle: string;
  generatedAt?: string | Date | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  badges?: ReactNode;
  stats?: Array<{ label: string; value: string }>;
}

export function DashboardPageHeader({
  title,
  subtitle,
  generatedAt,
  loading,
  refreshing,
  onRefresh,
  badges,
  stats,
}: DashboardPageHeaderProps) {
  return (
    <div className="dashboard-hero rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
            {badges}
          </div>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Last updated: {loading ? "Loading…" : formatDashboardDateTime(generatedAt)}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs sm:flex">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                >
                  <p className="text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="mt-0.5 font-semibold text-slate-950 dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={loading || refreshing} className="gap-2 shrink-0">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Could not load dashboard</p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}
