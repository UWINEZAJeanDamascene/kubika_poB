import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Package, Printer, AlertTriangle } from "lucide-react";
import { useMonthlyStockValuation } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyStockValuationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyStockValuation(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadStockValuationPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadStockValuationExcel(year, month);
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
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Stock Valuation</span>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Items</CardDescription>
              <CardTitle className="text-2xl text-white">{report.summary.totalItems}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Value</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.totalValue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-yellow-900/30 border-yellow-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-yellow-400">Slow Moving</CardDescription>
              <CardTitle className="text-2xl text-yellow-300">{report.summary.slowMovingItems}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-red-900/30 border-red-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-400">Aged Stock</CardDescription>
              <CardTitle className="text-2xl text-red-300">{report.summary.agedStockItems}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Inventory Valuation</CardTitle>
            <CardDescription className="text-slate-400">{report.items.length} products valued at {formatCurrency(report.summary.totalValue)}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-300">Product</th>
                    <th className="text-left text-slate-300">SKU</th>
                    <th className="text-right text-slate-300">Qty</th>
                    <th className="text-right text-slate-300">Unit Cost</th>
                    <th className="text-right text-slate-300">Total Value</th>
                    <th className="text-center text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 text-slate-200">{item.name}</td>
                      <td className="text-slate-400">{item.sku}</td>
                      <td className="text-right text-slate-200">{item.quantityOnHand}</td>
                      <td className="text-right text-slate-200">{formatCurrency(item.unitCost)}</td>
                      <td className="text-right font-medium text-slate-200">{formatCurrency(item.totalValue)}</td>
                      <td className="text-center">
                        {item.isAgedStock ? <span className="text-red-400 text-xs">Aged</span> : item.isSlowMoving ? <span className="text-yellow-400 text-xs">Slow</span> : <span className="text-green-400 text-xs">Active</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Warning for aged/slow stock */}
        {(report.summary.slowMovingValue > 0 || report.summary.agedStockValue > 0) && (
          <Card className="bg-amber-900/30 border-amber-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-200">Inventory Alerts</h4>
                  <p className="text-sm text-amber-300">
                    Slow moving: {formatCurrency(report.summary.slowMovingValue)} | Aged stock: {formatCurrency(report.summary.agedStockValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
