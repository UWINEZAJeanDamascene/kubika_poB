import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { grnApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  CheckCircle,
  PackageCheck,
  FileText,
  CalendarDays,
  Building2,
  MapPin,
  DollarSign,
  Loader2,
  Printer,
  Mail,
  Clock,
  Receipt,
  Package,
  Truck,
} from "lucide-react";
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from "@/app/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useTranslation } from "react-i18next";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface GRNDetail {
  _id: string;
  referenceNo: string;
  purchaseOrder?: {
    _id: string;
    referenceNo: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    currencyCode?: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
      contactPerson?: string;
    };
  };
  warehouse?: {
    _id: string;
    name: string;
    code?: string;
  };
  receivedDate: string;
  status: "draft" | "confirmed";
  totalAmount: number;
  supplierInvoiceNo?: string;
  freight?: {
    carrier?: string;
    actualAmount?: number;
    paymentMethod?: string;
    account?: string;
    includeInInventoryCost?: boolean;
    allocationMethod?: string;
    invoiceReference?: string;
    invoiceDate?: string;
    paidBy?: string;
  };
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
      unit?: string;
    };
    qtyReceived: number;
    unitCost: number;
    taxRate: number;
    lineTotal: number;
  }>;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  confirmedBy?: {
    name: string;
    email: string;
  };
}

interface HistoryEntry {
  action: string;
  timestamp: string;
  user?: string;
  details?: string;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function GRNDetailPage() {
  const { t } = useTranslation();
  const { formatCurrency: formatInDisplayCurrency } = useCurrency();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [grn, setGRN] = useState<GRNDetail | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  /* ── Data ── */
  const fetchGRN = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await grnApi.getById(id);
      if (response.success) {
        const data = response.data as GRNDetail;
        setGRN(data);
        const entries: HistoryEntry[] = [
          { action: "GRN Created", timestamp: data.createdAt, details: "Goods Received Note created as draft" },
        ];
        if (data.confirmedAt) {
          entries.push({
            action: "GRN Confirmed",
            timestamp: data.confirmedAt,
            user: data.confirmedBy?.name,
            details: "GRN confirmed and inventory updated",
          });
        }
        setHistory(entries);
      }
    } catch (error) {
      console.error("Failed to fetch GRN:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGRN();
  }, [fetchGRN]);

