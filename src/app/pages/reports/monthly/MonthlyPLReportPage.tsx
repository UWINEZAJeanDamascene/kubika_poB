import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, TrendingUp, Printer } from "lucide-react";
import { useMonthlyProfitAndLoss } from "@/lib/hooks/useMonthlyReports";
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

export default function MonthlyPLReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyProfitAndLoss(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadProfitAndLossPDF(year, month);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadProfitAndLossExcel(year, month);
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
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">P&L Report</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">{report.period}</p>
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
          <p className="text-lg">{report.period}</p>
          <p className="text-sm text-gray-500">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
        </div>

        {/* Report Content */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:hidden">
            <CardTitle>Profit & Loss Statement</CardTitle>
            <CardDescription>
              Revenue, expenses, and profitability for {report.period}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <div className="space-y-4 sm:space-y-6 min-w-[500px]">
                {/* Column Headers */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4 pb-2 border-b font-semibold text-xs sm:text-sm">
                  <div>Description</div>
                  <div className="text-right">Current<br className="sm:hidden"/> Month</div>
                  <div className="text-right">Prior<br className="sm:hidden"/> Month</div>
                  <div className="text-right">YTD</div>
                </div>

                {/* Sections */}
                {report.sections.map((section, idx) => (
                  <div key={idx} className="space-y-1 sm:space-y-2">
                    <div
                      className={`grid grid-cols-4 gap-2 sm:gap-4 py-2 text-xs sm:text-sm ${
                        section.isTotal
                          ? 'font-bold border-t-2 border-b-2 border-black'
                          : section.isSubtotal
                          ? 'font-semibold border-t border-b'
                          : section.items
                          ? 'font-semibold'
                          : ''
                      }`}
                    >
                      <div>{section.title}</div>
                      <div className="text-right">{formatCurrency(section.current)}</div>
                      <div className="text-right">{formatCurrency(section.prior)}</div>
                      <div className="text-right">{formatCurrency(section.ytd)}</div>
                    </div>

                    {/* Sub-items */}
                    {section.items?.map((item, itemIdx) => (
                      <div key={itemIdx} className="grid grid-cols-4 gap-2 sm:gap-4 py-1 pl-2 sm:pl-4 text-xs sm:text-sm">
                        <div className="text-muted-foreground">{item.name}</div>
                        <div className="text-right">{formatCurrency(item.current)}</div>
                        <div className="text-right">{formatCurrency(item.prior)}</div>
                        <div className="text-right">{formatCurrency(item.ytd)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 print:hidden">
          {report.sections
            .filter(s => s.isTotal || s.isSubtotal)
            .map((section, idx) => {
              const diff = section.current - section.prior;
              const isPositive = diff >= 0;
              return (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardDescription>{section.title}</CardDescription>
                    <CardTitle className={`text-2xl ${section.current >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(section.current)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={isPositive ? "default" : "destructive"}>
                      vs Prior: {isPositive ? '+' : ''}{formatCurrency(diff)}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </Layout>
  );
}
