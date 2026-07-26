import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
  Loader2,
  Activity,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { ebmApi, type EBMDeviceBranchStatus } from "@/lib/api";
import { Layout } from "@/app/layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

// ── Local types ────────────────────────────────────────────────────────────────

interface CodeSyncState {
  branchId?: string;
  syncType?: string;
  mode?: string;
  lastReqDt?: string;
  lastSuccessfulSyncAt?: string | null;
  lastAttemptAt?: string | null;
  lastErrorMessage?: string | null;
  summary?: { received?: number };
}

interface QueueCounts {
  pending?: number;
  failed?: number;
  abandoned?: number;
  submitted?: number;
}

interface EBMAlert {
  _id: string;
  documentType?: string;
  documentId?: string;
  attemptsMade?: number;
  lastErrorMessage?: string | null;
  abandonedAt?: string | null;
  createdAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DeviceStatusBadge({ status }: { status: string }) {
  if (status === "initialized")
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Initialized
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        <XCircle className="mr-1 h-3 w-3" /> Failed
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
      <Clock className="mr-1 h-3 w-3" /> Not initialized
    </Badge>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function EBMComplianceDashboardContent({ embedded = false }: { embedded?: boolean } = {}) {
  const [devices, setDevices] = useState<{
    mode: string;
    tin?: string | null;
    branches: EBMDeviceBranchStatus[];
  } | null>(null);
  const [syncStates, setSyncStates] = useState<CodeSyncState[]>([]);
  const [queueCounts, setQueueCounts] = useState<QueueCounts>({});
  const [alerts, setAlerts] = useState<EBMAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [devRes, syncRes, queueRes, alertRes] = await Promise.allSettled([
        ebmApi.getDevices(),
        ebmApi.getCodeSyncStatus(),
        ebmApi.getQueue({ limit: 1 }),
        ebmApi.getAlerts(),
      ]);

      if (devRes.status === "fulfilled") {
        setDevices(devRes.value.data as any);
      }
      if (syncRes.status === "fulfilled") {
        setSyncStates((syncRes.value.data as any) || []);
      }
      if (queueRes.status === "fulfilled") {
        setQueueCounts(((queueRes.value.data as any)?.counts as QueueCounts) || {});
      }
      if (alertRes.status === "fulfilled") {
        setAlerts(((alertRes.value.data as any) || []) as EBMAlert[]);
      }
    } catch {
      if (!quiet) toast.error("Failed to load EBM compliance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalIssues =
    (queueCounts.failed ?? 0) + (queueCounts.abandoned ?? 0) + alerts.length;

  return (
    <div className={embedded ? "space-y-6" : "bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {embedded ? (
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                EBM Compliance
              </h2>
            ) : (
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                EBM Compliance
              </h1>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monitor RRA device status, code synchronisation, and submission health across all branches.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading compliance data…
          </div>
        ) : (
          <>
            {/* ── Summary tiles ─────────────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile
                label="Branches"
                value={devices?.branches.length ?? 0}
                sub={`${devices?.branches.filter((b) => b.status === "initialized").length ?? 0} initialized`}
                icon={<Server className="h-5 w-5 text-blue-500" />}
              />
              <SummaryTile
                label="Mode"
                value={devices?.mode ?? "—"}
                sub={devices?.tin ? `TIN: ${devices.tin}` : "No TIN set"}
                icon={<ShieldCheck className="h-5 w-5 text-indigo-500" />}
              />
              <SummaryTile
                label="Queue issues"
                value={(queueCounts.failed ?? 0) + (queueCounts.abandoned ?? 0)}
                sub={`${queueCounts.pending ?? 0} pending`}
                icon={<Activity className="h-5 w-5 text-amber-500" />}
                alert={(queueCounts.failed ?? 0) + (queueCounts.abandoned ?? 0) > 0}
              />
              <SummaryTile
                label="Alerts"
                value={alerts.length}
                sub="Abandoned submissions"
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                alert={alerts.length > 0}
              />
            </div>

            {/* ── Device / Branch Status ─────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4" /> Branch Device Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!devices?.branches.length ? (
                  <p className="text-sm text-slate-500">
                    No branches configured. Go to{" "}
                    <Link to="/warehouses" className="text-blue-600 hover:underline">
                      Warehouses
                    </Link>{" "}
                    and set an RRA Branch ID on each location.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="pb-2 pr-4">Branch</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2 pr-4">Mode</th>
                          <th className="pb-2 pr-4">TIN / Device SN</th>
                          <th className="pb-2 pr-4">Initialized at</th>
                          <th className="pb-2">Last error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {devices.branches.map((b) => (
                          <tr key={b.branchId} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 pr-4 font-medium">
                              {b.branchName || b.branchId}
                              <span className="ml-1 font-mono text-xs text-slate-400">
                                [{b.branchId}]
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              <DeviceStatusBadge status={b.status} />
                            </td>
                            <td className="py-2 pr-4 capitalize">
                              {b.initializedMode ?? "—"}
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs">
                              {b.tin ?? "—"}
                              {b.deviceSerialNo && (
                                <span className="block text-slate-400">{b.deviceSerialNo}</span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-xs">{fmt(b.initializedAt)}</td>
                            <td className="py-2 max-w-xs text-xs text-red-600">
                              {b.lastErrorMessage ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Code Sync Status ──────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" /> Code Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!syncStates.length ? (
                  <p className="text-sm text-slate-500">
                    No code sync records found. Run a code sync from the{" "}
                    <Link to="/warehouses" className="text-blue-600 hover:underline">
                      Warehouses
                    </Link>{" "}
                    page or via the API.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="pb-2 pr-4">Branch</th>
                          <th className="pb-2 pr-4">Sync type</th>
                          <th className="pb-2 pr-4">Last success</th>
                          <th className="pb-2 pr-4">Last attempt</th>
                          <th className="pb-2 pr-4">Codes received</th>
                          <th className="pb-2">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {syncStates.map((s, idx) => (
                          <tr key={idx} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 pr-4 font-mono text-xs">
                              {s.branchId ?? "—"}
                            </td>
                            <td className="py-2 pr-4 capitalize">
                              {s.syncType?.replace(/_/g, " ") ?? "—"}
                            </td>
                            <td className="py-2 pr-4 text-xs">
                              {s.lastSuccessfulSyncAt ? (
                                <span className="text-emerald-700">{fmt(s.lastSuccessfulSyncAt)}</span>
                              ) : (
                                <span className="text-amber-600">Never</span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-xs">{fmt(s.lastAttemptAt)}</td>
                            <td className="py-2 pr-4">
                              {s.summary?.received ?? "—"}
                            </td>
                            <td className="py-2 max-w-xs text-xs text-red-600">
                              {s.lastErrorMessage ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Queue Health ──────────────────────────────────────────────── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" /> Submission Queue Health
                </CardTitle>
                <Link
                  to="/ebm/control-center?tab=retry"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Open retry queue →
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4">
                  <QueueTile label="Submitted" value={queueCounts.submitted} colour="emerald" />
                  <QueueTile label="Pending" value={queueCounts.pending} colour="amber" />
                  <QueueTile label="Failed" value={queueCounts.failed} colour="red" alert />
                  <QueueTile label="Abandoned" value={queueCounts.abandoned} colour="red" alert />
                </div>
                {totalIssues > 0 && (
                  <p className="mt-4 text-sm text-red-600">
                    ⚠ {totalIssues} submission{totalIssues !== 1 ? "s" : ""} need attention.{" "}
                    <Link to="/ebm/control-center?tab=retry" className="font-medium underline">
                      View retry queue
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Alerts ────────────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" /> Abandoned Submission Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!alerts.length ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> No abandoned submissions — all clear.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="pb-2 pr-4">Document type</th>
                          <th className="pb-2 pr-4">Document ID</th>
                          <th className="pb-2 pr-4">Attempts</th>
                          <th className="pb-2 pr-4">Abandoned at</th>
                          <th className="pb-2">Last error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {alerts.map((a) => (
                          <tr key={a._id} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 pr-4 capitalize">
                              {a.documentType ?? "—"}
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs">
                              {a.documentId ?? "—"}
                            </td>
                            <td className="py-2 pr-4">{a.attemptsMade ?? "—"}</td>
                            <td className="py-2 pr-4 text-xs">{fmt(a.abandonedAt ?? a.createdAt)}</td>
                            <td className="py-2 max-w-xs text-xs text-red-600">
                              {a.lastErrorMessage ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function EBMComplianceDashboard() {
  return (
    <Layout>
      <EBMComplianceDashboardContent />
    </Layout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  sub,
  icon,
  alert = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Card className={alert && Number(value) > 0 ? "border-red-200" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                alert && Number(value) > 0
                  ? "text-red-600"
                  : "text-slate-950 dark:text-white"
              }`}
            >
              {value}
            </p>
            {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function QueueTile({
  label,
  value,
  colour,
  alert = false,
}: {
  label: string;
  value?: number;
  colour: "emerald" | "amber" | "red" | "slate";
  alert?: boolean;
}) {
  const count = value ?? 0;
  const colourMap: Record<string, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    slate: "text-slate-700",
  };
  return (
    <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          alert && count > 0 ? "text-red-600" : colourMap[colour]
        }`}
      >
        {count}
      </p>
    </div>
  );
}
