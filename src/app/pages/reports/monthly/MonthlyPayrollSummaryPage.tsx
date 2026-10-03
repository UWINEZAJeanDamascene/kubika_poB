import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Receipt, Printer } from "lucide-react";
import { useMonthlyPayrollSummary } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyPayrollSummaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyPayrollSummary(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadPayrollSummaryPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadPayrollSummaryExcel(year, month);
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
          <Card className="bg-slate-900 border-slate-700"><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Card className="bg-red-900/30 border-red-700">
            <CardContent className="p-6">
              <p className="text-red-300">Error: {error.message}</p>
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
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-violet-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Payroll</span>
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

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Employees</CardDescription>
              <CardTitle className="text-2xl text-white">{report.summary.totalEmployees}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Gross Pay</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.totalGrossPay)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Net Pay</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.totalNetPay)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Employer Cost</CardDescription>
              <CardTitle className="text-2xl text-white">{formatCurrency(report.summary.totalEmployerCost)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Deductions Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-900/30 border-blue-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-400">PAYE</CardDescription>
              <CardTitle className="text-2xl text-blue-300">{formatCurrency(report.summary.totalPAYE)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-green-900/30 border-green-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-400">RSSB (Employee)</CardDescription>
              <CardTitle className="text-2xl text-green-300">{formatCurrency(report.summary.totalRSSBEmployee)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-purple-900/30 border-purple-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-400">RSSB (Employer)</CardDescription>
              <CardTitle className="text-2xl text-purple-300">{formatCurrency(report.summary.totalRSSBEmployer)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-orange-900/30 border-orange-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-400">Other Deductions</CardDescription>
              <CardTitle className="text-2xl text-orange-300">{formatCurrency(report.summary.totalOtherDeductions)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Employees Table */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Employee Payroll Details</CardTitle>
            <CardDescription className="text-slate-400">{report.employees.length} employees for {report.period}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-300">Emp #</th>
                    <th className="text-left text-slate-300">Name</th>
                    <th className="text-right text-slate-300">Gross</th>
                    <th className="text-right text-slate-300">PAYE</th>
                    <th className="text-right text-slate-300">RSSB-E</th>
                    <th className="text-right text-slate-300">Other</th>
                    <th className="text-right font-bold text-slate-200">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {report.employees.map((emp, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 text-slate-200">{emp.employeeNumber}</td>
                      <td className="text-slate-200">{emp.name}</td>
                      <td className="text-right text-slate-200">{formatCurrency(emp.grossPay)}</td>
                      <td className="text-right text-slate-200">{formatCurrency(emp.paye)}</td>
                      <td className="text-right text-slate-200">{formatCurrency(emp.rssbEmployee)}</td>
                      <td className="text-right text-slate-200">{formatCurrency(emp.otherDeductions)}</td>
                      <td className="text-right font-bold text-white">{formatCurrency(emp.netPay)}</td>
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
