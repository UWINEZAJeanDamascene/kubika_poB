import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Calculator, Printer } from "lucide-react";
import { useMonthlyVATReturn } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyVATReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyVATReturn(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadVATReturnPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadVATReturnExcel(year, month);
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
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-lime-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">VAT Return</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">{report.taxPeriod}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Excel</span></Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Print</span></Button>
          </div>
        </div>

        {/* Net VAT Banner */}
        <Card className={report.summary.netVATPAYABLE >= 0 ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700'}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">
                {report.summary.netVATPAYABLE >= 0 ? 'VAT Payable' : 'VAT Refund Due'}
              </p>
              <p className={`text-3xl font-bold ${report.summary.netVATPAYABLE >= 0 ? 'text-red-300' : 'text-green-300'}`}>
                {formatCurrency(Math.abs(report.summary.netVATPAYABLE))}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Output VAT */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">Output VAT (Sales)</CardTitle>
              <CardDescription className="text-slate-400">Total: {formatCurrency(report.outputVAT.total)}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-700"><th className="text-left py-2 text-slate-300">Tax Code</th><th className="text-right text-slate-300">Rate</th><th className="text-right text-slate-300">Taxable</th><th className="text-right text-slate-300">VAT</th></tr></thead>
                <tbody>
                  {report.outputVAT.breakdown.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800"><td className="py-2 text-slate-200">{item.taxCode}</td><td className="text-right text-slate-200">{item.taxRate}%</td><td className="text-right text-slate-200">{formatCurrency(item.taxableAmount)}</td><td className="text-right font-medium text-slate-200">{formatCurrency(item.taxAmount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Input VAT */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">Input VAT (Purchases)</CardTitle>
              <CardDescription className="text-slate-400">Total: {formatCurrency(report.inputVAT.total)}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-700"><span className="text-slate-300">Total Purchases</span><span className="font-medium text-slate-200">{formatCurrency(report.inputVAT.totalPurchases)}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-700 font-bold"><span className="text-slate-300">Input VAT</span><span className="text-white">{formatCurrency(report.inputVAT.total)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RRA Filing Boxes */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">RRA Filing Boxes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-5 gap-2 sm:gap-4 min-w-[400px]">
                {[
                  { label: 'Box 1', value: report.rraBoxes.box1Sales, desc: 'Sales', color: 'bg-blue-900/40 border-blue-700', textColor: 'text-blue-300' },
                  { label: 'Box 2', value: report.rraBoxes.box2OutputVAT, desc: 'Output VAT', color: 'bg-purple-900/40 border-purple-700', textColor: 'text-purple-300' },
                  { label: 'Box 3', value: report.rraBoxes.box3Purchases, desc: 'Purchases', color: 'bg-orange-900/40 border-orange-700', textColor: 'text-orange-300' },
                  { label: 'Box 4', value: report.rraBoxes.box4InputVAT, desc: 'Input VAT', color: 'bg-green-900/40 border-green-700', textColor: 'text-green-300' },
                  { label: 'Box 5', value: report.rraBoxes.box5NetVAT, desc: 'Net VAT', color: report.rraBoxes.box5NetVAT >= 0 ? 'bg-red-900/40 border-red-700' : 'bg-yellow-900/40 border-yellow-700', textColor: report.rraBoxes.box5NetVAT >= 0 ? 'text-red-300' : 'text-yellow-300' },
                ].map((box, idx) => (
                  <div key={idx} className={`p-2 sm:p-4 rounded-lg text-center border ${box.color}`}>
                    <div className="text-xs text-slate-400 mb-1">{box.label}</div>
                    <div className={`font-bold text-sm sm:text-lg ${box.textColor}`}>{formatCurrency(box.value)}</div>
                    <div className="text-xs text-slate-500 hidden sm:block">{box.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
