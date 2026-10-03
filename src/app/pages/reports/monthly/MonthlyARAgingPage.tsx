import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Clock, Printer, AlertTriangle } from "lucide-react";
import { useMonthlyARAging } from "@/lib/hooks/useMonthlyReports";
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

export default function MonthlyARAgingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyARAging(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadARAgingPDF(year, month);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadARAgingExcel(year, month);
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
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">AR Aging</span>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 print:grid-cols-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total AR</CardDescription>
              <CardTitle className="text-xl text-white">{formatCurrency(report.summary.totalAR)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Provision</CardDescription>
              <CardTitle className="text-xl text-white">{formatCurrency(report.summary.provisionForDoubtfulDebts)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Net AR</CardDescription>
              <CardTitle className="text-xl text-white">{formatCurrency(report.summary.netAR)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-red-900/30 border-red-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-400">Overdue 90+</CardDescription>
              <CardTitle className="text-xl text-red-300">{formatCurrency(report.buckets.days90plus.amount)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Aging Buckets */}
        <Card className="bg-slate-900 border-slate-700 print:shadow-none print:border-0">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Aging Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
              {[
                { label: 'Current', bucket: report.buckets.current, color: 'bg-green-900/40 border-green-700', textColor: 'text-green-300' },
                { label: '1-30 Days', bucket: report.buckets.days30, color: 'bg-yellow-900/40 border-yellow-700', textColor: 'text-yellow-300' },
                { label: '31-60 Days', bucket: report.buckets.days60, color: 'bg-orange-900/40 border-orange-700', textColor: 'text-orange-300' },
                { label: '61-90 Days', bucket: report.buckets.days90, color: 'bg-red-900/40 border-red-700', textColor: 'text-red-300' },
                { label: '90+ Days', bucket: report.buckets.days90plus, color: 'bg-red-900/60 border-red-600', textColor: 'text-red-200' },
              ].map((item, idx) => (
                <div key={idx} className={`min-w-0 rounded-lg border p-3 sm:p-4 ${item.color}`}>
                  <div className="text-xs font-medium text-slate-300 sm:text-sm">{item.label}</div>
                  <div className={`mt-1 break-words text-base font-bold sm:text-lg ${item.textColor}`}>{formatCurrency(item.bucket.amount)}</div>
                  <div className="text-xs text-slate-500">{item.bucket.count} invoices</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Detail */}
        <Card className="bg-slate-900 border-slate-700 print:shadow-none print:border-0">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Customer Aging Detail</CardTitle>
            <CardDescription className="text-slate-400">{report.customers.length} customers with outstanding balances</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="space-y-3 xl:hidden">
              {report.customers.slice(0, 50).map((customer, idx) => (
                <div key={idx} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-700 pb-2">
                    <p className="min-w-0 break-words font-semibold text-slate-100">{customer.customerName}</p>
                    <p className="shrink-0 text-right font-mono font-bold text-white">{formatCurrency(customer.total)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                    {[["Current", customer.current], ["1-30 days", customer.days30], ["31-60 days", customer.days60], ["61-90 days", customer.days90], ["90+ days", customer.days90plus]].map(([label, amount]) => (
                      <div key={String(label)} className="min-w-0"><p className="text-slate-400">{label}</p><p className="break-words font-mono text-slate-100">{formatCurrency(Number(amount))}</p></div>
                    ))}
                  </div>
                </div>
              ))}
              {report.customers.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No customer balances for this period.</p>}
            </div>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-300">Customer</th>
                    <th className="text-right py-2 text-slate-300">Current</th>
                    <th className="text-right py-2 text-slate-300">1-30</th>
                    <th className="text-right py-2 text-slate-300">31-60</th>
                    <th className="text-right py-2 text-slate-300">61-90</th>
                    <th className="text-right py-2 text-slate-300">90+</th>
                    <th className="text-right py-2 font-bold text-slate-200">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.customers.slice(0, 50).map((customer, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 text-slate-200">{customer.customerName}</td>
                      <td className="text-right py-2 text-slate-200">{formatCurrency(customer.current)}</td>
                      <td className="text-right py-2 text-slate-200">{formatCurrency(customer.days30)}</td>
                      <td className="text-right py-2 text-slate-200">{formatCurrency(customer.days60)}</td>
                      <td className="text-right py-2 text-slate-200">{formatCurrency(customer.days90)}</td>
                      <td className="text-right py-2 text-red-400">{formatCurrency(customer.days90plus)}</td>
                      <td className="text-right py-2 font-bold text-white">{formatCurrency(customer.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Provision Warning */}
        {report.summary.provisionForDoubtfulDebts > 0 && (
          <Card className="bg-amber-900/30 border-amber-700 print:hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-300">Provision for Doubtful Debts</h4>
                  <p className="text-sm text-amber-400">
                    A provision of {formatCurrency(report.summary.provisionForDoubtfulDebts)} has been calculated
                    based on aging analysis (50% for 61-90 days, 80% for 90+ days).
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
