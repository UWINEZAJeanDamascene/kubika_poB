import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Scale, Printer } from "lucide-react";
import { useMonthlyBalanceSheet } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";
import { useNavigate } from "react-router";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function MonthlyBalanceSheetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyBalanceSheet(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadBalanceSheetPDF(year, month);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadBalanceSheetExcel(year, month);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-96" />
            </CardContent>
          </Card>
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
              <p className="text-red-700">Error loading report: {error.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/reports/monthly')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/monthly')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Balance Sheet</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">As of {report.asOfDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Excel</span></Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Print</span></Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold">{report.reportName}</h1>
          <p className="text-lg">As of {report.asOfDate}</p>
          <p className="text-sm text-gray-500">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
        </div>

        {/* Report Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle className="text-emerald-600">ASSETS</CardTitle>
              <CardDescription>Current: {formatCurrency(report.assets.current)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Fixed Assets Section */}
                {report.assets.fixedAssets && report.assets.fixedAssets.items.filter(i => i.current !== 0).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Non-Current Assets</div>
                    {report.assets.fixedAssets.items.filter(i => i.current !== 0).map((item, idx) => (
                      <div key={`fixed-${idx}`} className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-300">{item.name}</span>
                        <span className={`font-medium ${item.current < 0 ? 'text-red-400' : ''}`}>
                          {formatCurrency(item.current)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 font-semibold border-t">
                      <span>Total Non-Current Assets</span>
                      <span>{formatCurrency(report.assets.fixedAssets?.total || 0)}</span>
                    </div>
                  </div>
                )}

                {/* Current Assets Section */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Current Assets</div>
                  {(report.assets.currentAssets?.items || report.assets.items || []).filter(i => i.current !== 0).map((item, idx) => (
                    <div key={`current-${idx}`} className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-300">{item.name}</span>
                      <span className={`font-medium ${item.current < 0 ? 'text-red-400' : ''}`}>
                        {formatCurrency(item.current)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-semibold border-t">
                    <span>Total Current Assets</span>
                    <span>{formatCurrency(report.assets.currentAssets?.total || report.assets.current || 0)}</span>
                  </div>
                </div>

                <div className="flex justify-between py-2 font-bold text-lg border-t-2">
                  <span>Total Assets</span>
                  <span>{formatCurrency(report.assets.current)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle className="text-red-600">LIABILITIES</CardTitle>
              <CardDescription>Current: {formatCurrency(report.liabilities.current)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.liabilities.items.filter(i => i.current !== 0).map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.current)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-lg border-t-2">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(report.liabilities.current)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle className="text-blue-600">EQUITY</CardTitle>
              <CardDescription>Current: {formatCurrency(report.equity.current)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.equity.items.filter(i => i.current !== 0).map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.current)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-lg border-t-2">
                  <span>Total Equity</span>
                  <span>{formatCurrency(report.equity.current)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="print:shadow-none print:border-0 bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Balance Check</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-slate-200">
                <div className="flex justify-between py-2">
                  <span>Total Assets</span>
                  <span className="font-bold">{formatCurrency(report.assets.current)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Total Liabilities + Equity</span>
                  <span className="font-bold">{formatCurrency(report.totalLiabilitiesAndEquity)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-600 font-bold text-lg">
                  <span>Difference</span>
                  <span className={Math.abs(report.assets.current - report.totalLiabilitiesAndEquity) < 0.01 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCurrency(report.assets.current - report.totalLiabilitiesAndEquity)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
