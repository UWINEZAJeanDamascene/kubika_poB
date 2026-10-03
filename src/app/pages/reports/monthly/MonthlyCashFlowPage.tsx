import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Wallet, Printer, TrendingUp, TrendingDown } from "lucide-react";
import { useMonthlyCashFlow } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyCashFlowPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyCashFlow(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadCashFlowPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadCashFlowExcel(year, month);
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
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Cash Flow</span>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Beginning Cash</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.beginningCash)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={report.summary.netCashChange >= 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}>
            <CardHeader className="pb-2">
              <CardDescription className={report.summary.netCashChange >= 0 ? 'text-green-400' : 'text-red-400'}>Net Change</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl text-white">
                {report.summary.netCashChange >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
                {formatCurrency(report.summary.netCashChange)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-blue-900/30 border-blue-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-400">Ending Cash</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.endingCash)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Operating Activities */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-green-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Operating Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300">Net Profit</span>
                <span className="font-bold text-white">{formatCurrency(report.operating.netProfit)}</span>
              </div>
              <div className="text-sm text-slate-400 py-2">Adjustments:</div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Accounts Receivable Change</span>
                <span className={report.operating.adjustments.accountsReceivableChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.operating.adjustments.accountsReceivableChange)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Accounts Payable Change</span>
                <span className={report.operating.adjustments.accountsPayableChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.operating.adjustments.accountsPayableChange)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Inventory Change</span>
                <span className={report.operating.adjustments.inventoryChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.operating.adjustments.inventoryChange)}
                </span>
              </div>
              <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-600 mt-2">
                <span className="text-green-400">Net Operating Cash Flow</span>
                <span className={report.operating.netOperatingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.operating.netOperatingCashFlow)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investing & Financing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-blue-400">Investing Activities</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300">Asset Purchases</span>
                <span className="text-red-400">{formatCurrency(report.investing.purchases)}</span>
              </div>
              <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-600 mt-2">
                <span className="text-blue-400">Net Investing Cash Flow</span>
                <span className={report.investing.netInvestingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.investing.netInvestingCashFlow)}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-purple-400">Financing Activities</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300">Loans/Equity Changes</span>
                <span className={report.financing.netFinancingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.financing.netFinancingCashFlow)}
                </span>
              </div>
              <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-600 mt-2">
                <span className="text-purple-400">Net Financing Cash Flow</span>
                <span className={report.financing.netFinancingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(report.financing.netFinancingCashFlow)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
