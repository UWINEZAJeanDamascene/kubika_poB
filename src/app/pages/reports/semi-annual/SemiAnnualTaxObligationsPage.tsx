import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Receipt, Printer, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { useSemiAnnualTaxObligations } from "@/lib/hooks/useMonthlyReports";
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

export default function SemiAnnualTaxObligationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualTaxObligations(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports("tax-obligations", startYear, startMonth, endYear, endMonth);
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
  const taxes = report.taxes || [];
  const complianceRate = summary.complianceRate || 0;

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
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Tax Obligations Summary
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
          <h1 className="text-2xl font-bold text-center">Semi-Annual Tax Obligations Summary</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
        </div>

        {/* Compliance Alert */}
        <Card className={complianceRate >= 95 ? 'border-green-200' : complianceRate >= 80 ? 'border-yellow-200' : 'border-red-200'}>
          <CardHeader className={`py-4 px-4 sm:px-6 ${complianceRate >= 95 ? 'bg-green-50' : complianceRate >= 80 ? 'bg-yellow-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-sm">Tax Compliance Rate</CardDescription>
                <CardTitle className={`text-2xl sm:text-3xl font-bold ${complianceRate >= 95 ? 'text-green-700' : complianceRate >= 80 ? 'text-yellow-700' : 'text-red-700'}`}>
                  {formatNumber(complianceRate, 1)}%
                </CardTitle>
              </div>
              <div className="text-right">
                {complianceRate >= 95 ? (
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-yellow-600" />
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Declared</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.totalTaxesDeclared || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Remitted</CardDescription>
              <CardTitle className="text-lg sm:text-xl text-green-600">{formatCurrency(summary.totalTaxesRemitted || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={summary.balanceOutstanding > 0 ? 'border-red-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Balance Outstanding</CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${summary.balanceOutstanding > 0 ? 'text-red-600' : ''}`}>
                {formatCurrency(summary.balanceOutstanding || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tax Type Breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Tax Type Breakdown</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Declared vs remitted by tax type
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Tax Type</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Declared</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Remitted</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {taxes.length > 0 ? taxes.map((tax, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        {tax.type}
                      </td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-slate-600">
                        {formatCurrency(tax.declared)}
                      </td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-emerald-600">
                        {formatCurrency(tax.remitted)}
                      </td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-mono">
                        <span className={tax.balance > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600'}>
                          {formatCurrency(tax.balance)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted-foreground text-sm">No tax data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary by Type */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className={summary.vatPayable > 0 ? 'border-orange-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">VAT Payable</CardDescription>
              <CardTitle className={`text-lg ${summary.vatPayable > 0 ? 'text-orange-600' : ''}`}>
                {formatCurrency(summary.vatPayable || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={summary.payePayable > 0 ? 'border-orange-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">PAYE Payable</CardDescription>
              <CardTitle className={`text-lg ${summary.payePayable > 0 ? 'text-orange-600' : ''}`}>
                {formatCurrency(summary.payePayable || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={summary.rssbPayable > 0 ? 'border-orange-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">RSSB Payable</CardDescription>
              <CardTitle className={`text-lg ${summary.rssbPayable > 0 ? 'text-orange-600' : ''}`}>
                {formatCurrency(summary.rssbPayable || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={summary.withholdingPayable > 0 ? 'border-orange-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Withholding Tax</CardDescription>
              <CardTitle className={`text-lg ${summary.withholdingPayable > 0 ? 'text-orange-600' : ''}`}>
                {formatCurrency(summary.withholdingPayable || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Tax Obligations Summary</p>
        </div>
      </div>
    </Layout>
  );
}
