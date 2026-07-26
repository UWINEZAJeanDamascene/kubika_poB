import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Users, Printer, FileSpreadsheet, Wallet, PiggyBank, HeartPulse, Baby, CreditCard, Download, Loader2 } from "lucide-react";
import { useSemiAnnualPayrollHRCost } from "@/lib/hooks/useMonthlyReports";
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

const formatNumber = (num: number, decimals = 0) => {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export default function SemiAnnualPayrollHRCostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualPayrollHRCost(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports("payroll-hr", startYear, startMonth, endYear, endMonth);
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
  const monthlyData = report.monthlyData || [];

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
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Payroll & HR Cost
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
          <h1 className="text-2xl font-bold text-center">Semi-Annual Payroll & HR Cost Report</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
        </div>

        {/* Key Metrics */}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="py-4 px-4 sm:px-6">
            <CardDescription className="text-sm text-emerald-700">Total Employment Cost (6 Months)</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-emerald-800">{formatCurrency(summary.totalEmploymentCost || 0)}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4 sm:px-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-muted-foreground">Avg Monthly Employees: <strong>{formatNumber(summary.averageMonthlyEmployees || 0, 1)}</strong></span>
              <span className="text-muted-foreground">Cost per Employee: <strong>{formatCurrency(summary.costPerEmployee || 0)}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Gross Salary
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.grossSalary || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <PiggyBank className="w-3 h-3" /> Employer RSSB
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.employerRSSB || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <Baby className="w-3 h-3" /> Maternity Leave
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.maternityLeave || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <HeartPulse className="w-3 h-3" /> Medical Insurance
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.medicalInsurance || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Other Benefits
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.otherBenefits || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Other Staff Expenses</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.otherStaffExpenses || 0)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Statutory Deductions Summary */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Statutory Deductions Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Taxes and contributions withheld from employees
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">PAYE (Income Tax)</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.paye || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employee RSSB</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.employeeRSSB || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Monthly Payroll Breakdown</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Detailed cost breakdown by month
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Month</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Employees</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Gross Salary</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Employer RSSB</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Benefits</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm bg-emerald-50 border-b border-slate-200 text-emerald-700">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.length > 0 ? monthlyData.map((m, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-700">{m.monthName}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">{m.employeeCount}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{formatCurrency(m.grossSalary)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">{formatCurrency(m.employerRSSB)}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono">
                        {formatCurrency((m.maternityLeave || 0) + (m.medicalInsurance || 0) + (m.otherBenefits || 0))}
                      </td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-mono font-bold bg-emerald-50 text-emerald-700">
                        {formatCurrency(m.totalEmploymentCost)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted-foreground text-sm">No payroll data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Payroll & HR Cost Report</p>
        </div>
      </div>
    </Layout>
  );
}
