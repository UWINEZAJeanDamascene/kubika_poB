import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Calendar, CreditCard, FileText, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailySalesSummary } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import {
  DailyReportScaffold,
  reportCardClass,
  type DailyMetric,
} from "./components/DailyReportScaffold";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function DailySalesReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailySalesSummary(date);

  useEffect(() => {
    if (error) toast.error(error.message || "Failed to load sales report");
  }, [error]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setSearchParams({ date: newDate });
  };

  const handleDownloadPDF = async () => {
    setDownloading("pdf");
    try {
      await dailyReportsApi.downloadSalesPDF(date);
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading("excel");
    try {
      await dailyReportsApi.downloadSalesExcel(date);
      toast.success("Excel downloaded successfully");
    } catch {
      toast.error("Failed to download Excel");
    } finally {
      setDownloading(null);
    }
  };

  const metrics: DailyMetric[] = data
    ? [
        { label: "Total Sales", value: fmt(data.summary.totalSales), caption: "Gross sales value", icon: TrendingUp, tone: "blue" },
        { label: "Invoices", value: data.summary.totalInvoices, caption: "Issued today", icon: FileText, tone: "slate" },
        { label: "Cash Sales", value: fmt(data.summary.cashSales), caption: "Immediate payments", icon: Wallet, tone: "emerald" },
        { label: "Credit Sales", value: fmt(data.summary.creditSales), caption: "Receivable value", icon: CreditCard, tone: "amber" },
      ]
    : [];

  return (
    <DailyReportScaffold
      title="Daily Sales Summary"
      shortTitle="Sales"
      subtitle="Total sales, invoice count, payment split, discounts, tax, and top-selling products for the selected date."
      icon={ShoppingCart}
      tone="blue"
      date={date}
      onDateChange={handleDateChange}
      loading={isLoading}
      downloading={downloading}
      onBack={() => navigate(dailyReportsApi.getListPath(date))}
      onDownloadPDF={handleDownloadPDF}
      onDownloadExcel={handleDownloadExcel}
      metrics={metrics}
    >
      {data && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card className={reportCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-slate-500" />
                Sales Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                {[
                  ["Total Sales", fmt(data.summary.totalSales)],
                  ["Total Tax", fmt(data.summary.totalTax)],
                  ["Total Discounts", fmt(data.summary.totalDiscount)],
                  ["Average Invoice Value", fmt(data.summary.averageInvoiceValue)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-mono font-semibold text-slate-950 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topProducts?.length ? (
                  data.topProducts.map((product: { name: string; quantity: number; revenue: number }, idx: number) => (
                    <div key={product.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="truncate font-medium text-slate-950 dark:text-white">{product.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Qty {product.quantity}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold">{fmt(product.revenue)}</span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">No top products for this date.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DailyReportScaffold>
  );
}
