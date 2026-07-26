import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { freightBillsApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useTranslation } from "react-i18next";

interface FreightBill {
  _id: string;
  referenceNo: string;
  supplier?: { _id: string; name: string };
  carrierName?: string;
  amount: number;
  invoiceDate?: string;
  status: "draft" | "confirmed";
}

export function FreightBillsContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<FreightBill[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await freightBillsApi.getAll({ page, limit: 20 });
      if (res.success && res.data) {
        setBills(Array.isArray(res.data) ? (res.data as FreightBill[]) : []);
        const pagination = (res as any).pagination;
        if (pagination) {
          setTotalPages(Math.ceil((pagination.total || 0) / pagination.limit) || 1);
        }
      }
    } catch (e) {
      console.error("Failed to fetch freight bills:", e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleConfirm = async (id: string) => {
    if (!confirm(t("freight.confirmPrompt", "Confirm this freight bill?"))) return;
    try {
      await freightBillsApi.confirm(id);
      fetchBills();
    } catch (e) {
      console.error("Failed to confirm freight bill:", e);
      alert(t("freight.confirmFailed", "Failed to confirm freight bill"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("freight.deletePrompt", "Delete this draft freight bill?"))) return;
    try {
      await freightBillsApi.delete(id);
      fetchBills();
    } catch (e) {
      console.error("Failed to delete freight bill:", e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
            {t("freight.title", "Freight Bills")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("freight.description", "Record and match freight invoices to GRNs")}
          </p>
        </div>
        <Button
          onClick={() => navigate("/freight-bills/new")}
          className="h-10 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          {t("freight.newBill", "New Freight Bill")}
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-800 dark:text-slate-100">
            {t("freight.list", "Freight Bills")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.reference", "Reference")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.carrier", "Carrier")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.amount", "Amount")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.invoiceDate", "Invoice Date")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.status", "Status")}</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("common.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          {t("freight.noBills", "No freight bills found")}
                        </TableCell>
                      </TableRow>
                    )}
                    {bills.map((bill) => (
                      <TableRow key={bill._id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <TableCell className="font-medium text-slate-900 dark:text-white">{bill.referenceNo}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{bill.carrierName || bill.supplier?.name || "—"}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{formatCurrency(bill.amount)}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          {bill.status === "confirmed" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <CheckCircle className="mr-1 h-3 w-3" /> {t("freight.confirmed", "Confirmed")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-300">
                              {t("freight.draft", "Draft")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {bill.status === "draft" && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/freight-bills/${bill._id}/edit`)}>
                                  {t("common.edit", "Edit")}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleConfirm(bill._id)}>
                                  {t("common.confirm", "Confirm")}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(bill._id)}>
                                  <XCircle className="h-4 w-4" />
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> {t("common.previous", "Previous")}
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t("common.page", "Page")} {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    {t("common.next", "Next")} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FreightBillsListPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <FreightBillsContent />
        </div>
      </div>
    </Layout>
  );
}
