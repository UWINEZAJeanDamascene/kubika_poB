import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Package, Printer, FileSpreadsheet, AlertTriangle, Download, Loader2 } from "lucide-react";
import { useSemiAnnualStockTurnover } from "@/lib/hooks/useMonthlyReports";
import { useSemiAnnualExports } from "@/lib/hooks/useSemiAnnualExports";
import { useNavigate } from "react-router";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number, decimals = 1) => {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export default function SemiAnnualStockTurnoverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualStockTurnover(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports("stock-turnover", startYear, startMonth, endYear, endMonth);
  const handlePrint = () => { window.print(); };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
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
        <div className="p-3 sm:p-4 md:p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-700">Error loading report: {error.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/reports/semi-annual')}
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

  const summary = report.summary || {};
  const categoryAnalysis = report.categoryAnalysis || [];
  const deadStock = report.deadStock || [];

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/semi-annual')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Stock Turnover Analysis
              </h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={downloading === "pdf"}>
              {downloading === "pdf" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadExcel} disabled={downloading === "excel"}>
              {downloading === "excel" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">Semi-Annual Stock Turnover Analysis</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Products</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{summary.totalProducts || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Total Stock Value</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.totalStockValue || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Avg Turnover Ratio</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatNumber(summary.averageTurnoverRatio || 0, 2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Avg Days Inventory</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatNumber(summary.averageDaysInventory || 0, 0)} days</CardTitle>
            </CardHeader>
          </Card>
          <Card className={summary.deadStockItems > 0 ? 'border-red-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Dead Stock Items
              </CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${summary.deadStockItems > 0 ? 'text-red-600' : ''}`}>
                {summary.deadStockItems || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={summary.deadStockValue > 0 ? 'border-red-200' : ''}>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Dead Stock Value
              </CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${summary.deadStockValue > 0 ? 'text-red-600' : ''}`}>
                {formatCurrency(summary.deadStockValue || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Category Analysis */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Category Analysis</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Turnover and inventory metrics by product category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Category</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Products</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Stock Value</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">COGS</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Turnover</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Days Inv.</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryAnalysis.length > 0 ? categoryAnalysis.map((cat, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-700">{cat.category}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">{cat.productCount}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{formatCurrency(cat.stockValue)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{formatCurrency(cat.cogs)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">
                        <Badge variant={cat.turnoverRatio >= 4 ? 'default' : cat.turnoverRatio >= 2 ? 'secondary' : 'destructive'}>
                          {formatNumber(cat.turnoverRatio, 2)}
                        </Badge>
                      </td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-mono">{formatNumber(cat.daysInventoryOutstanding, 0)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted-foreground text-sm">No category data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Dead Stock Alert */}
        {deadStock.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="bg-red-50 py-3 px-3 sm:py-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Dead Stock Alert (90+ Days No Movement)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-red-600">
                Items with zero movement for more than 90 days
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b bg-red-50/50">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Product</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">SKU</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Quantity</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm">Unit Cost</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadStock.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{item.name}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground">{item.sku}</td>
                        <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{item.quantity}</td>
                        <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{formatCurrency(item.unitCost)}</td>
                        <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-mono text-red-600 font-medium">
                          {formatCurrency(item.totalValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Stock Turnover Analysis</p>
        </div>
      </div>
    </Layout>
  );
}
