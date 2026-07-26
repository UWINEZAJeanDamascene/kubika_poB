import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Progress } from "@/app/components/ui/progress";
import { ArrowLeft, Users, Printer, FileSpreadsheet, Clock, AlertCircle, TrendingUp, Download, Loader2 } from "lucide-react";
import { useSemiAnnualReceivablesCollection } from "@/lib/hooks/useMonthlyReports";
import { useSemiAnnualExports } from "@/lib/hooks/useSemiAnnualExports";
import { useNavigate } from "react-router";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number, decimals = 1) => {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export default function SemiAnnualReceivablesCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualReceivablesCollection(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports("receivables-collection", startYear, startMonth, endYear, endMonth);
  const handlePrint = () => { window.print(); };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
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
        <div className="p-3 sm:p-4 md:p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-700">Error loading report: {error.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/reports/semi-annual')}
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

  const summary = report.summary || {};
  const customerAnalysis = report.customerAnalysis || [];

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/semi-annual')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Receivables Collection
              </h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={downloading === "pdf"}>
              {downloading === "pdf" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadExcel} disabled={downloading === "excel"}>
              {downloading === "excel" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">Semi-Annual Receivables Collection Analysis</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Customers</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{summary.totalCustomers || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Invoices</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{summary.totalInvoices || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> Avg Days to Collect
              </CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${(summary.averageDaysToCollect || 0) > 45 ? 'text-red-600' : 'text-green-600'}`}>
                {formatNumber(summary.averageDaysToCollect || 0, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Collection Rate
              </CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${(summary.overallCollectionRate || 0) >= 90 ? 'text-green-600' : (summary.overallCollectionRate || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {formatNumber(summary.overallCollectionRate || 0, 1)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Revenue Summary */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Revenue & Collection Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalRevenue || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(summary.totalCollected || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(summary.totalOutstanding || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bad Debts Written Off</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(summary.badDebtsWrittenOff || 0)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Recovery Rate (on provisioned debts)</span>
                <span className={`font-semibold ${(summary.recoveryRate || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {formatNumber(summary.recoveryRate || 0, 1)}%
                </span>
              </div>
              {summary.amountRecovered > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Recovered</span>
                  <span className="text-green-600 font-medium">{formatCurrency(summary.amountRecovered || 0)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Analysis */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Customer Collection Analysis</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Performance metrics by customer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Customer</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Invoices</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Revenue</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Collected</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Outstanding</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Days</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {customerAnalysis.length > 0 ? customerAnalysis.map((cust, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">{cust.customerName}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">{cust.invoiceCount}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{formatCurrency(cust.totalRevenue)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-green-600">{formatCurrency(cust.totalCollected)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-red-600">{formatCurrency(cust.outstanding)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">
                        <span className={cust.averageDaysToCollect > 45 ? 'text-red-600' : cust.averageDaysToCollect > 30 ? 'text-yellow-600' : 'text-green-600'}>
                          {formatNumber(cust.averageDaysToCollect, 0)}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-2">
                          <Progress value={cust.collectionRate} className="w-12 h-2" />
                          <span className={`text-xs font-medium ${cust.collectionRate >= 90 ? 'text-green-600' : cust.collectionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {formatNumber(cust.collectionRate, 0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted-foreground text-sm">No customer data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bad Debts Alert */}
        {summary.badDebtsWrittenOff > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50 py-3 px-3 sm:py-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5" />
                Bad Debts Written Off
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Total bad debts written off during this period: <span className="font-semibold text-orange-600">{formatCurrency(summary.badDebtsWrittenOff)}</span>
              </p>
              {summary.recoveryRate > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Recovery rate on previously provisioned debts: <span className="font-semibold text-green-600">{formatNumber(summary.recoveryRate, 1)}%</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Receivables Collection Analysis</p>
        </div>
      </div>
    </Layout>
  );
}
