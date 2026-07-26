import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, TrendingUp, Printer, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useSemiAnnualProfitAndLoss } from "@/lib/hooks/useMonthlyReports";
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

export default function SemiAnnualPLReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualProfitAndLoss(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports(
    "profit-loss",
    startYear,
    startMonth,
    endYear,
    endMonth,
  );

  const handlePrint = () => {
    window.print();
  };

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
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Semi-Annual Profit & Loss
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
          <h1 className="text-2xl font-bold text-center">Semi-Annual Profit & Loss Statement</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Generated: {new Date(report.generatedAt).toLocaleDateString('en-RW', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* Report */}
        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Profit & Loss - Six Month Analysis</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Month-by-month breakdown with totals
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm sticky left-0 bg-slate-100 min-w-[180px] border-b border-slate-200 text-slate-700">
                      Description
                    </th>
                    {report.months.map((m, idx) => (
                      <th key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm min-w-[100px] border-b border-slate-200 text-slate-700">
                        {m.name}
                      </th>
                    ))}
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm bg-emerald-50 min-w-[110px] border-b border-slate-200 text-emerald-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-100 last:border-0 ${
                        row.isTotal ? 'bg-emerald-50/50 font-bold' : ''
                      } ${row.isSubtotal ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 ${
                        row.isTotal ? 'bg-emerald-50/50 text-emerald-800' : row.isSubtotal ? 'bg-slate-50 text-slate-700' : 'bg-white text-slate-700'
                      } ${row.isSubtotal || row.isTotal ? 'font-semibold' : ''}`}>
                        {row.title}
                      </td>
                      {row.monthlyValues.map((val, vIdx) => (
                        <td key={vIdx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-slate-600">
                          {formatCurrency(val)}
                        </td>
                      ))}
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-mono font-bold bg-emerald-50/50 text-emerald-700">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Semi-Annual Profit & Loss Statement</p>
        </div>
      </div>
    </Layout>
  );
}
