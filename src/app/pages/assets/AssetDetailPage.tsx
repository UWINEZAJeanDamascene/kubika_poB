import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  fixedAssetsApi,
  bankAccountsApi,
  FixedAsset,
  DepreciationScheduleItem,
  DepreciationEntry,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Loader2,
  Package,
  Calculator,
  TrendingDown,
  FileText,
  Trash2,
  RefreshCw,
  Shield,
  Play,
  Pause,
  Wrench,
  History,
  Truck,
  Layers,
  Banknote,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatCurrency as sharedFormatCurrency } from "@/lib/currencyUtils";

export default function AssetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<FixedAsset | null>(null);
  const [schedule, setSchedule] = useState<DepreciationScheduleItem[]>([]);
  const [depreciationEntries, setDepreciationEntries] = useState<
    DepreciationEntry[]
  >([]);
  const [activeTab, setActiveTab] = useState("details");

  // Depreciation dialog
  const [depreciateDialogOpen, setDepreciateDialogOpen] = useState(false);
  const [depreciateDate, setDepreciateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [depreciating, setDepreciating] = useState(false);
  // const [depreciationPreview, setDepreciationPreview] = useState<any>(null);

  // Disposal dialog
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [disposalForm, setDisposalForm] = useState({
    disposalDate: new Date().toISOString().split("T")[0],
    disposalProceeds: 0,
    disposalCosts: 0,
    disposalMethod: "sale",
    bankAccountId: "",
    disposalAuthNumber: "",
    notes: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [disposing, setDisposing] = useState(false);

  // Status management dialogs
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    toStatus: "",
    reason: "",
    notes: "",
  });
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res: any = await bankAccountsApi.getAll({ isActive: true });
      if (res.success) setBankAccounts(res.data || []);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchAsset = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [assetRes, scheduleRes]: any = await Promise.all([
        fixedAssetsApi.getById(id),
        fixedAssetsApi.getDepreciationSchedule(id),
      ]);
      if (assetRes.success) {
        setAsset(assetRes.data);
        if (scheduleRes.success) {
          setSchedule(scheduleRes.data?.schedule || []);
        }
      }
    } catch (error) {
      console.error("[AssetDetailPage] Failed to fetch asset:", error);
      toast.error(t("assets.errors.fetchFailed"));
      navigate("/assets");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  const fetchDepreciationEntries = useCallback(async () => {
    if (!id) return;
    try {
      const response: any = await fixedAssetsApi.getDepreciationEntries(id);
      if (response.success) {
        setDepreciationEntries(response.data || []);
      }
    } catch (error) {
      console.error(
        "[AssetDetailPage] Failed to fetch depreciation entries:",
        error,
      );
    }
  }, [id]);

  const fetchStatusHistory = useCallback(async () => {
    if (!id) return;
    try {
      const response: any = await fixedAssetsApi.getStatusHistory(id);
      if (response.success) {
        setStatusHistory(response.data || []);
      }
    } catch (error) {
      console.error("[AssetDetailPage] Failed to fetch status history:", error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAsset();
      fetchBankAccounts();
    }
  }, [id, fetchAsset, fetchBankAccounts]);

  useEffect(() => {
    if (activeTab === "entries" && id) {
      fetchDepreciationEntries();
    }
  }, [activeTab, id, fetchDepreciationEntries]);

  useEffect(() => {
    if (activeTab === "history" && id) {
      fetchStatusHistory();
    }
  }, [activeTab, id, fetchStatusHistory]);

  const handleDepreciate = async () => {
    if (!id) return;
    setDepreciating(true);
    try {
      const response: any = await fixedAssetsApi.postDepreciation(
        id,
        depreciateDate,
      );
      if (response.success) {
        if (response.alreadyPosted) {
          toast.info(response.message || t("assets.success.depreciationAlreadyPosted"));
        } else {
          toast.success(t("assets.success.depreciation"));
        }
        setDepreciateDialogOpen(false);
        fetchAsset();
        if (activeTab === "entries") fetchDepreciationEntries();
      } else {
        toast.error(response.error || t("assets.errors.depreciationFailed"));
      }
    } catch (error: any) {
      console.error("[AssetDetailPage] Depreciation error:", error);
      toast.error(
        error.response?.data?.error || t("assets.errors.depreciationFailed"),
      );
    } finally {
      setDepreciating(false);
    }
  };

  const handleDispose = async () => {
    if (!id) return;
    setDisposing(true);
    try {
      const response = await fixedAssetsApi.dispose(id, {
        disposalDate: disposalForm.disposalDate,
        disposalProceeds: disposalForm.disposalProceeds,
        disposalCosts: disposalForm.disposalCosts,
        disposalMethod: disposalForm.disposalMethod,
        bankAccountId: disposalForm.bankAccountId || undefined,
        disposalAuthNumber: disposalForm.disposalAuthNumber || undefined,
        notes: disposalForm.notes,
      });
      const res: any = response;
      if (res.success) {
        toast.success(t("assets.success.disposal") || "Asset disposed successfully");
        setDisposeDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(res.error || t("assets.errors.disposalFailed"));
      }
    } catch (error: any) {
      console.error("[AssetDetailPage] Disposal error:", error);
      toast.error(
        error.response?.data?.error || t("assets.errors.disposalFailed"),
      );
    } finally {
      setDisposing(false);
    }
  };

  const formatCurrency = (amount: any) => {
    // Normalize Decimal128/strings to number, then delegate to shared formatter
    let numAmount = 0;
    if (amount !== null && amount !== undefined && amount !== "") {
      if (typeof amount === "object") {
        if ((amount as any).$numberDecimal) {
          numAmount = parseFloat((amount as any).$numberDecimal);
        } else if (typeof amount.toString === "function") {
          numAmount = parseFloat(amount.toString());
        }
      } else if (typeof amount === "string") {
        numAmount = parseFloat(amount);
      } else {
        numAmount = amount;
      }
    }
    if (isNaN(numAmount)) numAmount = 0;
    return sharedFormatCurrency(numAmount, 'RWF');
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
      in_transit: { color: "bg-blue-500", label: tr("assets.status.inTransit", "In Transit"), icon: Truck },
      in_service: { color: "bg-green-500", label: tr("assets.status.inService", "In Service"), icon: Play },
      under_maintenance: { color: "bg-orange-500", label: tr("assets.status.maintenance", "Under Maintenance"), icon: Wrench },
      idle: { color: "bg-yellow-500", label: tr("assets.status.idle", "Idle"), icon: Pause },
      fully_depreciated: { color: "bg-amber-500", label: tr("assets.status.fullyDepreciated", "Fully Depreciated"), icon: TrendingDown },
      disposed: { color: "bg-red-500", label: tr("assets.status.disposed", "Disposed"), icon: Trash2 },
      active: { color: "bg-green-500", label: tr("assets.status.active", "Active"), icon: Play },
    };

    const config = statusConfig[status] || { color: "bg-slate-500", label: status, icon: null };
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white dark:opacity-90 flex items-center gap-1`}>
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const getValidTransitions = (currentStatus: string) => {
    const transitions: Record<string, { value: string; label: string; icon: any }[]> = {
      in_transit: [
        { value: "in_service", label: "Place In Service", icon: Play },
      ],
      in_service: [
        { value: "under_maintenance", label: "Start Maintenance", icon: Wrench },
        { value: "idle", label: "Mark Idle", icon: Pause },
      ],
      under_maintenance: [
        { value: "in_service", label: "Return to Service", icon: Play },
        { value: "idle", label: "Mark Idle", icon: Pause },
      ],
      idle: [
        { value: "in_service", label: "Return to Service", icon: Play },
        { value: "under_maintenance", label: "Start Maintenance", icon: Wrench },
      ],
      fully_depreciated: [],
      disposed: [],
    };
    return transitions[currentStatus] || [];
  };

  const handlePlaceInService = async () => {
    if (!id) return;
    setChangingStatus(true);
    try {
      const response: any = await fixedAssetsApi.placeInService(id, {
        inServiceDate: new Date().toISOString().split("T")[0],
      });
      if (response.success) {
        toast.success("Asset placed in service. Depreciation will start from in-service date.");
        fetchAsset();
      } else {
        toast.error(response.error || "Failed to place asset in service");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to place asset in service");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!id || !statusForm.toStatus) return;
    setChangingStatus(true);
    try {
      const response: any = await fixedAssetsApi.transitionStatus(id, {
        toStatus: statusForm.toStatus,
        reason: statusForm.reason,
        notes: statusForm.notes,
      });
      if (response.success) {
        toast.success(`Asset status changed to ${statusForm.toStatus.replace("_", " ")}`);
        setStatusDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(response.error || "Failed to change status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to change status");
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900/70">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading asset details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-4 dark:bg-slate-900/70">
              <Package className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("assets.errors.notFound")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The asset you are looking for could not be found.</p>
            <Button variant="outline" size="sm" className="mt-4 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => navigate("/assets")}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Assets
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* ── Hero Header ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => navigate("/assets")} className="h-9 w-9 dark:text-slate-300 dark:hover:bg-slate-800">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{asset.name}</h1>
                      {getStatusBadge(asset.status)}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{asset.referenceNo}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {asset.status === "in_transit" && (
                  <Button size="sm" onClick={handlePlaceInService} disabled={changingStatus} className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Play className="h-4 w-4" />
                    Place In Service
                  </Button>
                )}
                {getValidTransitions(asset.status).length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    <RefreshCw className="h-4 w-4" />
                    Change Status
                  </Button>
                )}
                {(asset.status === "in_service" || asset.status === "active") && (
                  <Button variant="outline" size="sm" onClick={() => setDepreciateDialogOpen(true)} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Calculator className="h-4 w-4" />
                    {t("assets.actions.depreciate")}
                  </Button>
                )}
                {asset.status !== "disposed" && (
                  <Button size="sm" variant="destructive" onClick={() => setDisposeDialogOpen(true)} className="h-9 gap-2">
                    <Trash2 className="h-4 w-4" />
                    {t("assets.actions.dispose")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Purchase Cost</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(asset.purchaseCost)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <Banknote className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Accumulated Depreciation</p>
                    <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(asset.accumulatedDepreciation)}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2.5 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Net Book Value</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(asset.netBookValue)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Calculator className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Useful Life</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{asset.usefulLifeMonths} <span className="text-base font-normal text-slate-500 dark:text-slate-400">months</span></p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <TabsTrigger value="details" className="text-sm font-medium text-slate-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:text-slate-300 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-300">
              {t("assets.tabs.details")}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-sm font-medium text-slate-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:text-slate-300 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-300">
              {t("assets.tabs.schedule")}
            </TabsTrigger>
            <TabsTrigger value="entries" className="text-sm font-medium text-slate-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:text-slate-300 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-300">
              {t("assets.tabs.entries")}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm font-medium text-slate-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:text-slate-300 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-300">
              <History className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Asset Info */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Package className="h-5 w-5" />
                    {t("assets.sections.assetInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.referenceNo")}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{asset.referenceNo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.name")}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{asset.name}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.description")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.description || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.category")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{(asset.categoryId as any)?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.status")}</p>
                      <div className="mt-1">{getStatusBadge(asset.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.serialNumber")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.serialNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.location")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.location || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.department")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{(asset.departmentId as any)?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.supplier")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{(asset.supplierId as any)?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.purchaseDate")}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatDate(asset.purchaseDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.purchaseCost")}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(asset.purchaseCost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Summary */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <TrendingDown className="h-5 w-5" />
                    {t("assets.sections.depreciationSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.purchaseCost")}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(asset.purchaseCost)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <Banknote className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.accumulatedDepreciation")}</p>
                    <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(asset.accumulatedDepreciation)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.netBookValue")}</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(asset.netBookValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.salvageValue")}</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatCurrency(asset.salvageValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.usefulLifeMonths")}</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.usefulLifeMonths} months</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.depreciationMethod")}</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.depreciationMethod === "straight_line" ? t("assets.depreciation.straightLine") : t("assets.depreciation.decliningBalance")}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty & Insurance */}
              {(asset.warrantyStartDate || asset.warrantyEndDate || asset.insuredValue) && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <Shield className="h-5 w-5" />
                      {t("assets.sections.warrantyInsurance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.warrantyStartDate")}</p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatDate(asset.warrantyStartDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.warrantyEndDate")}</p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatDate(asset.warrantyEndDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.insuredValue")}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(asset.insuredValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Codes */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <FileText className="h-5 w-5" />
                    {t("assets.sections.accountCodes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.assetAccount")}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">{asset.assetAccountCode}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.accumDepreciationAccount")}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">{asset.accumDepreciationAccountCode}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("assets.fields.depreciationExpenseAccount")}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">{asset.depreciationExpenseAccountCode}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Depreciation Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  {t("assets.sections.depreciationSchedule")}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t("assets.sections.depreciationScheduleDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schedule.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl p-8 text-center">
                    <Calculator className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("assets.noSchedule")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.schedule.period")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.schedule.date")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.schedule.openingNBV")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.schedule.depreciation")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.schedule.closingNBV")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y dark:divide-slate-800">
                        {schedule.map((item) => (
                          <TableRow key={item.period} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{item.label}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(item.date)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(item.openingNBV)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(item.depreciation)}</TableCell>
                            <TableCell className="text-right text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(item.closingNBV)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posted Entries Tab */}
          <TabsContent value="entries">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="dark:text-white">{t("assets.sections.postedEntries")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t("assets.sections.postedEntriesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {depreciationEntries.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl p-8 text-center">
                    <FileText className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("assets.noEntries")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.entries.period")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.entries.date")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.entries.depreciation")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.entries.accumAfter")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("assets.entries.nbvAfter")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y dark:divide-slate-800">
                        {depreciationEntries.map((entry) => (
                          <TableRow key={entry._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.periodDate)}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.createdAt)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(entry.depreciationAmount)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{formatCurrency(entry.accumulatedAfter)}</TableCell>
                            <TableCell className="text-right text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(entry.netBookValueAfter)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status History Tab */}
          <TabsContent value="history">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <History className="h-5 w-5" />
                  Asset Status History
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Complete lifecycle audit trail for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusHistory.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl p-8 text-center">
                    <History className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No status history recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Date</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">From</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">To</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Changed By</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y dark:divide-slate-800">
                        {statusHistory.map((entry) => (
                          <TableRow key={entry._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.changedAt)}</TableCell>
                            <TableCell>{getStatusBadge(entry.fromStatus)}</TableCell>
                            <TableCell>{getStatusBadge(entry.toStatus)}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{entry.changedBy?.name || "System"}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{entry.reason || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Depreciate Dialog */}
        <Dialog open={depreciateDialogOpen} onOpenChange={setDepreciateDialogOpen}>
          <DialogContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                  <Calculator className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">{t("assets.dialogs.depreciate.title")}</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">{t("assets.dialogs.depreciate.description")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">{t("assets.fields.periodDate")}</Label>
                <Input type="date" value={depreciateDate} onChange={(e) => setDepreciateDate(e.target.value)} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setDepreciateDialogOpen(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <X className="mr-1 h-4 w-4" />
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleDepreciate} disabled={depreciating} className="bg-indigo-600 hover:bg-indigo-700">
                {depreciating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                <Calculator className="mr-1 h-4 w-4" />
                {t("assets.actions.depreciate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Transition Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Change Asset Status</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">Transition asset from {asset.status.replace("_", " ")} to a new status</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">New Status</Label>
                <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={statusForm.toStatus} onChange={(e) => setStatusForm({ ...statusForm, toStatus: e.target.value })}>
                  <option value="">Select new status...</option>
                  {getValidTransitions(asset.status).map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">Reason</Label>
                <Input value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} placeholder="e.g., Scheduled maintenance, Seasonal idle" className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">Notes</Label>
                <Input value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} placeholder="Additional details..." className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleStatusTransition} disabled={changingStatus || !statusForm.toStatus} className="bg-amber-600 hover:bg-amber-700">
                {changingStatus && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-1 h-4 w-4" />
                Change Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dispose Dialog - Enhanced */}
        <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
          <DialogContent className="flex max-h-[min(88vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-950">
            <DialogHeader className="shrink-0 gap-1 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-50 p-2 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                  <Trash2 className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">{t("assets.dialogs.dispose.title")}</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">Record asset disposal with complete financial details</DialogDescription>
            </DialogHeader>
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4 [scrollbar-width:thin] [scrollbar-color:#64748b_transparent]">
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">Disposal Method</Label>
                <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={disposalForm.disposalMethod} onChange={(e) => setDisposalForm({ ...disposalForm, disposalMethod: e.target.value })}>
                  <option value="sale">Sale (Sold to third party)</option>
                  <option value="scrap">Scrap (No proceeds)</option>
                  <option value="donation">Donation (Given away)</option>
                  <option value="trade_in">Trade-in (Exchanged)</option>
                  <option value="theft_loss">Theft/Loss (Insurance claim)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">{t("assets.fields.disposalDate")}</Label>
                <Input type="date" value={disposalForm.disposalDate} onChange={(e) => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium dark:text-slate-200">Gross Proceeds</Label>
                  <Input type="number" min="0" step="0.01" value={disposalForm.disposalProceeds} onChange={(e) => setDisposalForm({ ...disposalForm, disposalProceeds: parseFloat(e.target.value) || 0 })} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium dark:text-slate-200">Disposal Costs</Label>
                  <Input type="number" min="0" step="0.01" value={disposalForm.disposalCosts} onChange={(e) => setDisposalForm({ ...disposalForm, disposalCosts: parseFloat(e.target.value) || 0 })} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-col justify-between gap-1 text-sm text-slate-600 sm:flex-row dark:text-slate-300">
                  <span>Net Proceeds:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(disposalForm.disposalProceeds || 0) - Number(disposalForm.disposalCosts || 0))}</span>
                </div>
                <div className="mt-1 flex flex-col justify-between gap-1 text-sm text-slate-600 sm:flex-row dark:text-slate-300">
                  <span>Current Book Value:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(asset.netBookValue)}</span>
                </div>
                <div className="mt-2 flex flex-col justify-between gap-1 border-t border-slate-200 pt-2 text-sm sm:flex-row dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">Expected Gain/Loss:</span>
                  {(() => {
                    const proceeds = Number(disposalForm.disposalProceeds || 0);
                    const costs = Number(disposalForm.disposalCosts || 0);

                    // Normalize bookValue same way formatCurrency does (handles Decimal128)
                    let bookValue = 0;
                    const nbv: any = asset.netBookValue;
                    if (nbv !== null && nbv !== undefined && nbv !== "") {
                      if (typeof nbv === "object") {
                        if ((nbv as any).$numberDecimal) {
                          bookValue = parseFloat((nbv as any).$numberDecimal);
                        } else if (typeof (nbv as any).toString === "function") {
                          bookValue = parseFloat((nbv as any).toString());
                        }
                      } else if (typeof nbv === "string") {
                        bookValue = parseFloat(nbv);
                      } else {
                        bookValue = nbv;
                      }
                    }
                    if (isNaN(bookValue)) bookValue = 0;

                    const gainLoss = proceeds - costs - bookValue;
                    return (
                      <span className={`font-semibold ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(gainLoss)}
                      </span>
                    );
                  })()}
                </div>
              </div>
              {disposalForm.disposalProceeds > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium dark:text-slate-200">Deposit Proceeds to Bank Account</Label>
                  <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={disposalForm.bankAccountId} onChange={(e) => setDisposalForm({ ...disposalForm, bankAccountId: e.target.value })}>
                    <option value="">Select bank account...</option>
                    {bankAccounts.map((acc: any) => (<option key={acc._id} value={acc._id}>{acc.name} (Bal: {formatCurrency(acc.cachedBalance || 0)})</option>))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">RRA Disposal Auth Number (Optional)</Label>
                <Input value={disposalForm.disposalAuthNumber} onChange={(e) => setDisposalForm({ ...disposalForm, disposalAuthNumber: e.target.value })} placeholder="e.g., RRA-2024-001234" className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium dark:text-slate-200">Notes</Label>
                <Input value={disposalForm.notes} onChange={(e) => setDisposalForm({ ...disposalForm, notes: e.target.value })} placeholder="Additional disposal details..." className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDisposeDialogOpen(false)} className="w-full dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto">
                <X className="mr-1 h-4 w-4" />
                {t("common.cancel")}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDispose} disabled={disposing} className="w-full sm:w-auto">
                {disposing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-1 h-4 w-4" />
                {t("assets.actions.dispose")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </Layout>
  );
}
