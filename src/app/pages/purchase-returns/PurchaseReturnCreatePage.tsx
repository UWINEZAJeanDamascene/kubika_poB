import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { purchaseReturnsApi, grnApi, warehousesApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Loader2,
  ArrowLeftRight,
  ClipboardList,
  Hash,
  DollarSign,
  Barcode,
  Truck,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface GRN {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
  };
  warehouse: {
    _id: string;
    name: string;
  };
  status: string;
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
    };
    qtyReceived: number;
    unitCost: number;
    taxRate: number;
  }>;
}

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
}

interface ReturnLine {
  grnLine: string;
  product: string;
  productName?: string;
  productSku?: string;
  qtyReceived: number;
  qtyPreviouslyReturned: number;
  qtyToReturn: number;
  unitCost: number;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PurchaseReturnCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingGrns, setLoadingGrns] = useState(true);
  const [grnFetchError, setGrnFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [selectedGRNId, setSelectedGRNId] = useState<string>("");
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState<string>("");
  const [supplierCreditNoteNo, setSupplierCreditNoteNo] = useState<string>("");

  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [sendEmail, setSendEmail] = useState(false);

  /* ── Data fetching ── */
  const fetchGRNs = useCallback(async () => {
    setLoadingGrns(true);
    setGrnFetchError(null);
    try {
      const response = await grnApi.getAll({ status: "confirmed", limit: 100 });
      if (response.success && response.data) {
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.data)
            ? (response.data as any).data
            : [];
        setGrns(list as GRN[]);
        if (list.length === 0) {
          setGrnFetchError("No confirmed GRNs found. Confirm a GRN before creating a return.");
        }
      } else {
        setGrns([]);
        setGrnFetchError("Could not load confirmed GRNs.");
      }
    } catch (error: any) {
      console.error("[PurchaseReturnCreatePage] Failed to fetch GRNs:", error);
      setGrns([]);
      setGrnFetchError(error?.message || "Failed to fetch confirmed GRNs");
    } finally {
      setLoadingGrns(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        setWarehouses((Array.isArray(response.data) ? response.data : (response.data as unknown[])) as Warehouse[]);
      }
    } catch (error) {
      console.error("[PurchaseReturnCreatePage] Error fetching warehouses:", error);
    }
  }, []);

  useEffect(() => {
    fetchGRNs();
    fetchWarehouses();
  }, [fetchGRNs, fetchWarehouses]);

  /* ── GRN select ── */
  const handleGRNSelect = async (grnId: string) => {
    setSelectedGRNId(grnId);
    if (!grnId) {
      setSelectedGRN(null);
      setLines([]);
      return;
    }
    setLoading(true);
    try {
      const response = await grnApi.getById(grnId);
      if (response.success) {
        const grn = response.data as GRN;
        setSelectedGRN(grn);
        const whId =
          typeof grn.warehouse === "object"
            ? grn.warehouse?._id
            : (grn.warehouse as unknown as string) || "";
        setWarehouseId(whId || "");
        const returnLines: ReturnLine[] = (grn.lines || []).map((line: any) => {
          const productId =
            typeof line.product === "object"
              ? line.product?._id || line.product?.id
              : line.product;
          return {
            grnLine: line._id,
            product: productId,
            productName: typeof line.product === "object" ? line.product?.name : undefined,
            productSku: typeof line.product === "object" ? line.product?.sku : undefined,
            qtyReceived: Number(line.qtyReceived) || 0,
            qtyPreviouslyReturned: 0,
            qtyToReturn: 0,
            unitCost: Number(line.unitCost) || 0,
          };
        });
        setLines(returnLines);
      }
    } catch (error) {
      console.error("Failed to fetch GRN details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, qtyToReturn: number) => {
    const newLines = [...lines];
    const availableQty = newLines[index].qtyReceived - newLines[index].qtyPreviouslyReturned;
    newLines[index].qtyToReturn = Math.max(0, Math.min(qtyToReturn, availableQty));
    setLines(newLines);
  };

  const calculateSubtotal = () => lines.reduce((sum, line) => sum + line.qtyToReturn * line.unitCost, 0);
  const calculateTotal = () => calculateSubtotal();
  const validLinesCount = lines.filter((l) => l.qtyToReturn > 0).length;

  const handleSave = async (confirmImmediately = false) => {
    if (!selectedGRNId || !warehouseId || !reason) return;

    setSaving(true);
    try {
      const validLines = lines
        .filter((line) => line.qtyToReturn > 0)
        .map((line) => ({
          grnLine: line.grnLine,
          product: line.product,
          qtyReturned: line.qtyToReturn,
          unitCost: line.unitCost,
        }));

      if (validLines.length === 0) {
        alert("Please enter at least one qty to return");
        setSaving(false);
        return;
      }
      if (!reason.trim()) {
        alert("Please enter a reason for the return");
        setSaving(false);
        return;
      }

      const returnData = {
        referenceNo: referenceNo || `PRN-${Date.now()}`,
        grn: selectedGRNId,
        supplier: selectedGRN?.supplier?._id,
        warehouse: warehouseId,
        returnDate,
        reason,
        supplierCreditNoteNo: supplierCreditNoteNo || undefined,
        lines: validLines,
      };

      const response = await purchaseReturnsApi.create(returnData as any, sendEmail);
      if (response.success && response.data) {
        const returnId = (response.data as { _id: string })._id;
        if (confirmImmediately && returnId) await purchaseReturnsApi.confirm(returnId, sendEmail);
        navigate("/purchase-returns");
      }
    } catch (error) {
      console.error("[PurchaseReturnCreatePage] Failed to create return:", error);
    } finally {
      setSaving(false);
    }
  };

  /* ════════════════════════════════
     Render
     ════════════════════════════════ */
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mt-1" onClick={() => navigate("/purchase-returns")}>
                <ArrowLeft className="h-4 w-4 text-slate-500" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t("purchaseReturn.create", "Create Purchase Return")}</h1>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("purchaseReturn.createDescription", "Return goods against a confirmed GRN")}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* GRN Selection */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                    {t("purchaseReturn.selectGRN", "Select GRN")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingGrns ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading confirmed GRNs...
                    </div>
                  ) : loading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading GRN details...
                    </div>
                  ) : (
                    <Select value={selectedGRNId || undefined} onValueChange={handleGRNSelect}>
                      <SelectTrigger className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue placeholder={t("purchaseReturn.selectGRNPlaceholder", "Select a confirmed GRN...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {grns.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">No confirmed GRNs available</div>
                        ) : (
                          grns.map((grn) => (
                            <SelectItem key={grn._id} value={String(grn._id)}>
                              {grn.referenceNo} - {typeof grn.supplier === "object" ? grn.supplier?.name : "Supplier"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {grnFetchError && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{grnFetchError}</p>
                  )}
                </CardContent>
              </Card>

              {/* Line Items */}
              {selectedGRN && lines.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                      <Barcode className="h-4 w-4 text-slate-500" />
                      {t("purchaseReturn.lineItems", "Line Items")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                            <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.product", "Product")}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.qtyReceived", "Received")}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.alreadyReturned", "Already")}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.available", "Available")}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.qtyToReturn", "Return")}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.unitCost", "Unit")}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchaseReturn.lineTotal", "Total")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line, index) => {
                            const availableQty = line.qtyReceived - line.qtyPreviouslyReturned;
                            return (
                              <TableRow key={index} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                                <TableCell>
                                  <div className="font-medium text-slate-900 dark:text-white">{line.productName}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{line.productSku}</div>
                                </TableCell>
                                <TableCell className="text-right text-slate-600 dark:text-slate-300">{line.qtyReceived}</TableCell>
                                <TableCell className="text-right text-slate-600 dark:text-slate-300">{line.qtyPreviouslyReturned}</TableCell>
                                <TableCell className="text-right text-slate-600 dark:text-slate-300">{availableQty}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={availableQty}
                                    value={line.qtyToReturn}
                                    onChange={(e) => handleLineChange(index, parseFloat(e.target.value) || 0)}
                                    className="w-16 text-right text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    disabled={availableQty <= 0}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-600 dark:text-slate-300">{line.unitCost.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium text-slate-900 dark:text-white">{(line.qtyToReturn * line.unitCost).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!selectedGRN && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 py-12 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <Truck className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">{t("purchaseReturn.selectGRNHint", "Select a confirmed GRN to start a return")}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Return Details */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <Hash className="h-4 w-4 text-slate-500" />
                    {t("purchaseReturn.details", "Return Details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.referenceNo", "Reference No")}</Label>
                    <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder={t("purchaseReturn.autoGenerate", "Auto-generate if empty")} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.warehouse", "Warehouse")}</Label>
                    <Select value={warehouseId || undefined} onValueChange={setWarehouseId}>
                      <SelectTrigger className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue placeholder={t("purchaseReturn.selectWarehouse", "Select warehouse")} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh._id} value={wh._id}>{wh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.returnDate", "Return Date")}</Label>
                    <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.reason", "Reason")} *</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("purchaseReturn.reasonPlaceholder", "Enter reason for return...")} rows={3} required className="text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("purchaseReturn.supplierCreditNote", "Supplier Credit Note No")}</Label>
                    <Input value={supplierCreditNoteNo} onChange={(e) => setSupplierCreditNoteNo(e.target.value)} placeholder={t("purchaseReturn.supplierCreditNotePlaceholder", "Enter credit note number (optional)")} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-100">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                    {t("purchaseReturn.summary", "Summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>{t("purchaseReturn.subtotal", "Subtotal")}</span>
                      <span className="font-medium text-slate-900 dark:text-white">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                      <span>{t("purchaseReturn.total", "Total")}</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" id="sendEmailPRCreate" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  {t("purchaseReturn.sendEmail", "Send email notification to supplier")}
                </label>
                <Button onClick={() => handleSave(false)} disabled={saving || !selectedGRNId || validLinesCount === 0 || !reason.trim()} className="h-10 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("purchaseReturn.saveAsDraft", "Save as Draft")}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving || !selectedGRNId || validLinesCount === 0 || !reason.trim()} className="h-10 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {t("purchaseReturn.saveAndConfirm", "Save & Confirm")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}