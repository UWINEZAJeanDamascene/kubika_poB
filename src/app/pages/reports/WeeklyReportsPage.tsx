import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Input } from "@/app/components/ui/input";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Download,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { toast } from "sonner";
import {
  ReportCollectionPage,
  type ReportCatalogItem,
  type ReportMetric,
} from "./components/ReportCollectionPage";

const weeklyReports: ReportCatalogItem[] = [
  {
    id: "sales-performance",
    name: "Weekly Sales Performance",
    description: "Compare this week vs last week by value and volume with percentage change",
    icon: TrendingUp,
    tone: "blue",
  },
  {
    id: "inventory-reorder",
    name: "Inventory Reorder Report",
    description: "Products whose stock level has fallen below their reorder point",
    icon: AlertTriangle,
    tone: "amber",
  },
  {
    id: "supplier-performance",
    name: "Supplier Performance",
    description: "POs raised, deliveries received, pending and overdue per supplier",
    icon: Truck,
    tone: "emerald",
  },
  {
    id: "receivables-aging",
    name: "Receivables Aging",
    description: "Outstanding customer invoices grouped by age buckets",
    icon: DollarSign,
    tone: "indigo",
  },
  {
    id: "payables-aging",
    name: "Payables Aging",
    description: "Amounts owed to suppliers grouped by age buckets",
    icon: Receipt,
    tone: "rose",
  },
  {
    id: "cash-flow",
    name: "Weekly Cash Flow",
    description: "Daily cash in and out across the week with net position",
    icon: Wallet,
    tone: "cyan",
  },
  {
    id: "payroll-preview",
    name: "Payroll Preview",
    description: "Expected gross pay, PAYE, RSSB contributions, and net pay totals",
    icon: Users,
    tone: "violet",
  },
];

const reportPaths = {
  "sales-performance": "/reports/weekly/sales-performance",
  "inventory-reorder": "/reports/weekly/inventory-reorder",
  "supplier-performance": "/reports/weekly/supplier-performance",
  "receivables-aging": "/reports/weekly/receivables-aging",
  "payables-aging": "/reports/weekly/payables-aging",
  "cash-flow": "/reports/weekly/cash-flow",
  "payroll-preview": "/reports/weekly/payroll-preview",
} as const;

const dateScopedReports = new Set([
  "sales-performance",
  "supplier-performance",
  "cash-flow",
]);

export default function WeeklyReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedWeek, setSelectedWeek] = useState(
    searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek()
  );
  const [loading, setLoading] = useState<string | null>(null);

  const getWeekEnd = (monday: string) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  };

  const metrics: ReportMetric[] = [
    {
      label: "Reports",
      value: String(weeklyReports.length),
      caption: "Management review pack",
      icon: BarChart3,
      tone: "blue",
    },
    {
      label: "Exports",
      value: String(weeklyReports.length * 2),
      caption: "PDF and Excel formats",
      icon: Download,
      tone: "emerald",
    },
    {
      label: "Window",
      value: "7 Days",
      caption: `${selectedWeek} to ${getWeekEnd(selectedWeek)}`,
      icon: Clock,
      tone: "amber",
    },
    {
      label: "History",
      value: "Any Week",
      caption: "Flexible weekly access",
      icon: Calendar,
      tone: "violet",
    },
  ];

  const handleViewReport = (reportId: string) => {
    const path = reportPaths[reportId as keyof typeof reportPaths];
    if (!path) return;
    navigate(dateScopedReports.has(reportId) ? `${path}?weekStart=${selectedWeek}` : path);
  };

  const handleDownloadPDF = async (reportId: string) => {
    setLoading(reportId);
    try {
      switch (reportId) {
        case "sales-performance":
          await weeklyReportsApi.downloadSalesPerformancePDF(selectedWeek);
          break;
        case "inventory-reorder":
          await weeklyReportsApi.downloadInventoryReorderPDF();
          break;
        case "supplier-performance":
          await weeklyReportsApi.downloadSupplierPerformancePDF(selectedWeek);
          break;
        case "receivables-aging":
          await weeklyReportsApi.downloadReceivablesAgingPDF();
          break;
        case "payables-aging":
          await weeklyReportsApi.downloadPayablesAgingPDF();
          break;
        case "cash-flow":
          await weeklyReportsApi.downloadCashFlowPDF(selectedWeek);
          break;
        case "payroll-preview":
          await weeklyReportsApi.downloadPayrollPreviewPDF();
          break;
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
        case "sales-performance":
          await weeklyReportsApi.downloadSalesPerformanceExcel(selectedWeek);
          break;
        case "inventory-reorder":
          await weeklyReportsApi.downloadInventoryReorderExcel();
          break;
        case "supplier-performance":
          await weeklyReportsApi.downloadSupplierPerformanceExcel(selectedWeek);
          break;
        case "receivables-aging":
          await weeklyReportsApi.downloadReceivablesAgingExcel();
          break;
        case "payables-aging":
          await weeklyReportsApi.downloadPayablesAgingExcel();
          break;
        case "cash-flow":
          await weeklyReportsApi.downloadCashFlowExcel(selectedWeek);
          break;
        case "payroll-preview":
          await weeklyReportsApi.downloadPayrollPreviewExcel();
          break;
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
      title="Weekly Reports"
      subtitle="Seven-day rolling analysis for management review, inventory planning, cash flow monitoring, and payroll preview."
      badge="Weekly"
      icon={Calendar}
      tone="violet"
      reports={weeklyReports}
      metrics={metrics}
      infoTitle="Weekly operating rhythm"
      infoBody="Use the week selector for date-scoped reports. Aging and reorder reports always open with their current operational position."
      controls={
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Week Starting
            </label>
            <Input
              type="date"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
              className="mt-2 h-9 w-44 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Week: {selectedWeek} to {getWeekEnd(selectedWeek)}
            </p>
          </div>
        </div>
      }
      onBack={() => navigate("/reports")}
      onView={handleViewReport}
      onDownloadPDF={handleDownloadPDF}
      onDownloadExcel={handleDownloadExcel}
      loading={loading}
    />
  );
}
