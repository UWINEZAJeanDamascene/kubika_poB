import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Receipt, Printer, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualTaxSummary } from "@/lib/hooks/useAnnualReports";
import { annualReportsApi } from "@/lib/api.annualReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function AnnualTaxSummaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const { data: report, isLoading, error } = useAnnualTaxSummary(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadTaxSummaryExcel(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };
  const handleDownloadPDF = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadTaxSummaryPDF(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };

  if (isLoading) return <Layout><div className="p-6 space-y-6"><Skeleton className="h-10 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card></div></Layout>;
  if (error) return <Layout><div className="p-6"><Card className="border-red-200 bg-red-50"><CardContent className="p-6"><p className="text-red-700">Error: {error.message}</p><Button variant="outline" className="mt-4" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></CardContent></Card></div></Layout>;
  if (!report) return null;

  return (
    <Layout>
      <div className="annual-report-detail p-6 space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" />Annual Tax Summary</h1>
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
          <h1 className="text-2xl font-bold">Annual Tax Summary Report</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50"><CardTitle className="text-amber-800 text-lg">VAT</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Output VAT</p><p className="text-lg font-medium">{formatCurrency(report.vat.outputVAT)}</p>
              <p className="text-sm text-muted-foreground mt-2">Input VAT</p><p className="text-lg font-medium">{formatCurrency(report.vat.inputVAT)}</p>
              <p className="text-sm text-muted-foreground mt-2">Net VAT Payable</p><p className="text-xl font-bold text-amber-600">{formatCurrency(report.vat.netVATPayable)}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50"><CardTitle className="text-blue-800 text-lg">PAYE</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total PAYE</p><p className="text-xl font-bold text-blue-600">{formatCurrency(report.paye.totalPaye)}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-50"><CardTitle className="text-emerald-800 text-lg">RSSB</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Employee Contributions</p><p className="text-lg font-medium">{formatCurrency(report.rssb.employeeContributions)}</p>
              <p className="text-sm text-muted-foreground mt-2">Employer Contributions</p><p className="text-lg font-medium">{formatCurrency(report.rssb.employerContributions)}</p>
              <p className="text-sm text-muted-foreground mt-2">Total</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(report.rssb.totalContributions)}</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50"><CardTitle className="text-purple-800 text-lg">Withholding</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Withholding Tax</p><p className="text-xl font-bold text-purple-600">{formatCurrency(report.withholding.totalWithholdingTax)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Tax Breakdown</CardTitle>
            <CardDescription>Tax remittances by month</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Output VAT</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Input VAT</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Net VAT</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">PAYE</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Emp RSSB</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Empr RSSB</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyBreakdown.map((m) => (
                    <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{m.monthName}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.outputVAT)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.inputVAT)}</td>
                      <td className="text-right py-2 px-4 text-sm font-medium">{formatCurrency(m.netVAT)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.paye)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.employeeRSSB)}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(m.employerRSSB)}</td>
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
