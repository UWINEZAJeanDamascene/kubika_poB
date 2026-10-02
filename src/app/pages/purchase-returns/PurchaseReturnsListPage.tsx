import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { purchaseReturnsApi, suppliersApi } from "@/lib/api";
import { EmptyState } from "@/app/components/EmptyState";
import { Layout } from "../../layout/Layout";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Plus,
  Eye,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Filter,
  ArrowLeftRight,
  TrendingDown,
  Box,
  CheckCircle,
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
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useTranslation } from "react-i18next";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface PurchaseReturn {
  _id: string;
  referenceNo: string;
  grn?: {
    _id: string;
    referenceNo: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
  };
  returnDate: string;
  status: "draft" | "confirmed" | "cancelled";
  totalAmount: number | string;
}

const numericAmount = (value: number | string | null | undefined) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

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
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PurchaseReturnsListPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [returnList, setReturnList] = useState<PurchaseReturn[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  /* ── Filters ── */
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  /* ── Data fetching ── */
  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        setSuppliers((Array.isArray(response.data) ? response.data : (response.data as unknown[])) as Supplier[]);
      }
    } catch (error) {
      console.error("[PurchaseReturnsListPage] Failed to fetch suppliers:", error);
    }
  }, []);

  const fetchPurchaseReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (supplierFilter && supplierFilter !== "all") params.supplier_id = supplierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await purchaseReturnsApi.getAll(params);
      if (response.success) {
        setReturnList((Array.isArray(response.data) ? response.data : (response.data as unknown[])) as PurchaseReturn[]);
        if (response.pagination) setPagination(response.pagination as PaginationInfo);
      }
    } catch (error) {
      console.error("[PurchaseReturnsListPage] Failed to fetch purchase returns:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPurchaseReturns();
  }, [fetchPurchaseReturns]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = returnList.length;
    const draft = returnList.filter((r) => r.status === "draft").length;
    const confirmed = returnList.filter((r) => r.status === "confirmed").length;
    const cancelled = returnList.filter((r) => r.status === "cancelled").length;
    const totalValue = returnList.reduce((sum, item) => sum + numericAmount(item.totalAmount), 0);
    return { total, draft, confirmed, cancelled, totalValue };
  }, [returnList]);

  /* ── Helpers ── */
  function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
      draft: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
      confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
      cancelled: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
    };
    const labels: Record<string, string> = {
      draft: t("purchaseReturn.status.draft", "Draft"),
      confirmed: t("purchaseReturn.status.confirmed", "Confirmed"),
      cancelled: t("purchaseReturn.status.cancelled", "Cancelled"),
    };
    return (
      <Badge className={`ring-1 ${styles[status] || "bg-slate-100 text-slate-700 ring-slate-200"}`} variant="outline">
        {labels[status] || status}
      </Badge>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  /* ════════════════════════════════
     Render
     ════════════════════════════════ */
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t("purchaseReturn.title", "Purchase Returns")}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("purchaseReturn.description", "Manage your purchase returns")}</p>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate("/purchase-returns/new")} className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              <Plus className="h-4 w-4" /> {t("purchaseReturn.newReturn", "New Return")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-slate-50 p-2.5 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("purchaseReturn.totalReturns", "Total")}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("purchaseReturn.draft", "Draft")}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.draft}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("purchaseReturn.confirmed", "Confirmed")}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.confirmed}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-sky-50 p-2.5 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("purchaseReturn.totalValue", "Total Value")}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                  <Filter className="h-4 w-4 text-slate-500" />
                  {t("purchaseReturn.filters", "Filters")}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-xs text-slate-500">
                  {showFilters ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.status", "Status")}</label>
                    <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue placeholder={t("purchaseReturn.allStatuses", "All Statuses")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("purchaseReturn.allStatuses", "All Statuses")}</SelectItem>
                        <SelectItem value="draft">{t("purchaseReturn.status.draft", "Draft")}</SelectItem>
                        <SelectItem value="confirmed">{t("purchaseReturn.status.confirmed", "Confirmed")}</SelectItem>
                        <SelectItem value="cancelled">{t("purchaseReturn.status.cancelled", "Cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.supplier", "Supplier")}</label>
                    <Select value={supplierFilter || "all"} onValueChange={(v) => setSupplierFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue placeholder={t("purchaseReturn.allSuppliers", "All Suppliers")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("purchaseReturn.allSuppliers", "All Suppliers")}</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.dateFrom", "Date From")}</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.dateTo", "Date To")}</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Table */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : returnList.length === 0 ? (
                <div className="p-4"><EmptyState compact icon={ArrowLeftRight} title={t('purchaseReturn.noReturns', 'No purchase returns yet')} description={t('purchaseReturn.noReturnsHint', 'Purchase returns will appear here once goods are returned to suppliers.')} /></div>
              ) : (
                <>
                <div className="space-y-3 p-3 xl:hidden">
                  {returnList.map((pr) => (
                    <article key={pr._id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-all text-sm font-semibold text-slate-900 dark:text-white">{pr.referenceNo || 'N/A'}</h2><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{pr.supplier?.name || '-'}</p></div><StatusBadge status={pr.status} /></div>
                      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><div><dt className="text-slate-500 dark:text-slate-400">{t('purchaseReturn.grnReference', 'GRN')}</dt><dd className="mt-0.5 break-all">{pr.grn?.referenceNo || '-'}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t('purchaseReturn.returnDate', 'Return Date')}</dt><dd className="mt-0.5">{formatDate(pr.returnDate)}</dd></div><div className="col-span-2"><dt className="text-slate-500 dark:text-slate-400">{t('purchaseReturn.totalAmount', 'Total')}</dt><dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{formatCurrency(numericAmount(pr.totalAmount))}</dd></div></dl>
                      <div className="mt-3 flex justify-end border-t border-slate-200 pt-2 dark:border-slate-700"><Button variant="ghost" size="icon" onClick={() => navigate(`/purchase-returns/${pr._id}`)} title={t('common.view', 'View')} aria-label={`${t('common.view', 'View')} ${pr.referenceNo}`}><Eye className="h-4 w-4 text-slate-500" /></Button></div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                        <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.reference", "Reference")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.grnReference", "GRN")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.supplier", "Supplier")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.returnDate", "Return Date")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.status", "Status")}</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.totalAmount", "Total")}</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("common.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="border-0 py-2">
                            <EmptyState
                              compact
                              icon={ArrowLeftRight}
                              title={t("purchaseReturn.noReturns", "No purchase returns yet")}
                              description={t("purchaseReturn.noReturnsHint", "Purchase returns will appear here once goods are returned to suppliers.")}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        returnList.map((pr) => (
                          <TableRow key={pr._id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                            <TableCell>
                              <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                                <FileText className="h-4 w-4 text-slate-400" />
                                {pr.referenceNo || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{pr.grn?.referenceNo || "-"}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{pr.supplier?.name || "-"}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(pr.returnDate)}</TableCell>
                            <TableCell><StatusBadge status={pr.status} /></TableCell>
                            <TableCell className="text-right font-medium text-slate-900 dark:text-white">{formatCurrency(numericAmount(pr.totalAmount))}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/purchase-returns/${pr._id}`)} className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4 text-slate-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${pagination.currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${pagination.currentPage === i + 1 ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100" : ""}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${pagination.currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : ""}`}
                onClick={() => setPage(page + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
