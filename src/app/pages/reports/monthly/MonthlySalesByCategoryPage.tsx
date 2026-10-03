import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Tags, Printer } from "lucide-react";
import { useMonthlySalesByCategory } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlySalesByCategoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlySalesByCategory(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadSalesByCategoryPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadSalesByCategoryExcel(year, month);
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
                <Tags className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Sales by Category</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Categories</CardDescription><CardTitle>{report.summary.totalCategories}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Total Revenue</CardDescription><CardTitle>{formatCurrency(report.summary.totalRevenue)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Gross Profit</CardDescription><CardTitle>{formatCurrency(report.summary.totalGrossProfit)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Overall Margin</CardDescription><CardTitle>{report.summary.overallMargin.toFixed(1)}%</CardTitle></CardHeader></Card>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue, cost, and margin analysis for {report.period}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead><tr className="border-b"><th className="text-left py-2">Category</th><th className="text-right">Revenue</th><th className="text-right">Units</th><th className="text-right">Cost</th><th className="text-right">Gross Profit</th><th className="text-right">Margin</th></tr></thead>
                <tbody>
                  {report.categories.map((cat, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{cat.category}</td>
                      <td className="text-right">{formatCurrency(cat.totalRevenue)}</td>
                      <td className="text-right">{cat.totalUnits}</td>
                      <td className="text-right text-muted-foreground">{formatCurrency(cat.totalCost)}</td>
                      <td className="text-right font-medium">{formatCurrency(cat.grossProfit)}</td>
                      <td className="text-right">
                        <span className={cat.grossMargin >= 30 ? 'text-green-600' : cat.grossMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                          {cat.grossMargin.toFixed(1)}%
                        </span>
                      </td>
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
