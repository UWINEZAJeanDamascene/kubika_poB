import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Calculator, Printer, FileSpreadsheet, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualPayrollReport } from "@/lib/hooks/useAnnualReports";
import { annualReportsApi } from "@/lib/api.annualReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function AnnualPayrollPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const { data: report, isLoading, error } = useAnnualPayrollReport(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadPayrollReportExcel(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };
  const handleDownloadPDF = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadPayrollReportPDF(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };

  if (isLoading) return <Layout><div className="p-6 space-y-6"><Skeleton className="h-10 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card></div></Layout>;
  if (error) return <Layout><div className="p-6"><Card className="border-red-200 bg-red-50"><CardContent className="p-6"><p className="text-red-700">Error: {error.message}</p><Button variant="outline" className="mt-4" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></CardContent></Card></div></Layout>;
  if (!report) return null;

  const yt = report.yearTotals;

  return (
    <Layout>
      <div className="annual-report-detail p-6 space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6 text-primary" />Annual Payroll & Benefits</h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><FileSpreadsheet className="w-4 h-4 mr-2" />PDF</Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
          </div>
        </div>

        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-bold">Annual Payroll & Benefits Report</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" />Employees</p><p className="text-2xl font-bold">{yt.totalEmployees}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Gross Salary</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(yt.grossSalary)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">PAYE</p><p className="text-2xl font-bold text-amber-600">{formatCurrency(yt.paye)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-4 h-4 text-blue-500" />Total Cost</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(yt.totalEmploymentCost)}</p></CardContent></Card>
        </div>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Payroll costs by month</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Month</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm border-b">Employees</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Gross Salary</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Employer RSSB</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">PAYE</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Net Pay</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyData.map((m) => (
                    <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{m.monthName}</td>
                      <td className="text-center py-2 px-4 text-sm">{m.employeeCount}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.grossSalary)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.employerRSSB)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.paye)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.netPay)}</td>
                      <td className="text-right py-2 px-4 text-sm font-medium">{formatCurrency(m.totalEmploymentCost)}</td>
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
