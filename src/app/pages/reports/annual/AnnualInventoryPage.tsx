import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Package, Printer, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualInventoryReconciliation } from "@/lib/hooks/useAnnualReports";
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

export default function AnnualInventoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  const { data: report, isLoading, error } = useAnnualInventoryReconciliation(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => {
    try { toast.loading("Generating..."); await annualReportsApi.downloadInventoryReconciliationExcel(year); toast.dismiss(); toast.success("Done"); }
    catch { toast.dismiss(); toast.error("Failed"); }
  };
  const handleDownloadPDF = async () => {
    try { toast.loading("Generating..."); await annualReportsApi.downloadInventoryReconciliationPDF(year); toast.dismiss(); toast.success("Done"); }
    catch { toast.dismiss(); toast.error("Failed"); }
  };

  if (isLoading) return <Layout><div className="p-6 space-y-6"><Skeleton className="h-10 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card></div></Layout>;
  if (error) return <Layout><div className="p-6"><Card className="border-red-200 bg-red-50"><CardContent className="p-6"><p className="text-red-700">Error: {error.message}</p><Button variant="outline" className="mt-4" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></CardContent></Card></div></Layout>;
  if (!report) return null;

  const summary = report.summary;

  return (
    <Layout>
      <div className="annual-report-detail p-6 space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-primary" />Annual Inventory Reconciliation</h1>
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
          <h1 className="text-2xl font-bold">Annual Inventory Reconciliation</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Reconciliation Status */}
        <Card className={summary.isReconciled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              {summary.isReconciled ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              <span className={`font-medium ${summary.isReconciled ? "text-emerald-700" : "text-amber-700"}`}>
                {summary.isReconciled ? "Inventory Reconciled" : "Reconciliation Issue Detected"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div><p className="text-sm text-muted-foreground">Opening Stock</p><p className="text-lg font-bold">{formatCurrency(summary.openingStock)}</p></div>
              <div><p className="text-sm text-muted-foreground">Purchases</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.totalPurchases)}</p></div>
              <div><p className="text-sm text-muted-foreground">COGS</p><p className="text-lg font-bold text-red-600">({formatCurrency(summary.costOfGoodsSold)})</p></div>
              <div><p className="text-sm text-muted-foreground">Calculated Closing</p><p className="text-lg font-bold">{formatCurrency(summary.calculatedClosing)}</p></div>
              <div><p className="text-sm text-muted-foreground">Actual Closing</p><p className="text-lg font-bold text-blue-600">{formatCurrency(summary.actualClosing)}</p></div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm">Difference: <span className={summary.reconciliationDifference > 1 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>{formatCurrency(summary.reconciliationDifference)}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Individual product movements and valuations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Product</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Opening</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Purchases</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">COGS</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.slice(0, 50).map((p) => (
                    <tr key={p.productId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{p.sku}</td>
                      <td className="py-2 px-4 text-sm">{p.name}</td>
                      <td className="text-right py-2 px-4 text-sm">{formatCurrency(p.openingValue)}</td>
                      <td className="text-right py-2 px-4 text-sm text-emerald-600">{formatCurrency(p.purchasesValue)}</td>
                      <td className="text-right py-2 px-4 text-sm text-red-600">({formatCurrency(p.cogsValue)})</td>
                      <td className="text-right py-2 px-4 text-sm font-medium">{formatCurrency(p.closingValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <CardFooter className="text-xs text-muted-foreground justify-center print:hidden">
          Generated: {new Date(report.generatedAt).toLocaleString()} | {report.products.length} products
        </CardFooter>
      </div>
    </Layout>
  );
}
