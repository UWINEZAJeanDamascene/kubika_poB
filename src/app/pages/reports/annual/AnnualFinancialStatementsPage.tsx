import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, BarChart3, Printer, FileSpreadsheet, TrendingUp, Scale, Wallet } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualFinancialStatements } from "@/lib/hooks/useAnnualReports";
import { annualReportsApi } from "@/lib/api.annualReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function AnnualFinancialStatementsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  const { data: report, isLoading, error } = useAnnualFinancialStatements(year);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = async () => {
    try {
      toast.loading("Generating Excel file...");
      await annualReportsApi.downloadFinancialStatementsExcel(year);
      toast.dismiss();
      toast.success("Excel download started");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to download Excel file");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Generating PDF file...");
      await annualReportsApi.downloadFinancialStatementsPDF(year);
      toast.dismiss();
      toast.success("PDF download started");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to download PDF file");
    }
  };

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
                onClick={() => navigate('/reports/annual')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Annual Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!report) return null;

  const incomeStmt = report.incomeStatement;
  const bs = report.balanceSheet;
  const cf = report.cashFlow;

  return (
    <Layout>
      <div className="annual-report-detail p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Annual Financial Statements
              </h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">Annual Financial Statements</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {report.company.name} | TIN: {report.company.tin}
          </p>
        </div>

        {/* Company Info */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{report.company.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TIN</p>
                <p className="font-medium">{report.company.tin}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{report.company.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income Statement */}
        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="bg-blue-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base sm:text-lg text-slate-800">Income Statement</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              For the year ended December 31, {report.year}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200">Description</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 w-32">Current Year</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 w-32">Prior Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm">Revenue</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-medium">{formatCurrency(incomeStmt.revenue.current)}</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm text-muted-foreground">{formatCurrency(incomeStmt.revenue.prior)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm">Cost of Goods Sold</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">({formatCurrency(incomeStmt.costOfGoodsSold.current)})</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm text-muted-foreground">({formatCurrency(incomeStmt.costOfGoodsSold.prior)})</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="py-2 px-2 sm:px-4 text-sm font-medium">Gross Profit</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-bold">{formatCurrency(incomeStmt.grossProfit.current)}</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-medium text-muted-foreground">{formatCurrency(incomeStmt.grossProfit.prior)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm">Operating Expenses</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">({formatCurrency(incomeStmt.operatingExpenses.total.current)})</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm text-muted-foreground">({formatCurrency(incomeStmt.operatingExpenses.total.prior)})</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="py-2 px-2 sm:px-4 text-sm font-medium">Operating Profit</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-bold">{formatCurrency(incomeStmt.operatingProfit.current)}</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-medium text-muted-foreground">{formatCurrency(incomeStmt.operatingProfit.prior)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm">Interest Expense</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">({formatCurrency(incomeStmt.interestExpense.current)})</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm text-muted-foreground">({formatCurrency(incomeStmt.interestExpense.prior)})</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm">Tax Expense</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">({formatCurrency(incomeStmt.taxExpense.current)})</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm text-muted-foreground">({formatCurrency(incomeStmt.taxExpense.prior)})</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold">Net Profit</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-bold text-emerald-700">{formatCurrency(incomeStmt.netProfit.current)}</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-medium text-muted-foreground">{formatCurrency(incomeStmt.netProfit.prior)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet */}
        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="bg-purple-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-purple-200">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base sm:text-lg text-slate-800">Balance Sheet</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              As at December 31, {report.year}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200">Description</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold" colSpan={2}>ASSETS</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Non-Current Assets</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">{formatCurrency(bs.assets.nonCurrent.totalNonCurrent)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Current Assets</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">{formatCurrency(bs.assets.current.totalCurrent)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-blue-50">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold">Total Assets</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-bold">{formatCurrency(bs.assets.totalAssets)}</td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold" colSpan={2}>LIABILITIES</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Current Liabilities</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">{formatCurrency(bs.liabilities.current.totalCurrent)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Non-Current Liabilities</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">{formatCurrency(bs.liabilities.nonCurrent.totalNonCurrent)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-medium">Total Liabilities</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-medium">{formatCurrency(bs.liabilities.totalLiabilities)}</td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold" colSpan={2}>EQUITY</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Total Equity</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-medium">{formatCurrency(bs.equity.totalEquity)}</td>
                  </tr>
                  <tr className="bg-emerald-50 border-t-2 border-slate-300">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold">TOTAL LIABILITIES & EQUITY</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-bold text-emerald-700">{formatCurrency(bs.totalLiabilitiesAndEquity)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Statement */}
        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="bg-amber-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-base sm:text-lg text-slate-800">Cash Flow Statement</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              For the year ended December 31, {report.year}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200">Description</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold" colSpan={2}>CASH FLOWS FROM OPERATING ACTIVITIES</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Net Operating Cash Flow</td>
                    <td className={`text-right py-2 px-2 sm:px-4 text-sm font-medium ${cf.operating.netOperatingCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(cf.operating.netOperatingCashFlow)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold" colSpan={2}>CASH FLOWS FROM INVESTING ACTIVITIES</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Net Investing Cash Flow</td>
                    <td className={`text-right py-2 px-2 sm:px-4 text-sm font-medium ${cf.investing.netInvestingCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(cf.investing.netInvestingCashFlow)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold" colSpan={2}>CASH FLOWS FROM FINANCING ACTIVITIES</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm pl-6">Net Financing Cash Flow</td>
                    <td className={`text-right py-2 px-2 sm:px-4 text-sm font-medium ${cf.financing.netFinancingCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(cf.financing.netFinancingCashFlow)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="py-2 px-2 sm:px-4 text-sm font-medium">Net Increase in Cash</td>
                    <td className={`text-right py-2 px-2 sm:px-4 text-sm font-bold ${cf.netIncrease >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(cf.netIncrease)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 sm:px-4 text-sm">Cash at Beginning of Year</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm">{formatCurrency(cf.beginningCash)}</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="py-2 px-2 sm:px-4 text-sm font-bold">Cash at End of Year</td>
                    <td className="text-right py-2 px-2 sm:px-4 text-sm font-bold text-emerald-700">{formatCurrency(cf.endingCash)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <CardFooter className="text-xs text-muted-foreground justify-center print:hidden">
          Generated: {new Date(report.generatedAt).toLocaleString()} | {report.company.name}
        </CardFooter>
      </div>
    </Layout>
  );
}
