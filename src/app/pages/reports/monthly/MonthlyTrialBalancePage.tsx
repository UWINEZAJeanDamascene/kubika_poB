import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, FileSpreadsheet, Printer, CheckCircle2, XCircle } from "lucide-react";
import { useMonthlyTrialBalance } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyTrialBalancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyTrialBalance(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadTrialBalancePDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadTrialBalanceExcel(year, month);
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
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Trial Balance</span>
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

        {/* Balance Status */}
        <Card className={report.isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {report.isBalanced ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
              <div>
                <h4 className="font-medium">{report.isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is NOT Balanced'}</h4>
                <p className="text-sm text-muted-foreground">Total Debits: {formatCurrency(report.totalDebits)} | Total Credits: {formatCurrency(report.totalCredits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
            <CardDescription>{report.accounts.length} accounts with activity</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead><tr className="border-b"><th className="text-left py-2">Code</th><th className="text-left">Account</th><th className="text-left">Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
                <tbody>
                  {report.accounts.map((acc, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-mono">{acc.code}</td>
                      <td className="font-medium">{acc.name}</td>
                      <td className="capitalize text-xs">{acc.accountType}</td>
                      <td className="text-right">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
                      <td className="text-right">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
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
