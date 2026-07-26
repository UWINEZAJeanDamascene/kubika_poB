import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { grnApi, suppliersApi } from "@/lib/api";
import { EmptyState } from "@/app/components/EmptyState";
import { Layout } from "../../layout/Layout";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Plus,
  Eye,
  CheckCircle,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  PackageCheck,
  Filter,
  Box,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/app/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useTranslation } from "react-i18next";
import { EBMStatusBadge } from "@/app/components/EBMStatusBadge";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface GRN {
  _id: string;
  referenceNo: string;
  purchaseOrder?: {
    _id: string;
    referenceNo: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
  };
  receivedDate: string;
  status: "draft" | "confirmed";
  totalAmount: number;
  paymentStatus: "pending" | "partially_paid" | "paid";
  supplierInvoiceNo?: string;
  ebm?: { ebmStatus?: string; stockStatus?: string };
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

/* ═══════════════════════════════════════════════════════════════
   STAT TILE
   ═══════════════════════════════════════════════════════════════ */
function StatTile({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "indigo" | "emerald" | "amber" | "blue";
}) {
  const toneMap: Record<string, string> = {
    indigo:
      "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900/60",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/60",
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/60",
  };
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg p-2.5 ring-1 ${toneMap[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATUS BADGES
   ═══════════════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    draft: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", label: "Draft" },
    confirmed: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", label: "Confirmed" },
  };
  const c = config[status] || { bg: "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", label: status };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg}`}>{c.label}</span>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    pending: { bg: "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", label: "Pending" },
    partially_paid: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", label: "Partial" },
    paid: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", label: "Paid" },
  };
  const c = config[status] || { bg: "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", label: status };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg}`}>{c.label}</span>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function GRNListPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { purchaseOrderId?: string; purchaseOrderRef?: string } | null;
  const initialPO = state?.purchaseOrderId;

  const [loading, setLoading] = useState(true);
  const [grnList, setGrnList] = useState<GRN[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ebmStatusFilter, setEbmStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const total = grnList.length;
    const draft = grnList.filter((g) => g.status === "draft").length;
    const confirmed = grnList.filter((g) => g.status === "confirmed").length;
    const totalValue = grnList.reduce((sum, g) => sum + (Number(g.totalAmount) || 0), 0);
    return { total, draft, confirmed, totalValue };
  }, [grnList]);

  /* ── Data fetching ── */
  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        setSuppliers((Array.isArray(response.data) ? response.data : (response.data as unknown[])) as Supplier[]);
      }
    } catch (error) {
      console.error("[GRNListPage] Failed to fetch suppliers:", error);
    }
  }, []);

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (ebmStatusFilter && ebmStatusFilter !== "all") params.ebmStatus = ebmStatusFilter;
      if (supplierFilter && supplierFilter !== "all") params.supplier_id = supplierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await grnApi.getAll(params);
      if (response.success) {
        setGrnList((Array.isArray(response.data) ? response.data : (response.data as unknown[])) as GRN[]);
        if (response.pagination) setPagination(response.pagination as PaginationInfo);
      }
    } catch (error) {
      console.error("[GRNListPage] Failed to fetch GRNs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, ebmStatusFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchGRNs();
  }, [fetchGRNs]);

  /* ── Redirect from PO ── */
  useEffect(() => {
    if (initialPO) {
      navigate("/grn/new", { state: { purchaseOrderId: initialPO, purchaseOrderRef: state?.purchaseOrderRef }, replace: true });
    }
  }, [initialPO, navigate, state]);

  /* ── Actions ── */
  const handleConfirm = async (id: string) => {
    try {
      await grnApi.confirm(id);
      fetchGRNs();
    } catch (error: any) {
      console.error("Failed to confirm GRN:", error);
      alert(error?.message || "Failed to confirm GRN");
    }
  };

  const handleEdit = (id: string) => navigate(`/grn/${id}/edit`);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this GRN? This action cannot be undone.")) return;
    try {
      await grnApi.delete(id);
      fetchGRNs();
    } catch (error) {
      console.error("Failed to delete GRN:", error);
      alert("Failed to delete GRN. It may have already been confirmed.");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t("grn.title", "Goods Received Notes")}</h1>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("grn.description", "Manage goods received notes and stock receipts")}</p>
            </div>
            <Button onClick={() => navigate("/grn/new")} className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              {t("grn.newGRN", "New GRN")}
            </Button>
          </div>

          {/* Stat Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile title="Total GRNs" value={stats.total} icon={<Box className="h-5 w-5" />} tone="indigo" />
            <StatTile title="Draft" value={stats.draft} icon={<Clock className="h-5 w-5" />} tone="amber" />
            <StatTile title="Confirmed" value={stats.confirmed} icon={<CheckCircle className="h-5 w-5" />} tone="emerald" />
            <StatTile title="Total Value" value={formatCurrency(stats.totalValue)} icon={<TrendingUp className="h-5 w-5" />} tone="blue" />
          </div>

          {/* Filters */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4 text-slate-500" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("grn.status", "Status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder={t("grn.allStatuses", "All Statuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("grn.allStatuses", "All Statuses")}</SelectItem>
                      <SelectItem value="draft">{t("grn.status.draft", "Draft")}</SelectItem>
                      <SelectItem value="confirmed">{t("grn.status.confirmed", "Confirmed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">RRA Status</label>
                  <Select value={ebmStatusFilter} onValueChange={setEbmStatusFilter}>
                    <SelectTrigger className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="All RRA Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All RRA Status</SelectItem>
                      <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      <SelectItem value="pending">Pending RRA</SelectItem>
                      <SelectItem value="submitted">Certified</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("grn.supplier", "Supplier")}</label>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder={t("grn.allSuppliers", "All Suppliers")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("grn.allSuppliers", "All Suppliers")}</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("grn.dateFrom", "Date From")}</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("grn.dateTo", "Date To")}</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : grnList.length === 0 ? (
              <EmptyState
                compact
                icon={PackageCheck}
                title={t("grn.noGRNs", "No GRNs yet")}
                description={t("grn.noGRNsHint", "Goods receipt notes will appear here once stock is received against a purchase order.")}
                action={
                  <Button onClick={() => navigate("/grn/new")} className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/30 hover:brightness-110">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("grn.new", "New GRN")}
                  </Button>
                }
                className="m-4"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.reference", "Reference")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.poReference", "PO Ref")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.supplier", "Supplier")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.receivedDate", "Received")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.status", "Status")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">RRA Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.totalAmount", "Amount")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grn.paymentStatus", "Payment")}</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("common.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnList.map((grn) => (
                      <TableRow key={grn._id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-900 dark:text-white">{grn.referenceNo || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{grn.purchaseOrder?.referenceNo || "-"}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{grn.supplier?.name || "-"}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{formatDate(grn.receivedDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={grn.status} />
                        </TableCell>
                        <TableCell><EBMStatusBadge ebmStatus={grn.ebm?.stockStatus || grn.ebm?.ebmStatus} /></TableCell>
                        <TableCell className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(Number(grn.totalAmount) || 0)}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={grn.paymentStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/grn/${grn._id}`)}>
                              <Eye className="h-4 w-4 text-slate-500" />
                            </Button>
                            {grn.status === "draft" && (
                              <>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(grn._id)}>
                                  <Pencil className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(grn._id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleConfirm(grn._id)}>
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <button
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${pagination.currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                      onClick={() => setPage(Math.max(1, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </PaginationItem>
                  {Array.from({ length: pagination.totalPages }, (_, i) => (
                    <PaginationItem key={i + 1}>
                      <PaginationLink
                        onClick={() => setPage(i + 1)}
                        isActive={pagination.currentPage === i + 1}
                        className="h-9 w-9"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <button
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${pagination.currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : ""}`}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
