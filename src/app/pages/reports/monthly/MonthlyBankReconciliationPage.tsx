import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Landmark, Printer } from "lucide-react";
import { useMonthlyBankReconciliation } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyBankReconciliationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyBankReconciliation(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadBankReconciliationPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadBankReconciliationExcel(year, month);
      toast.success("Excel downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
          <Skeleton className="h-10 w-64 bg-slate-800" />
          <Card className="bg-slate-900 border-slate-700"><CardContent className="p-6"><Skeleton className="h-96 bg-slate-800" /></CardContent></Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-slate-950 min-h-screen">
          <Card className="border-red-700 bg-red-900/20">
            <CardContent className="p-6">
              <p className="text-red-300">Error: {error.message}</p>
              <Button variant="outline" className="mt-4 border-slate-600 text-slate-200 hover:bg-slate-800" onClick={() => navigate('/reports/monthly')}>
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
                <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Bank Rec</span>
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

        {/* Reconciliation Status Banner */}
        <Card className={report.summary.isFullyReconciled ? 'bg-green-900/30 border-green-700' : 'bg-yellow-900/30 border-yellow-700'}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${report.summary.isFullyReconciled ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className={report.summary.isFullyReconciled ? 'text-green-300 font-medium' : 'text-yellow-300 font-medium'}>
                {report.summary.isFullyReconciled ? 'Fully Reconciled' : 'Reconciliation Pending'}
              </span>
              <span className="text-slate-400">
                Difference: {formatCurrency(report.summary.totalReconciliationDifference)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-900 border-slate-700"><CardHeader className="pb-2"><CardDescription className="text-slate-400">Book Balance</CardDescription><CardTitle className="text-white">{formatCurrency(report.summary.totalBookBalance)}</CardTitle></CardHeader></Card>
          <Card className="bg-indigo-900/30 border-indigo-700"><CardHeader className="pb-2"><CardDescription className="text-indigo-300">Bank Statement</CardDescription><CardTitle className="text-indigo-100">{formatCurrency(report.summary.totalBankStatementBalance)}</CardTitle></CardHeader></Card>
          <Card className="bg-green-900/30 border-green-700"><CardHeader className="pb-2"><CardDescription className="text-green-300">Deposits in Transit</CardDescription><CardTitle className="text-green-100">+{formatCurrency(report.summary.totalOutstandingDeposits)}</CardTitle></CardHeader></Card>
          <Card className="bg-red-900/30 border-red-700"><CardHeader className="pb-2"><CardDescription className="text-red-300">Outstanding Checks</CardDescription><CardTitle className="text-red-100">-{formatCurrency(report.summary.totalOutstandingChecks)}</CardTitle></CardHeader></Card>
          <Card className="bg-blue-900/30 border-blue-700"><CardHeader className="pb-2"><CardDescription className="text-blue-300">Adjusted Bank Balance</CardDescription><CardTitle className="text-blue-100">{formatCurrency(report.summary.totalAdjustedBankBalance)}</CardTitle></CardHeader></Card>
        </div>

        {/* Per Account */}
        {report.accounts.map((acc, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">{acc.bankName} - {acc.accountName}</CardTitle>
              <CardDescription className="text-slate-400">{acc.accountNumber} ({acc.currency})</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Reconciliation Status */}
              <div className={`mb-4 p-3 rounded flex items-center gap-2 ${acc.isReconciled ? 'bg-green-900/20 border border-green-800' : 'bg-yellow-900/20 border border-yellow-800'}`}>
                <div className={`w-2 h-2 rounded-full ${acc.isReconciled ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className={`text-sm font-medium ${acc.isReconciled ? 'text-green-300' : 'text-yellow-300'}`}>
                  {acc.isReconciled ? 'Reconciled' : 'Not Reconciled'}
                </span>
                {acc.statementDate && (
                  <span className="text-xs text-slate-400 ml-auto">
                    Statement as of: {new Date(acc.statementDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Two-Sided Reconciliation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* Book Side */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 border-b border-slate-700 pb-1">Book Side</h4>
                  <div className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between">
                    <span className="text-xs text-slate-400">Book Balance</span>
                    <span className="font-bold text-slate-200">{formatCurrency(acc.bookBalance)}</span>
                  </div>
                </div>

                {/* Bank Side */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 border-b border-slate-700 pb-1">Bank Side</h4>
                  <div className="p-3 bg-indigo-900/20 rounded border border-indigo-800 flex justify-between">
                    <span className="text-xs text-indigo-400">Bank Statement Balance</span>
                    <span className="font-bold text-indigo-200">{formatCurrency(acc.bankStatementBalance)}</span>
                  </div>
                  <div className="p-3 bg-green-900/20 rounded border border-green-800 flex justify-between">
                    <span className="text-xs text-green-400">Add: Deposits in Transit</span>
                    <span className="font-bold text-green-300">+{formatCurrency(acc.outstandingDeposits)}</span>
                  </div>
                  <div className="p-3 bg-red-900/20 rounded border border-red-800 flex justify-between">
                    <span className="text-xs text-red-400">Less: Outstanding Checks</span>
                    <span className="font-bold text-red-300">-{formatCurrency(acc.outstandingChecks)}</span>
                  </div>
                  <div className="p-3 bg-blue-900/20 rounded border border-blue-800 flex justify-between">
                    <span className="text-xs text-blue-400 font-semibold">Adjusted Bank Balance</span>
                    <span className="font-bold text-blue-200">{formatCurrency(acc.adjustedBankBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Difference */}
              <div className={`p-3 rounded mb-4 flex justify-between ${Math.abs(acc.reconciliationDifference) < 0.01 ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}>
                <span className={`text-sm font-semibold ${Math.abs(acc.reconciliationDifference) < 0.01 ? 'text-green-300' : 'text-red-300'}`}>
                  Difference (should be 0)
                </span>
                <span className={`font-bold ${Math.abs(acc.reconciliationDifference) < 0.01 ? 'text-green-300' : 'text-red-300'}`}>
                  {formatCurrency(acc.reconciliationDifference)}
                </span>
              </div>
              {acc.reconcilingItems.length > 0 && (
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                  <h4 className="font-medium mb-2 text-slate-300">Reconciling Items ({acc.reconcilingItems.length})</h4>
                  <table className="w-full text-sm min-w-[400px]">
                    <thead><tr className="border-b border-slate-700"><th className="text-left py-1 text-slate-400">Date</th><th className="text-left text-slate-400">Description</th><th className="text-right text-slate-400">Amount</th><th className="text-left text-slate-400">Type</th></tr></thead>
                    <tbody>
                      {acc.reconcilingItems.slice(0, 5).map((item, i) => (
                        <tr key={i} className="border-b border-slate-800"><td className="py-1 text-slate-300">{new Date(item.date).toLocaleDateString()}</td><td className="text-slate-300">{item.description}</td><td className="text-right text-slate-300">{formatCurrency(item.amount)}</td><td className="text-slate-300">{item.type}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
