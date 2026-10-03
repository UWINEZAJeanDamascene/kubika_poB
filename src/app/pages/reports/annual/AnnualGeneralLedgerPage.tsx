import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, BookOpen, Printer, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualGeneralLedger } from "@/lib/hooks/useAnnualReports";
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

export default function AnnualGeneralLedgerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  const { data: report, isLoading, error } = useAnnualGeneralLedger(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => {
    try {
      toast.loading("Generating Excel...");
      await annualReportsApi.downloadGeneralLedgerExcel(year);
      toast.dismiss(); toast.success("Download started");
    } catch { toast.dismiss(); toast.error("Download failed"); }
  };
  const handleDownloadPDF = async () => {
    try {
      toast.loading("Generating PDF...");
      await annualReportsApi.downloadGeneralLedgerPDF(year);
      toast.dismiss(); toast.success("Download started");
    } catch { toast.dismiss(); toast.error("Download failed"); }
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
              <Button variant="outline" className="mt-4" onClick={() => navigate('/reports/annual')}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back
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
      <div className="annual-report-detail p-6 space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Annual General Ledger
              </h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
          </div>
        </div>

        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-bold">Annual General Ledger</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 print:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold">{report.summary.totalAccounts.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{report.summary.totalTransactions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(report.summary.totalDebits)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(report.summary.totalCredits)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts Summary</CardTitle>
            <CardDescription>Showing {report.accounts.length} accounts with activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Account Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Account Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Opening</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Debits</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Credits</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {report.accounts.map((account) => (
                    <tr key={account.accountId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{account.accountCode}</td>
                      <td className="py-2 px-4 text-sm">{account.accountName}</td>
                      <td className="py-2 px-4 text-sm capitalize">{account.accountType}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(account.openingBalance)}</td>
                      <td className="text-right py-2 px-4 text-sm text-emerald-600">{formatCurrency(account.totalDebits)}</td>
                      <td className="text-right py-2 px-4 text-sm text-blue-600">{formatCurrency(account.totalCredits)}</td>
                      <td className="text-right py-2 px-4 text-sm font-medium">{formatCurrency(account.closingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <CardFooter className="text-xs text-muted-foreground justify-center print:hidden">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </CardFooter>
      </div>
    </Layout>
  );
}