  /* ── Actions ── */
  const handleConfirm = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      await grnApi.confirm(id, sendEmail);
      fetchGRN();
    } catch (error) {
      console.error("Failed to confirm GRN:", error);
    } finally {
      setConfirming(false);
    }
  };

  const handlePrint = () => window.print();

  /* ── Helpers ── */
  const formatCurrency = (amount: number | string | object | null | undefined) => {
    let num: number;
    if (amount == null) num = 0;
    else if (typeof amount === "object") {
      num = parseFloat((amount as any).$numberDecimal || (amount as any).toString()) || 0;
    } else if (typeof amount === "string") num = parseFloat(amount) || 0;
    else num = amount as number;
    return formatInDisplayCurrency(num, grn?.purchaseOrder?.currencyCode);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const toNum = (v: any): number => {
    if (v == null) return 0;
    if (typeof v === "object" && v.$numberDecimal) return parseFloat(v.$numberDecimal) || 0;
    return parseFloat(String(v)) || 0;
  };

  const calculateSubtotal = () => {
    if (!grn?.lines) return 0;
    return grn.lines.reduce((sum, line) => sum + toNum(line.qtyReceived) * toNum(line.unitCost), 0);
  };
  const calculateTax = () => {
    if (!grn?.lines) return 0;
    return grn.lines.reduce((sum, line) => {
      const lineTotal = toNum(line.qtyReceived) * toNum(line.unitCost);
      return sum + lineTotal * (toNum(line.taxRate) / 100);
    }, 0);
  };
  const calculateTotal = () => {
    let total = calculateSubtotal() + calculateTax();
    const freightAmt = Number(grn?.freight?.actualAmount) || 0;
    const freightAbsorbed = grn?.freight?.includeInInventoryCost;
    if (freightAmt > 0 && !freightAbsorbed) {
      total += freightAmt;
    }
    return total;
  };

  /* ── Status badge ── */
  function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
      draft: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
      confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    };
    const labels: Record<string, string> = {
      draft: t("grn.status.draft", "Draft"),
      confirmed: t("grn.status.confirmed", "Confirmed"),
    };
    return (
      <Badge className={`ring-1 ${styles[status] || "bg-slate-100 text-slate-700 ring-slate-200"}`} variant="outline">
        {labels[status] || status}
      </Badge>
    );
  }

  /* ════════════════════════════════
     Loading / Error states
     ════════════════════════════════ */
  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!grn) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-3 py-6 dark:bg-slate-950 sm:px-6">
          <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] text-center">
            <p className="text-slate-500 dark:text-slate-400">GRN not found</p>
            <Button variant="link" onClick={() => navigate("/grn")}>{t("common.back", "Back to GRN List")}</Button>
          </div>
        </div>
      </Layout>
    );
  }

  /* ════════════════════════════════
     Main Render
     ════════════════════════════════ */
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mt-1" onClick={() => navigate("/grn")}>
                <ArrowLeft className="h-4 w-4 text-slate-500" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{grn.referenceNo}</h1>
                  <StatusBadge status={grn.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {grn.purchaseOrder?.referenceNo
                    ? `Linked to PO ${grn.purchaseOrder.referenceNo}`
                    : t("grn.noPurchaseOrder", "No purchase order linked")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" /> {t("common.print", "Print")}
              </Button>
            </div>
          </div>

          {/* Info Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("grn.supplier", "Supplier")}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{grn.supplier?.name || "N/A"}</p>
                  {grn.supplier?.code && <p className="text-xs text-slate-500 dark:text-slate-400">{grn.supplier.code}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("grn.warehouse", "Warehouse")}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{grn.warehouse?.name || "N/A"}</p>
                  {grn.warehouse?.code && <p className="text-xs text-slate-500 dark:text-slate-400">{grn.warehouse.code}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("grn.receivedDate", "Received")}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDateShort(grn.receivedDate)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(grn.receivedDate).getFullYear()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("grn.total", "Total")}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(grn.totalAmount)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 xl:col-span-2">
              {/* Document Info */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <PackageCheck className="h-4 w-4 text-slate-500" />
                    {t("grn.documentInfo", "Document Info")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t("grn.supplier", "Supplier")}</p>
                      <div className="text-sm text-slate-900 dark:text-white">{grn.supplier?.name || "N/A"}</div>
                      {grn.supplier?.code && <div className="text-xs text-slate-500 dark:text-slate-400">{grn.supplier.code}</div>}
                      {grn.supplier?.contact?.address && <div className="text-xs text-slate-500 dark:text-slate-400">{grn.supplier.contact.address}</div>}
                      {grn.supplier?.contact?.email && <div className="text-xs text-slate-500 dark:text-slate-400">{grn.supplier.contact.email}</div>}
                      {grn.supplier?.contact?.phone && <div className="text-xs text-slate-500 dark:text-slate-400">{grn.supplier.contact.phone}</div>}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t("grn.warehouse", "Warehouse")}</p>
                      <div className="text-sm text-slate-900 dark:text-white">{grn.warehouse?.name || "N/A"}</div>
                      {grn.warehouse?.code && <div className="text-xs text-slate-500 dark:text-slate-400">{grn.warehouse.code}</div>}
                      {grn.supplierInvoiceNo && (
                        <>
                          <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t("grn.supplierInvoice", "Supplier Invoice")}</p>
                          <div className="text-sm text-slate-900 dark:text-white">{grn.supplierInvoiceNo}</div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <Package className="h-4 w-4 text-slate-500" />
                    {t("grn.lineItems", "Line Items")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 xl:hidden">
                    {grn.lines?.map((line, index) => <article key={index} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{line.product?.name || '-'}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{line.product?.sku || '-'}</p><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><div><dt className="text-slate-500 dark:text-slate-400">{t('grn.qtyReceived', 'Received')}</dt><dd className="mt-0.5">{line.qtyReceived}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t('grn.unitCost', 'Unit Cost')}</dt><dd className="mt-0.5 font-mono">{formatCurrency(line.unitCost)}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t('grn.taxRate', 'Tax %')}</dt><dd className="mt-0.5">{line.taxRate}%</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t('grn.lineTotal', 'Total')}</dt><dd className="mt-0.5 font-semibold">{formatCurrency(toNum(line.qtyReceived) * toNum(line.unitCost))}</dd></div></dl></article>)}
                  </div>
                  <div className="hidden overflow-x-auto xl:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                          <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.product", "Product")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.qtyReceived", "Received")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.unitCost", "Unit")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.taxRate", "Tax %")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.lineTotal", "Total")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grn.lines?.map((line, index) => (
                          <TableRow key={index} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                            <TableCell>
                              <div className="font-medium text-slate-900 dark:text-white">{line.product.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{line.product.sku}</div>
                            </TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{line.qtyReceived}</TableCell>
                            <TableCell className="text-right font-mono text-slate-600 dark:text-slate-300">{formatCurrency(line.unitCost)}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{line.taxRate}%</TableCell>
                            <TableCell className="text-right font-medium text-slate-900 dark:text-white">{formatCurrency(toNum(line.qtyReceived) * toNum(line.unitCost))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900">
                  <TabsTrigger value="details">{t("grn.tabs.details", "Details")}</TabsTrigger>
                  <TabsTrigger value="history">{t("grn.tabs.history", "History")}</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{t("grn.purchaseOrder", "Purchase Order")}</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{grn.purchaseOrder?.referenceNo || "-"}</p>
                          {grn.purchaseOrder?.orderDate && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateShort(grn.purchaseOrder.orderDate)}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{t("grn.supplierInvoice", "Supplier Invoice")}</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{grn.supplierInvoiceNo || "-"}</p>
                        </div>
                      </div>
                      {grn.freight && Number(grn.freight.actualAmount) > 0 && (
                        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("grn.freightInfo", "Freight Information")}</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.freightCarrier", "Carrier")}</p>
                              <p className="font-medium text-slate-900 dark:text-white">{grn.freight.carrier || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.freightAmount", "Amount")}</p>
                              <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(grn.freight.actualAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.freightMethod", "Method")}</p>
                              <p className="font-medium text-slate-900 dark:text-white">{grn.freight.paymentMethod?.replace('_', ' ') || "—"}</p>
                            </div>
                            {grn.freight.invoiceReference && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.freightInvoiceRef", "Invoice Ref")}</p>
                                <p className="font-medium text-slate-900 dark:text-white">{grn.freight.invoiceReference}</p>
                              </div>
                            )}
                            {grn.freight.includeInInventoryCost !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.freightIncluded", "Included in Cost")}</p>
                                <p className="font-medium text-slate-900 dark:text-white">{grn.freight.includeInInventoryCost ? t("common.yes", "Yes") : t("common.no", "No")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history">
                  <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="pt-6">
                      <div className="space-y-0">
                        {history.map((entry, index) => (
                          <div key={index} className="relative flex gap-4 pb-6">
                            {index < history.length - 1 && (
                              <div className="absolute left-[15px] top-8 h-full w-px bg-slate-200 dark:bg-slate-800" />
                            )}
                            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white dark:bg-slate-800 dark:ring-slate-950">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.action}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(entry.timestamp)}</p>
                              {entry.user && <p className="text-xs text-slate-500 dark:text-slate-400">By {entry.user}</p>}
                              {entry.details && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{entry.details}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                    {t("grn.summary", "Summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>{t("grn.subtotal", "Subtotal")}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>{t("grn.tax", "Tax")}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calculateTax())}</span>
                    </div>
                    {grn?.freight && Number(grn.freight.actualAmount) > 0 && !grn.freight.includeInInventoryCost && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>{t("grn.freight", "Freight")}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(grn.freight.actualAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                      <span>{t("grn.total", "Total")}</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dates */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    {t("grn.dates", "Dates")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.receivedDate", "Received Date")}</p>
                        <p className="font-medium text-slate-900 dark:text-white">{formatDate(grn.receivedDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.createdAt", "Created")}</p>
                        <p className="font-medium text-slate-900 dark:text-white">{formatDate(grn.createdAt)}</p>
                      </div>
                    </div>
                    {grn.confirmedAt && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t("grn.confirmedAt", "Confirmed")}</p>
                          <p className="font-medium text-slate-900 dark:text-white">{formatDate(grn.confirmedAt)}</p>
                          {grn.confirmedBy && <p className="text-xs text-slate-500 dark:text-slate-400">by {grn.confirmedBy.name}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {grn.status === "draft" && (
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-100">{t("grn.actions", "Actions")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          id="sendEmailGRN"
                          checked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <Mail className="h-4 w-4 text-slate-400" />
                        {t("grn.sendEmail", "Send email notification to supplier")}
                      </label>
                      <Button onClick={handleConfirm} disabled={confirming} className="h-10 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
                        {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        {t("grn.confirm", "Confirm GRN")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
