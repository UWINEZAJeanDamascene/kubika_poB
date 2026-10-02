import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ebmApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { toast } from "sonner";
import { Layout } from "@/app/layout/Layout";

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

export function UnmatchedPurchasesContent() {
  const [items, setItems] = useState<UnmatchedPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ebmApi.getUnmatchedPurchases({ status: "unmatched", limit: 200 });
      setItems((res.data || []) as UnmatchedPurchase[]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load unmatched EBM purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sync = async () => {
    setLoading(true);
    try {
      await ebmApi.syncPurchases({ branchId: "00" });
      toast.success("Purchase pull completed");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Purchase pull failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Unmatched EBM Purchases</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">RRA purchase records that could not be linked automatically.</p>
          </div>
          <Button onClick={sync} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Pull from RRA
          </Button>
        </div>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-3 sm:p-0">
            <div className="space-y-3 xl:hidden">
              {items.map((item) => <article key={item._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950"><h2 className="font-medium text-slate-900 dark:text-white">{item.supplierName || "-"}</h2><p className="mt-1 text-xs text-slate-500">TIN {item.supplierTin || "-"} · {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : "-"}</p><p className="mt-1 text-xs text-slate-500">Invoice {item.sellerInvoiceNo || "-"}</p><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700"><div><dt className="text-xs text-slate-500">VAT</dt><dd>{(item.taxAmount || 0).toLocaleString()}</dd></div><div><dt className="text-xs text-slate-500">Total</dt><dd className="font-semibold">{(item.totalAmount || 0).toLocaleString()}</dd></div></dl></article>)}
              {!items.length && <div className="py-8 text-center text-sm text-slate-500">{loading ? "Loading..." : "No unmatched RRA purchase records"}</div>}
            </div>
            <div className="hidden overflow-x-auto xl:block">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UnmatchedPurchasesPage() {
  return (
    <Layout>
      <UnmatchedPurchasesContent />
    </Layout>
  );
}
