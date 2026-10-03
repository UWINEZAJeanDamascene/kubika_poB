import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Target, Printer, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualBudgetVsActual } from "@/lib/hooks/useAnnualReports";
import { annualReportsApi } from "@/lib/api.annualReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function AnnualBudgetVsActualPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const { data: report, isLoading, error } = useAnnualBudgetVsActual(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadBudgetVsActualExcel(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };
  const handleDownloadPDF = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadBudgetVsActualPDF(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };

  if (isLoading) return <Layout><div className="p-6 space-y-6"><Skeleton className="h-10 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card></div></Layout>;
  if (error) return <Layout><div className="p-6"><Card className="border-red-200 bg-red-50"><CardContent className="p-6"><p className="text-red-700">Error: {error.message}</p><Button variant="outline" className="mt-4" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></CardContent></Card></div></Layout>;
  if (!report) return null;

  const s = report.summary;

  return (
    <Layout>
      <div className="annual-report-detail p-6 space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-primary" />Annual Budget vs Actual</h1>
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
          <h1 className="text-2xl font-bold">Annual Budget vs Actual Performance</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="bg-emerald-50"><CardTitle className="text-emerald-800">Revenue</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-sm text-muted-foreground">Budgeted</p><p className="text-lg font-medium">{formatCurrency(s.totalBudgetedRevenue)}</p></div>
                <div><p className="text-sm text-muted-foreground">Actual</p><p className="text-lg font-medium">{formatCurrency(s.totalActualRevenue)}</p></div>
                <div><p className="text-sm text-muted-foreground">Variance</p><p className={`text-lg font-bold ${s.revenueVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{s.revenueVariance >= 0 ? '+' : ''}{formatCurrency(s.revenueVariance)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="bg-amber-50"><CardTitle className="text-amber-800">Expenses</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-sm text-muted-foreground">Budgeted</p><p className="text-lg font-medium">{formatCurrency(s.totalBudgetedExpenses)}</p></div>
                <div><p className="text-sm text-muted-foreground">Actual</p><p className="text-lg font-medium">{formatCurrency(s.totalActualExpenses)}</p></div>
                <div><p className="text-sm text-muted-foreground">Variance</p><p className={`text-lg font-bold ${s.expenseVariance <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{s.expenseVariance >= 0 ? '+' : ''}{formatCurrency(s.expenseVariance)}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Line Performance</CardTitle>
            <CardDescription>{report.budgetLines.length} budget accounts tracked</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Account</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Budgeted</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Actual</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Variance</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.budgetLines.map((b) => (
                    <tr key={b.budgetLineId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm"><div className="font-medium">{b.accountName}</div><div className="text-xs text-muted-foreground">{b.accountCode}</div></td>
                      <td className="py-2 px-4 text-sm">{b.category}</td>
                      <td className="py-2 px-4 text-sm capitalize">{b.accountType}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(b.budgetedAmount)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(b.actualAmount)}</td>
                      <td className="text-right py-2 px-4 text-sm font-medium">{b.variance >= 0 ? '+' : ''}{formatCurrency(b.variance)}</td>
                      <td className="text-center py-2 px-4 text-sm">
                        <Badge variant={b.status === 'on_track' ? 'default' : b.status === 'favorable' || b.status === 'under' ? 'secondary' : 'destructive'}>
                          {b.status.replace('_', ' ')}
                        </Badge>
                      </td>
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
