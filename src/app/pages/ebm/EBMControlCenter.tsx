import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Table2,
  Warehouse,
  DownloadCloud,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ebmApi, type EBMDeviceStatusResponse, type EBMReadinessResponse, type EBMSalesSyncResponse, type EBMItemSyncResponse, type EBMStockReconciliationResponse, type EBMStockReconciliationRow, type EBMSyncSummaryItem } from "@/lib/api";
import { formatSyncTimestamp, formatVsdcDate, matchStatusClass, matchStatusLabel, modeDescription, modeLabel } from "@/lib/ebmDisplayUtils";
import { Layout } from "@/app/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { EBMRetryQueueContent } from "./EBMRetryQueuePage";
import { EBMComplianceDashboardContent } from "./EBMComplianceDashboard";
import { ImportedItemsContent } from "../purchases/ImportedItemsPage";

interface UnmatchedPurchase {
  _id: string;
  supplierTin?: string;
  supplierName?: string;
  sellerInvoiceNo?: string;
  invoiceDate?: string;
  totalAmount?: number;
  taxAmount?: number;
  status?: string;
  pulledAt?: string;
}

interface QueueCounts {
  pending?: number;
  failed?: number;
  abandoned?: number;
  submitted?: number;
}


export default function EBMControlCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (value: string) => {
    setSearchParams(value === "overview" ? {} : { tab: value }, { replace: true });
  };
  const [loading, setLoading] = useState(false);
  const [syncingCodes, setSyncingCodes] = useState(false);
  const [devices, setDevices] = useState<EBMDeviceStatusResponse["data"] | null>(null);
  const [queueCounts, setQueueCounts] = useState<QueueCounts>({});
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedPurchase[]>([]);
  const [unmatchedSyncing, setUnmatchedSyncing] = useState(false);
  const [stockRecon, setStockRecon] = useState<EBMStockReconciliationResponse["data"] | null>(null);
  const [stockReconLoading, setStockReconLoading] = useState(false);
  const [stockResubmitting, setStockResubmitting] = useState(false);
  const [readiness, setReadiness] = useState<EBMReadinessResponse["data"] | null>(null);
  const [salesSync, setSalesSync] = useState<EBMSalesSyncResponse["data"] | null>(null);
  const [itemSync, setItemSync] = useState<EBMItemSyncResponse["data"] | null>(null);
  const [salesSyncLoading, setSalesSyncLoading] = useState(false);
  const [itemSyncLoading, setItemSyncLoading] = useState(false);
  const [branchId, setBranchId] = useState("00");

  const branchOptions = useMemo(() => {
    const fromDevices = (devices?.branches || []).map((branch) => ({
      id: branch.branchId,
      label: branch.branchName ? `${branch.branchId} · ${branch.branchName}` : `Branch ${branch.branchId}`,
    }));
    if (fromDevices.length) return fromDevices;
    return [{ id: "00", label: "Branch 00 · Head office" }];
  }, [devices]);

  const syncSummary = useMemo(() => readiness?.syncSummary || [], [readiness]);

  const branchStats = useMemo(() => {
    const total = devices?.branches?.length || 0;
    const initialized = devices?.branches?.filter((b) => b.status === "initialized").length || 0;
    const failed = devices?.branches?.filter((b) => b.status === "failed").length || 0;
    const pending = total - initialized - failed;
    return { total, initialized, failed, pending };
  }, [devices]);

  const queueStats = useMemo(() => {
    return {
      pending: queueCounts.pending || 0,
      failed: queueCounts.failed || 0,
      abandoned: queueCounts.abandoned || 0,
      submitted: queueCounts.submitted || 0,
    };
  }, [queueCounts]);

  const load = async () => {
    setLoading(true);
    try {
      const [devicesRes, queueRes, unmatchedRes, readinessRes] = await Promise.all([
        ebmApi
          .getDevices()
          .catch((error) => {
            console.warn("[EBM Control Center] Devices fetch failed", error?.message || error);
            return null;
          }),
        ebmApi
          .getQueue({ page: 1, pageSize: 5 })
          .catch((error) => {
            console.warn("[EBM Control Center] Queue fetch failed", error?.message || error);
            return null;
          }),
        ebmApi
          .getUnmatchedPurchases({ status: "unmatched", limit: 50 })
          .catch((error) => {
            console.warn("[EBM Control Center] Unmatched purchases fetch failed", error?.message || error);
            return null;
          }),
        ebmApi
          .getReadiness({ branchId })
          .catch((error) => {
            console.warn("[EBM Control Center] Readiness fetch failed", error?.message || error);
            return null;
          }),
      ]);

      if (devicesRes?.data) setDevices(devicesRes.data);
      if (readinessRes?.data) setReadiness(readinessRes.data);
      const counts = (queueRes as any)?.data?.counts || (queueRes as any)?.counts || {};
      setQueueCounts(counts as QueueCounts);
      const unmatchedData = (unmatchedRes as any)?.data;
      const list = Array.isArray(unmatchedData) ? (unmatchedData as UnmatchedPurchase[]) : [];
      setUnmatchedItems(list);
      setUnmatchedCount(list.length);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load EBM control data");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCodes = async () => {
    setSyncingCodes(true);
    try {
      await ebmApi.syncCodes({ branchId });
      toast.success("RRA reference codes updated");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "RRA code sync failed");
    } finally {
      setSyncingCodes(false);
    }
  };

  const handleUnmatchedSync = async () => {
    setUnmatchedSyncing(true);
    try {
      await ebmApi.syncPurchases({ branchId });
      toast.success("Purchase pull completed");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Purchase pull failed");
    } finally {
      setUnmatchedSyncing(false);
    }
  };
  const handleStockReconcile = async () => {
    setStockReconLoading(true);
    try {
      const response = await ebmApi.reconcileStock({ branchId });
      setStockRecon(response.data);
      const count = response.data.summary?.discrepancy || 0;
      toast.success(count ? `Stock reconciliation completed with ${count} differences` : "Stock master matches local stock");
    } catch (error: any) {
      toast.error(error?.message || "Stock reconciliation failed");
    } finally {
      setStockReconLoading(false);
    }
  };

  const handleStockResubmit = async () => {
    setStockResubmitting(true);
    try {
      const response = await ebmApi.resubmitStockMaster({ branchId: stockRecon?.branchId || branchId, allDiscrepancies: true });
      toast.success(`Submitted ${response.data.submitted} stock master update(s)`);
      await handleStockReconcile();
    } catch (error: any) {
      toast.error(error?.message || "Stock master resubmission failed");
    } finally {
      setStockResubmitting(false);
    }
  };

  const handleSalesSync = async () => {
    setSalesSyncLoading(true);
    try {
      const response = await ebmApi.syncSalesSummaries({ branchId });
      setSalesSync(response.data);
      const missing = response.data.summary?.missingLocal || 0;
      toast.success(
        missing
          ? `Synced ${response.data.summary?.pulled || 0} RRA sales · ${missing} need attention`
          : `Synced ${response.data.summary?.pulled || 0} RRA sales · all matched`,
      );
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Sales summary sync failed");
    } finally {
      setSalesSyncLoading(false);
    }
  };

  const handleItemSync = async () => {
    setItemSyncLoading(true);
    try {
      const response = await ebmApi.syncRegisteredItems({ branchId });
      setItemSync(response.data);
      const missing = response.data.summary?.missingLocal || 0;
      toast.success(
        missing
          ? `Synced ${response.data.summary?.pulled || 0} RRA items · ${missing} not linked locally`
          : `Synced ${response.data.summary?.pulled || 0} RRA items · all linked`,
      );
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Registered item sync failed");
    } finally {
      setItemSyncLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleReadinessAction = async (check: EBMReadinessResponse["data"]["checks"][number]) => {
    if (check.actionId === "sync_codes") {
      await handleSyncCodes();
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">EBM / RRA Fiscal</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">EBM Control Center</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Set up your device, sync with RRA, and keep invoices, products, and stock aligned.
            </p>
            {devices?.mode && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {modeLabel(devices.mode)} — {modeDescription(devices.mode)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/company-settings">
                <ShieldCheck className="h-4 w-4" /> Setup
              </Link>
            </Button>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full flex-wrap gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales-sync">Reconciliation</TabsTrigger>
            <TabsTrigger value="retry">Failed Submissions</TabsTrigger>
            <TabsTrigger value="unmatched">Purchases</TabsTrigger>
            <TabsTrigger value="imported">Imported Goods</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {readiness && !readiness.ready && (
              <Card className="border-blue-200 bg-blue-50/50 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-blue-900 dark:text-blue-100">Getting started with RRA EBM</CardTitle>
                  <p className="text-sm text-blue-800/80 dark:text-blue-200/80">
                    Complete the checklist below before sending live fiscal invoices. You can work in practice mode first.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/company-settings">1. Device setup</Link>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleSyncCodes} disabled={syncingCodes}>
                    2. Sync RRA codes
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/products?filter=ebm">3. Register products</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/invoices">4. Submit a test invoice</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {readiness && (
              <Card className={`border shadow-sm ${readiness.ready ? "border-emerald-200 dark:border-emerald-900/50" : "border-amber-200 dark:border-amber-900/50"}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <ShieldCheck className={`h-5 w-5 ${readiness.ready ? "text-emerald-600" : "text-amber-600"}`} />
                      RRA Go-Live Readiness
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Branch {readiness.branchId} · {modeLabel(readiness.mode)}
                    </p>
                  </div>
                  <Badge variant="outline" className={readiness.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {readiness.ready ? "Ready for live invoices" : "Setup incomplete"}
                  </Badge>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {readiness.checks.map((check) => (
                    <div key={check.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        {check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        {check.label}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{check.detail}</p>
                      {!check.ok && check.actionPath && (
                        <Button asChild size="sm" variant="link" className="mt-1 h-auto px-0 text-emerald-700 dark:text-emerald-300">
                          <Link to={check.actionPath}>{check.actionLabel || "Fix this"}</Link>
                        </Button>
                      )}
                      {!check.ok && check.actionId === "sync_codes" && (
                        <Button size="sm" variant="link" className="mt-1 h-auto px-0 text-emerald-700 dark:text-emerald-300" onClick={() => handleReadinessAction(check)} disabled={syncingCodes}>
                          {check.actionLabel || "Sync codes now"}
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {syncSummary.length > 0 && (
              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900 dark:text-white">Recent RRA sync activity</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Last successful pull from RRA for branch {branchId}</p>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {syncSummary.map((item) => (
                    <div key={item.syncType} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                      <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatSyncTimestamp(item.lastSyncedAt)}</p>
                      {item.lastErrorMessage && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{item.lastErrorMessage}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" /> Devices & Codes
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Initialize your device and download RRA reference codes</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {modeLabel(devices?.mode)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex flex-wrap gap-3">
                    <Badge className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {branchStats.initialized} Initialized
                    </Badge>
                    <Badge className="gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                      <Clock className="h-3.5 w-3.5" /> {branchStats.pending} Pending
                    </Badge>
                    <Badge className="gap-1 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200">
                      <AlertTriangle className="h-3.5 w-3.5" /> {branchStats.failed} Failed
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" className="gap-2">
                      <Link to="/company-settings">
                        <LayoutDashboard className="h-4 w-4" /> Open device setup
                      </Link>
                    </Button>
                    <Button onClick={handleSyncCodes} disabled={syncingCodes} className="gap-2">
                      {syncingCodes ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync codes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <Warehouse className="h-5 w-5 text-blue-600" /> Branch & Registration
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Register branches and review compliance status</p>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Branches: {branchStats.total}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" className="gap-2">
                      <Link to="/warehouses">
                        <Table2 className="h-4 w-4" /> Manage branches
                      </Link>
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setActiveTab("compliance")}>
                      <ShieldCheck className="h-4 w-4" /> Compliance dashboard
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Register each warehouse branch with RRA before submitting fiscal documents.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <RefreshCw className="h-5 w-5 text-amber-600" /> Submission Queue
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Review invoices and purchases that failed to reach RRA</p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    Pending: {queueStats.pending}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">Failed: {queueStats.failed}</Badge>
                    <Badge className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200">Abandoned: {queueStats.abandoned}</Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Submitted: {queueStats.submitted}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="gap-2" onClick={() => setActiveTab("retry")}>
                      <RefreshCw className="h-4 w-4" /> Retry queue
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setActiveTab("compliance")}>
                      <ShieldCheck className="h-4 w-4" /> Alerts & health
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <DownloadCloud className="h-5 w-5 text-blue-600" /> Imports & Purchases
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Manage imported items and unmatched RRA purchases</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                      Unmatched purchases: {unmatchedCount}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="gap-2" onClick={() => setActiveTab("imported")}>
                      <DownloadCloud className="h-4 w-4" /> Imported goods
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setActiveTab("unmatched")}>
                      <AlertTriangle className="h-4 w-4" /> Unmatched purchases
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Table2 className="h-5 w-5 text-indigo-600" /> Products & Items
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Register items and view EBM item status</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" className="gap-2">
                      <Link to="/products">
                        <ArrowRight className="h-4 w-4" /> Open products
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="gap-2">
                      <Link to="/products?filter=ebm">
                        <ShieldCheck className="h-4 w-4" /> EBM status filter
                      </Link>
                    </Button>
                    <Button onClick={handleItemSync} disabled={itemSyncLoading} variant="outline" className="gap-2">
                      {itemSyncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync RRA items
                    </Button>
                    <Button onClick={handleStockReconcile} disabled={stockReconLoading} variant="outline" className="gap-2">
                      {stockReconLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Reconcile stock
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Use item class, tax type, and insurance flags when registering products with RRA.</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <LayoutDashboard className="h-5 w-5 text-emerald-600" /> Invoices & Fiscal Proof
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Check RRA status on invoices and receipts</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" className="gap-2">
                      <Link to="/invoices">
                        <ShieldCheck className="h-4 w-4" /> Invoices (RRA status)
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="gap-2">
                      <Link to="/purchases">
                        <ShieldCheck className="h-4 w-4" /> Purchases (EBM match)
                      </Link>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    After a successful submission, fiscal receipt details appear on the invoice detail page and PDF.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="retry">
            <EBMRetryQueueContent />
          </TabsContent>

          <TabsContent value="unmatched">
            <UnmatchedPurchasesTab
              items={unmatchedItems}
              loading={loading}
              syncing={unmatchedSyncing}
              onRefresh={load}
              onSync={handleUnmatchedSync}
            />
          </TabsContent>

          <TabsContent value="imported">
            <ImportedItemsContent branchId={branchId} />
          </TabsContent>

          <TabsContent value="stock">
            <StockMasterTab
              reconciliation={stockRecon}
              loading={stockReconLoading}
              resubmitting={stockResubmitting}
              onReconcile={handleStockReconcile}
              onResubmit={handleStockResubmit}
            />
          </TabsContent>

          <TabsContent value="sales-sync">
            <SalesSyncTab
              branchId={branchId}
              salesSync={salesSync}
              itemSync={itemSync}
              syncSummary={syncSummary}
              salesLoading={salesSyncLoading}
              itemsLoading={itemSyncLoading}
              onSalesSync={handleSalesSync}
              onItemSync={handleItemSync}
            />
          </TabsContent>

          <TabsContent value="compliance">
            <EBMComplianceDashboardContent embedded />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function UnmatchedPurchasesTab({
  items,
  loading,
  syncing,
  onRefresh,
  onSync,
}: {
  items: UnmatchedPurchase[];
  loading: boolean;
  syncing: boolean;
  onRefresh: () => Promise<void> | void;
  onSync: () => Promise<void> | void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Unmatched EBM Purchases</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pull purchases from RRA and reconcile unmatched documents.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSync} disabled={!!syncing} className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Pull from RRA
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>TIN</TableHead>
              <TableHead>Seller Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.supplierName || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{item.supplierTin || "-"}</TableCell>
                <TableCell>{item.sellerInvoiceNo || "-"}</TableCell>
                <TableCell>{item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-right">{(item.taxAmount || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">{(item.totalAmount || 0).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  {loading ? "Loading..." : "No unmatched RRA purchase records"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}



function StockMasterTab({
  reconciliation,
  loading,
  resubmitting,
  onReconcile,
  onResubmit,
}: {
  reconciliation: EBMStockReconciliationResponse["data"] | null;
  loading: boolean;
  resubmitting: boolean;
  onReconcile: () => Promise<void> | void;
  onResubmit: () => Promise<void> | void;
}) {
  const rows = reconciliation?.rows || [];
  const actionable = rows.filter((row) => row.status === "discrepancy" || row.status === "missing_vsdc").length;

  const statusLabel = (row: EBMStockReconciliationRow) => {
    if (row.status === "missing_vsdc") return "Missing in VSDC";
    if (row.status === "missing_local") return "Missing locally";
    if (row.status === "discrepancy") return "Different";
    return "Matched";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Stock Master Reconciliation</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Compare local product stock with RRA VSDC residual quantities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onReconcile} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reconcile
          </Button>
          <Button variant="outline" onClick={onResubmit} disabled={resubmitting || loading || actionable === 0} className="gap-2">
            {resubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Resubmit differences
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">Branch: {reconciliation?.branchId || "00"}</Badge>
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Matched: {reconciliation?.summary?.matched || 0}</Badge>
        <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">Different: {reconciliation?.summary?.discrepancy || 0}</Badge>
        <Badge className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200">Missing VSDC: {reconciliation?.summary?.missing_vsdc || 0}</Badge>
        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Missing local: {reconciliation?.summary?.missing_local || 0}</Badge>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Local Qty</TableHead>
              <TableHead className="text-right">VSDC Qty</TableHead>
              <TableHead className="text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((row) => (
              <TableRow key={`${row.itemCd}-${row.status}`}>
                <TableCell className="font-mono text-xs">{row.itemCd}</TableCell>
                <TableCell>{row.productName || row.vsdcItemName || "-"}</TableCell>
                <TableCell>{statusLabel(row)}</TableCell>
                <TableCell className="text-right">{row.localQty == null ? "-" : row.localQty.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.vsdcQty == null ? "-" : row.vsdcQty.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.difference.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  {loading ? "Loading..." : "Run reconciliation to compare local stock with VSDC"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SalesSyncTab({
  branchId,
  salesSync,
  itemSync,
  syncSummary,
  salesLoading,
  itemsLoading,
  onSalesSync,
  onItemSync,
}: {
  branchId: string;
  salesSync: EBMSalesSyncResponse["data"] | null;
  itemSync: EBMItemSyncResponse["data"] | null;
  syncSummary: EBMSyncSummaryItem[];
  salesLoading: boolean;
  itemsLoading: boolean;
  onSalesSync: () => Promise<void> | void;
  onItemSync: () => Promise<void> | void;
}) {
  const salesLastSynced = salesSync?.lastSyncedAt
    || syncSummary.find((item) => item.syncType === "sales_summary")?.lastSyncedAt
    || null;
  const itemsLastSynced = itemSync?.lastSyncedAt
    || syncSummary.find((item) => item.syncType === "registered_items")?.lastSyncedAt
    || null;
  const salesRows = salesSync?.summaries || [];
  const itemRows = itemSync?.items || [];
  const salesNeedsAttention = salesRows.filter((row) => row.matchStatus !== "matched");

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-slate-900 dark:text-white">Sales reconciliation</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Compare RRA fiscal sales with your local invoices for branch {branchId}.
            </p>
            <p className="text-xs text-slate-500">Last synced: {formatSyncTimestamp(salesLastSynced)}</p>
          </div>
          <Button onClick={onSalesSync} disabled={salesLoading} className="gap-2 shrink-0">
            {salesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync sales from RRA
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {salesSync ? (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">From RRA: {salesSync.summary?.pulled || 0}</Badge>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Matched: {salesSync.summary?.matched || 0}</Badge>
                <Badge className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Needs attention: {salesSync.summary?.missingLocal || 0}</Badge>
              </div>
              {salesNeedsAttention.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                  <p className="font-medium">Some RRA sales are not linked to local invoices.</p>
                  <p className="mt-1 text-xs opacity-90">
                    This usually means the invoice was fiscalized in RRA but not recorded locally, or the fiscal invoice number does not match.
                    Open Invoices and verify EBM submission status.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link to="/invoices">Open invoices</Link>
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RRA invoice #</TableHead>
                      <TableHead>Sale date</TableHead>
                      <TableHead>Local invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total (RWF)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesRows.slice(0, 50).map((row, index) => (
                      <TableRow key={`${row.invcNo}-${index}`}>
                        <TableCell className="font-medium">{row.invcNo || "—"}</TableCell>
                        <TableCell>{formatVsdcDate(row.salesDt)}</TableCell>
                        <TableCell>
                          {row.localDocumentId ? (
                            <Link to={`/invoices/${row.localDocumentId}`} className="text-emerald-700 hover:underline dark:text-emerald-300">
                              {row.localReferenceNo || "View invoice"}
                            </Link>
                          ) : (
                            <span className="text-slate-400">Not found</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={matchStatusClass(row.matchStatus)}>
                            {matchStatusLabel(row.matchStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.totAmt != null ? row.totAmt.toLocaleString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!salesRows.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                          No RRA sales were returned for this branch and date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white">No sales sync yet</p>
              <p className="mt-1 text-sm text-slate-500">Pull sales summaries from RRA to compare them with your local invoices.</p>
              <Button onClick={onSalesSync} disabled={salesLoading} className="mt-4 gap-2">
                {salesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync sales from RRA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-slate-900 dark:text-white">Product reconciliation</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Compare RRA registered items with your local product catalog.
            </p>
            <p className="text-xs text-slate-500">Last synced: {formatSyncTimestamp(itemsLastSynced)}</p>
          </div>
          <Button onClick={onItemSync} disabled={itemsLoading} variant="outline" className="gap-2 shrink-0">
            {itemsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync products from RRA
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemSync ? (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">From RRA: {itemSync.summary?.pulled || 0}</Badge>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Linked: {itemSync.summary?.matched || 0}</Badge>
                <Badge className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Not linked: {itemSync.summary?.missingLocal || 0}</Badge>
              </div>
              {(itemSync.summary?.missingLocal || 0) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                  <p className="font-medium">Some RRA items are not linked to local products.</p>
                  <p className="mt-1 text-xs opacity-90">Register missing products or assign the correct RRA item code on existing products.</p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link to="/products?filter=ebm">Review products</Link>
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RRA item code</TableHead>
                      <TableHead>RRA name</TableHead>
                      <TableHead>Local product</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemRows.slice(0, 50).map((row) => (
                      <TableRow key={row.itemCd}>
                        <TableCell className="font-mono text-xs">{row.itemCd}</TableCell>
                        <TableCell>{row.itemNm || "—"}</TableCell>
                        <TableCell>
                          {row.localProductId ? (
                            <Link to={`/products/${row.localProductId}`} className="text-emerald-700 hover:underline dark:text-emerald-300">
                              {row.localProductName || "View product"}
                            </Link>
                          ) : (
                            <span className="text-slate-400">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={matchStatusClass(row.matchStatus)}>
                            {matchStatusLabel(row.matchStatus)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!itemRows.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                          No registered items were returned from RRA for this branch.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white">No product sync yet</p>
              <p className="mt-1 text-sm text-slate-500">Pull registered items from RRA to verify your product catalog is aligned.</p>
              <Button onClick={onItemSync} disabled={itemsLoading} variant="outline" className="mt-4 gap-2">
                {itemsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync products from RRA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5" /> Common RRA rejection messages
          </CardTitle>
          <p className="text-sm text-amber-900/80 dark:text-amber-100/80">If an invoice fails, check the EBM tab on the invoice or the Failed Submissions tab.</p>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-amber-900 dark:text-amber-100 sm:grid-cols-2">
          <p><strong>881</strong> — Confirm the related purchase before fiscalizing this sale.</p>
          <p><strong>882</strong> — The purchase order code is invalid.</p>
          <p><strong>883</strong> — That purchase order code was already used on another sale.</p>
          <p><strong>884</strong> — The customer TIN is not valid in RRA.</p>
        </CardContent>
      </Card>
    </div>
  );
}
