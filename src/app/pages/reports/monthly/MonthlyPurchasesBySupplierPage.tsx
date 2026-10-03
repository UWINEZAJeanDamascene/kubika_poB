import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Truck, Printer } from "lucide-react";
import { useMonthlyPurchasesBySupplier } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyPurchasesBySupplierPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyPurchasesBySupplier(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadPurchasesBySupplierPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadPurchasesBySupplierExcel(year, month);
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
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-700">Error: {error.message}</p>
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
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Purchases</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">{report.period}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Excel</span></Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Print</span></Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Suppliers</CardDescription>
              <CardTitle className="text-2xl text-white">{report.summary.totalSuppliers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Spend</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.totalSpend)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total POs</CardDescription>
              <CardTitle className="text-2xl text-white">{report.summary.totalPOs}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={report.summary.totalVariance >= 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}>
            <CardHeader className="pb-2">
              <CardDescription className={report.summary.totalVariance >= 0 ? 'text-green-400' : 'text-red-400'}>Variance</CardDescription>
              <CardTitle className={`text-2xl ${report.summary.totalVariance >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(report.summary.totalVariance)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Suppliers Table */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Supplier Ranking</CardTitle>
            <CardDescription className="text-slate-400">Ranked by total spend for {report.period}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-300">Rank</th>
                    <th className="text-left text-slate-300">Supplier</th>
                    <th className="text-right text-slate-300">Total Spend</th>
                    <th className="text-center text-slate-300">POs</th>
                    <th className="text-right text-slate-300">Invoiced</th>
                    <th className="text-right text-slate-300">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.suppliers.map((supplier, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 text-slate-200">{idx + 1}</td>
                      <td className="font-medium text-slate-200">{supplier.supplierName}</td>
                      <td className="text-right text-slate-200">{formatCurrency(supplier.totalSpend)}</td>
                      <td className="text-center text-slate-200">{supplier.poCount}</td>
                      <td className="text-right text-slate-400">{formatCurrency(supplier.totalInvoiced)}</td>
                      <td className={`text-right ${supplier.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(supplier.variance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-600">
                  <tr className="font-bold">
                    <td className="py-3 text-slate-300" colSpan={2}>Total</td>
                    <td className="text-right text-white">{formatCurrency(report.summary.totalSpend)}</td>
                    <td className="text-center text-white">{report.summary.totalPOs}</td>
                    <td className="text-right text-slate-300">{formatCurrency(report.suppliers.reduce((s, sup) => s + sup.totalInvoiced, 0))}</td>
                    <td className={`text-right ${report.summary.totalVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(report.summary.totalVariance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
