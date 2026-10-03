import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Truck, Printer, FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualAccountsPayable } from "@/lib/hooks/useAnnualReports";
import { annualReportsApi } from "@/lib/api.annualReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export default function AnnualAccountsPayablePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const { data: report, isLoading, error } = useAnnualAccountsPayable(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadAccountsPayableExcel(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };
  const handleDownloadPDF = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadAccountsPayablePDF(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };

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
              <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-6 h-6 text-primary" />Annual Accounts Payable</h1>
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
          <h1 className="text-2xl font-bold">Annual Accounts Payable Summary</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Suppliers</p><p className="text-2xl font-bold">{report.totals.totalSuppliers}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-500" />Credit Purchases</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(report.totals.totalCreditPurchases)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="w-4 h-4 text-blue-500" />Cash Paid</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(report.totals.totalCashPaid)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balance</CardTitle>
            <CardDescription className="text-3xl font-bold text-amber-600">{formatCurrency(report.totals.totalOutstanding)}</CardDescription>
          </CardHeader>
        </Card>

        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Summary</CardTitle>
            <CardDescription>{report.suppliers.length} suppliers with AP activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Supplier</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">TIN</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Credit Purchases</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">POs</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Cash Paid</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Outstanding</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">DPO</th>
                  </tr>
                </thead>
                <tbody>
                  {report.suppliers.map((s) => (
                    <tr key={s.supplierId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{s.supplierName}</td>
                      <td className="py-2 px-4 text-sm">{s.tin || '-'}</td>
                      <td className="text-right py-2 px-4 text-sm text-emerald-600">{formatCurrency(s.creditPurchases)}</td>
                      <td className="text-right py-2 px-4 text-sm">{s.purchaseOrders}</td>
                      <td className="text-right py-2 px-4 text-sm text-blue-600">{formatCurrency(s.cashPaid)}</td>
                      <td className="text-right py-2 px-4 text-sm font-medium">{formatCurrency(s.outstandingBalance)}</td>
                      <td className="text-right py-2 px-4 text-sm">{s.daysPayablesOutstanding.toFixed(0)}</td>
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
