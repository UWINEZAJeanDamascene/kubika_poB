import { useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "@/app/components/ui/input";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Landmark,
  Package,
  Receipt,
  Scale,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";
import {
  ReportCollectionPage,
  type ReportCatalogItem,
  type ReportMetric,
} from "./components/ReportCollectionPage";

const monthlyReports: ReportCatalogItem[] = [
  { id: "profit-loss", name: "Profit & Loss Statement", description: "Revenue, COGS, gross profit, operating expenses, EBITDA, depreciation, interest, net profit", icon: TrendingUp, tone: "emerald" },
  { id: "balance-sheet", name: "Balance Sheet", description: "Assets, liabilities, equity with prior month comparison", icon: Scale, tone: "blue" },
  { id: "trial-balance", name: "Trial Balance", description: "All accounts with debit/credit balances confirming agreement", icon: FileSpreadsheet, tone: "violet" },
  { id: "cash-flow", name: "Cash Flow Statement", description: "Operating, investing, financing activities - indirect method", icon: Wallet, tone: "amber" },
  { id: "stock-valuation", name: "Stock Valuation", description: "Inventory with weighted average cost, total value, slow-moving flags", icon: Package, tone: "indigo" },
  { id: "sales-by-customer", name: "Sales by Customer", description: "Ranked customer list by revenue with AOV and outstanding balance", icon: Users, tone: "cyan" },
  { id: "sales-by-category", name: "Sales by Category", description: "Revenue and units by product category with gross margin", icon: Tags, tone: "teal" },
  { id: "purchases-by-supplier", name: "Purchases by Supplier", description: "Ranked suppliers with PO count and order vs invoiced variance", icon: Truck, tone: "orange" },
  { id: "ar-aging", name: "Accounts Receivable Aging", description: "30/60/90/90+ day buckets with provision for doubtful debts", icon: Clock, tone: "rose" },
  { id: "ap-aging", name: "Accounts Payable Aging", description: "30/60/90/90+ day bucket structure for payables", icon: AlertCircle, tone: "rose" },
  { id: "payroll-summary", name: "Payroll Summary", description: "Employee-level detail: gross, PAYE, RSSB, deductions, net pay", icon: Receipt, tone: "violet" },
  { id: "vat-return", name: "VAT Return Worksheet", description: "Output/input VAT, net payable/reclaimable, RRA filing format", icon: Calculator, tone: "emerald" },
  { id: "bank-reconciliation", name: "Bank Reconciliation", description: "Book balance, outstanding items, bank balance, reconciling items", icon: Landmark, tone: "blue" },
  { id: "budget-vs-actual", name: "Budget vs Actual", description: "Expense/revenue vs budget with variance in value and percentage", icon: Target, tone: "violet" },
  { id: "general-ledger", name: "General Ledger Activity", description: "Monthly GL movements by account with transaction counts", icon: BookOpen, tone: "slate" },
];

// Keep the monthly pack visually calm and consistent; report types are already
// identified by their labels and icons, so each card uses the same cycle color.
const monthlyReportCatalog = monthlyReports.map((report) => ({
  ...report,
  tone: "emerald" as const,
}));

const reportPaths = Object.fromEntries(
  monthlyReports.map((report) => [report.id, `/reports/monthly/${report.id}`])
) as Record<string, string>;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyReportsPage() {
  const navigate = useNavigate();
  const current = monthlyReportsApi.getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(current.year);
  const [selectedMonth, setSelectedMonth] = useState(current.month);
  const [loading, setLoading] = useState<string | null>(null);

  const periodLabel = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
  const metrics: ReportMetric[] = [
    { label: "Reports", value: String(monthlyReports.length), caption: `Available for ${periodLabel}`, icon: TrendingUp, tone: "emerald" },
    { label: "Exports", value: String(monthlyReports.length * 2), caption: "PDF and Excel formats", icon: Download, tone: "emerald" },
    { label: "Coverage", value: "Monthly", caption: "Management close pack", icon: Calendar, tone: "emerald" },
    { label: "Analysis", value: "YTD", caption: "Comparative reporting", icon: TrendingDown, tone: "emerald" },
  ];

  const handleViewReport = (reportId: string) => {
    const path = reportPaths[reportId];
    if (path) navigate(`${path}?year=${selectedYear}&month=${selectedMonth}`);
  };

  const handleDownloadPDF = async (reportId: string) => {
    setLoading(reportId);
    try {
      switch (reportId) {
        case "profit-loss": await monthlyReportsApi.downloadProfitAndLossPDF(selectedYear, selectedMonth); break;
        case "balance-sheet": await monthlyReportsApi.downloadBalanceSheetPDF(selectedYear, selectedMonth); break;
        case "trial-balance": await monthlyReportsApi.downloadTrialBalancePDF(selectedYear, selectedMonth); break;
        case "cash-flow": await monthlyReportsApi.downloadCashFlowPDF(selectedYear, selectedMonth); break;
        case "stock-valuation": await monthlyReportsApi.downloadStockValuationPDF(selectedYear, selectedMonth); break;
        case "sales-by-customer": await monthlyReportsApi.downloadSalesByCustomerPDF(selectedYear, selectedMonth); break;
        case "sales-by-category": await monthlyReportsApi.downloadSalesByCategoryPDF(selectedYear, selectedMonth); break;
        case "purchases-by-supplier": await monthlyReportsApi.downloadPurchasesBySupplierPDF(selectedYear, selectedMonth); break;
        case "ar-aging": await monthlyReportsApi.downloadARAgingPDF(selectedYear, selectedMonth); break;
        case "ap-aging": await monthlyReportsApi.downloadAPAgingPDF(selectedYear, selectedMonth); break;
        case "payroll-summary": await monthlyReportsApi.downloadPayrollSummaryPDF(selectedYear, selectedMonth); break;
        case "vat-return": await monthlyReportsApi.downloadVATReturnPDF(selectedYear, selectedMonth); break;
        case "bank-reconciliation": await monthlyReportsApi.downloadBankReconciliationPDF(selectedYear, selectedMonth); break;
        case "budget-vs-actual": await monthlyReportsApi.downloadBudgetVsActualPDF(selectedYear, selectedMonth); break;
        case "general-ledger": await monthlyReportsApi.downloadGeneralLedgerPDF(selectedYear, selectedMonth); break;
      }
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadExcel = async (reportId: string) => {
    setLoading(`${reportId}-excel`);
    try {
      switch (reportId) {
        case "profit-loss": await monthlyReportsApi.downloadProfitAndLossExcel(selectedYear, selectedMonth); break;
        case "balance-sheet": await monthlyReportsApi.downloadBalanceSheetExcel(selectedYear, selectedMonth); break;
        case "trial-balance": await monthlyReportsApi.downloadTrialBalanceExcel(selectedYear, selectedMonth); break;
        case "cash-flow": await monthlyReportsApi.downloadCashFlowExcel(selectedYear, selectedMonth); break;
        case "stock-valuation": await monthlyReportsApi.downloadStockValuationExcel(selectedYear, selectedMonth); break;
        case "sales-by-customer": await monthlyReportsApi.downloadSalesByCustomerExcel(selectedYear, selectedMonth); break;
        case "sales-by-category": await monthlyReportsApi.downloadSalesByCategoryExcel(selectedYear, selectedMonth); break;
        case "purchases-by-supplier": await monthlyReportsApi.downloadPurchasesBySupplierExcel(selectedYear, selectedMonth); break;
        case "ar-aging": await monthlyReportsApi.downloadARAgingExcel(selectedYear, selectedMonth); break;
        case "ap-aging": await monthlyReportsApi.downloadAPAgingExcel(selectedYear, selectedMonth); break;
        case "payroll-summary": await monthlyReportsApi.downloadPayrollSummaryExcel(selectedYear, selectedMonth); break;
        case "vat-return": await monthlyReportsApi.downloadVATReturnExcel(selectedYear, selectedMonth); break;
        case "bank-reconciliation": await monthlyReportsApi.downloadBankReconciliationExcel(selectedYear, selectedMonth); break;
        case "budget-vs-actual": await monthlyReportsApi.downloadBudgetVsActualExcel(selectedYear, selectedMonth); break;
        case "general-ledger": await monthlyReportsApi.downloadGeneralLedgerExcel(selectedYear, selectedMonth); break;
      }
      toast.success("Excel downloaded successfully");
    } catch {
      toast.error("Failed to download Excel");
    } finally {
      setLoading(null);
    }
  };

  return (
    <ReportCollectionPage
      title="Monthly Reports"
      subtitle="Comprehensive management accounting reports with prior month and year-to-date comparisons."
      badge="Monthly"
      icon={Calendar}
      tone="emerald"
      reports={monthlyReportCatalog}
      metrics={metrics}
      infoTitle="Monthly management close"
      infoBody="Choose the accounting month and year to generate close-ready financial, operating, tax, budget, and ledger reports."
      controls={
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Year</label>
              <Input type="number" value={selectedYear} onChange={(event) => setSelectedYear(parseInt(event.target.value))} className="mt-2 h-9 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" min={2020} max={2100} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Month</label>
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(parseInt(event.target.value))} className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
              </select>
            </div>
          </div>
        </div>
      }
      onView={handleViewReport}
      onDownloadPDF={handleDownloadPDF}
      onDownloadExcel={handleDownloadExcel}
      loading={loading}
    />
  );
}
