import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, AlertCircle, Printer } from "lucide-react";
import { useMonthlyAPAging } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyAPAgingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyAPAging(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadAPAgingPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadAPAgingExcel(year, month);
      toast.success("Excel downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Card className="bg-red-900/30 border-red-700">
            <CardContent className="p-6">
              <p className="text-red-300">Error: {error.message}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/reports/monthly')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!report) return null;

  return (
    <Layout>
      <div className="monthly-report-detail p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/monthly')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">AP Aging</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">As of {report.asOfDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Excel</span></Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Print</span></Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total AP</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.totalAP)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Bills</CardDescription>
              <CardTitle className="text-2xl text-white">{report.summary.totalBills}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-red-900/30 border-red-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-400">Overdue 90+</CardDescription>
              <CardTitle className="text-2xl text-red-300">{formatCurrency(report.buckets.days90plus.amount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-orange-900/30 border-orange-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-400">Overdue 60-90</CardDescription>
              <CardTitle className="text-2xl text-orange-300">{formatCurrency(report.buckets.days90.amount)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Aging Buckets */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Aging Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
              {[
                { label: 'Current', bucket: report.buckets.current, color: 'bg-green-900/40 border-green-700', textColor: 'text-green-300' },
                { label: '1-30 Days', bucket: report.buckets.days30, color: 'bg-yellow-900/40 border-yellow-700', textColor: 'text-yellow-300' },
                { label: '31-60 Days', bucket: report.buckets.days60, color: 'bg-orange-900/40 border-orange-700', textColor: 'text-orange-300' },
                { label: '61-90 Days', bucket: report.buckets.days90, color: 'bg-red-900/40 border-red-700', textColor: 'text-red-300' },
                { label: '90+ Days', bucket: report.buckets.days90plus, color: 'bg-red-900/60 border-red-600', textColor: 'text-red-200' },
              ].map((item, idx) => (
                <div key={idx} className={`min-w-0 rounded-lg border p-3 sm:p-4 ${item.color}`}>
                  <div className="text-xs font-medium text-slate-300 sm:text-sm">{item.label}</div>
                  <div className={`mt-1 break-words text-base font-bold sm:text-lg ${item.textColor}`}>{formatCurrency(item.bucket.amount)}</div>
                  <div className="text-xs text-slate-500">{item.bucket.count} bills</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suppliers Detail */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Supplier Aging Detail</CardTitle>
            <CardDescription className="text-slate-400">{report.suppliers.length} suppliers with outstanding balances</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="space-y-3 xl:hidden">
              {report.suppliers.slice(0, 50).map((supplier, idx) => (
                <div key={idx} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-700 pb-2">
                    <p className="min-w-0 break-words font-semibold text-slate-100">{supplier.supplierName}</p>
                    <p className="shrink-0 text-right font-mono font-bold text-white">{formatCurrency(supplier.total)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                    {[["Current", supplier.current], ["1-30 days", supplier.days30], ["31-60 days", supplier.days60], ["61-90 days", supplier.days90], ["90+ days", supplier.days90plus]].map(([label, amount]) => (
                      <div key={String(label)} className="min-w-0"><p className="text-slate-400">{label}</p><p className="break-words font-mono text-slate-100">{formatCurrency(Number(amount))}</p></div>
                    ))}
                  </div>
                </div>
              ))}
              {report.suppliers.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No supplier balances for this period.</p>}
            </div>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-300">Supplier</th>
                    <th className="text-right text-slate-300">Current</th>
                    <th className="text-right text-slate-300">1-30</th>
                    <th className="text-right text-slate-300">31-60</th>
                    <th className="text-right text-slate-300">61-90</th>
                    <th className="text-right text-slate-300">90+</th>
                    <th className="text-right font-bold text-slate-200">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.suppliers.slice(0, 50).map((sup, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 text-slate-200">{sup.supplierName}</td>
                      <td className="text-right text-slate-200">{formatCurrency(sup.current)}</td>
                      <td className="text-right text-slate-200">{formatCurrency(sup.days30)}</td>
                      <td className="text-right text-slate-200">{formatCurrency(sup.days60)}</td>
                      <td className="text-right text-slate-200">{formatCurrency(sup.days90)}</td>
                      <td className="text-right text-red-400">{formatCurrency(sup.days90plus)}</td>
                      <td className="text-right font-bold text-white">{formatCurrency(sup.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
