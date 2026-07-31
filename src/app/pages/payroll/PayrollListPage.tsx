import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { payrollApi, reportsApi, timesheetsApi, PayrollRecord } from "@/lib/api";
import { employeeApi } from "@/lib/api.employees";
import { Layout } from "../../layout/Layout";
import {
  Plus,
  RefreshCw,
  Loader2,
  Users,
  DollarSign,
  TrendingDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  Calculator,
  BookOpen,
  TrendingUp,
  Building2,
  ClipboardList,
  Send,
  CheckCircle,
  XCircle,
  Pencil,
  ArrowLeft,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EmployeeSelect from "@/app/components/EmployeeSelect";
import PayrollAdvancesTab from "./PayrollAdvancesTab";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
// import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function PayrollListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState({
    totalGrossSalary: 0,
    totalNetPay: 0,
    totalPAYE: 0,
    totalRSSB: 0,
    totalRssbEmployee: 0,
    totalRssbEmployer: 0,
    employeeCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  // Tabs: 'payroll' | 'advances' | 'labor-cost' | 'timesheets'
  const [activeTab, setActiveTab] = useState('payroll');

  // Labor Cost Analysis state
  const [lcYear, setLcYear] = useState(String(new Date().getFullYear()));
  const [lcMonth, setLcMonth] = useState("all");
  const [lcViewBy, setLcViewBy] = useState("employee");

  const { data: lcData, isLoading: lcLoading } = useQuery<any>({
    queryKey: ["labor-cost-analysis", lcYear, lcMonth, lcViewBy],
    queryFn: async () => {
      const res = await reportsApi.getLaborCostAnalysis({
        year: lcYear || undefined,
        month: lcMonth === "all" ? undefined : lcMonth,
        viewBy: lcViewBy,
      });
      return res.data as any;
    },
    enabled: activeTab === "labor-cost",
  });

  // Timesheets state
  const [tsSearch, setTsSearch] = useState("");
  const [tsPeriod, setTsPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: tsData, isLoading: tsLoading } = useQuery({
    queryKey: ["timesheets", tsPeriod],
    queryFn: async () => {
      const res = await timesheetsApi.getAll({ period: tsPeriod });
      return (res.data || []) as any[];
    },
    enabled: activeTab === "timesheets",
  });

  const tsSubmit = useMutation({
    mutationFn: (id: string) => timesheetsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", tsPeriod] });
    },
  });

  const tsApprove = useMutation({
    mutationFn: (id: string) => timesheetsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", tsPeriod] });
    },
  });

  const tsReject = useMutation({
    mutationFn: (id: string) => timesheetsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", tsPeriod] });
    },
  });

  const tsItems = (tsData || []).filter((t: any) =>
    t.employeeName?.toLowerCase().includes(tsSearch.toLowerCase())
  );

  const tsStatusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  // Inline Timesheet Form
  const [tsShowForm, setTsShowForm] = useState(false);
  const [tsEditingId, setTsEditingId] = useState<string | null>(null);
  const [tsFormEmployeeId, setTsFormEmployeeId] = useState("");
  const [tsFormPeriod, setTsFormPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [tsFormLines, setTsFormLines] = useState<any[]>([{ date: "", hoursWorked: "", activityType: "", notes: "" }]);

  const { data: tsFormEmployees } = useQuery({
    queryKey: ["employees", "active"],
    queryFn: async () => {
      const res = await employeeApi.getAll({ status: "active" });
      return res.data || [];
    },
    enabled: activeTab === "timesheets" && tsShowForm,
  });

  const { data: tsFormExisting } = useQuery({
    queryKey: ["timesheet", tsEditingId],
    queryFn: async () => {
      if (!tsEditingId) return null;
      const res = await timesheetsApi.getById(tsEditingId);
      return res.data;
    },
    enabled: Boolean(tsEditingId) && tsShowForm,
  });

  useEffect(() => {
    if (tsFormExisting) {
      const emp = tsFormExisting.employee as any;
      setTsFormEmployeeId(emp?._id || emp || "");
      setTsFormPeriod(`${tsFormExisting.period?.year}-${String(tsFormExisting.period?.month).padStart(2, "0")}`);
      setTsFormLines((tsFormExisting.lines || []).map((l: any) => ({
        ...l,
        date: l.date ? l.date.split("T")[0] : "",
        hoursWorked: String(l.hoursWorked),
      })));
    } else if (!tsEditingId) {
      setTsFormEmployeeId("");
      const now = new Date();
      setTsFormPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      setTsFormLines([{ date: "", hoursWorked: "", activityType: "", notes: "" }]);
    }
  }, [tsFormExisting, tsEditingId]);

  const tsSaveMutation = useMutation({
    mutationFn: async () => {
      const [year, month] = tsFormPeriod.split("-").map(Number);
      const payload = {
        employeeId: tsFormEmployeeId,
        period: { month, year },
        lines: tsFormLines.map((l) => ({
          date: l.date,
          hoursWorked: parseFloat(l.hoursWorked) || 0,
          activityType: l.activityType,
          notes: l.notes || undefined,
        })).filter((l) => l.date && l.hoursWorked > 0 && l.activityType),
      };
      if (tsEditingId) {
        return timesheetsApi.update(tsEditingId, payload);
      }
      return timesheetsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", tsPeriod] });
      setTsShowForm(false);
      setTsEditingId(null);
    },
  });

  const tsAddLine = () => setTsFormLines([...tsFormLines, { date: "", hoursWorked: "", activityType: "", notes: "" }]);
  const tsRemoveLine = (i: number) => setTsFormLines(tsFormLines.filter((_, idx) => idx !== i));
  const tsUpdateLine = (i: number, field: string, value: string) => {
    const next = [...tsFormLines];
    next[i][field] = value;
    setTsFormLines(next);
  };
  const tsTotalHours = tsFormLines.reduce((s, l) => s + (parseFloat(l.hoursWorked) || 0), 0);

  const TS_ACTIVITY_TYPES = [
    { value: "production", label: "Production" },
    { value: "assembly", label: "Assembly" },
    { value: "quality_control", label: "Quality Control" },
    { value: "packing_warehouse", label: "Packing / Warehouse" },
    { value: "administration", label: "Administration" },
    { value: "sales_support", label: "Sales Support" },
    { value: "other", label: "Other" },
  ];

  // Filters
  const currentMonth = String(new Date().getMonth() + 1);
  const currentYear = String(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
  const [filterYear, setFilterYear] = useState<string>(currentYear);
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [createManualMode, setCreateManualMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    nationalId: "",
    bankName: "",
    bankAccount: "",
    employmentType: "full-time" as const,
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    overtime: 0,
    bonuses: 0,
    commissions: 0,
    benefitsInKind: 0,
    healthInsurance: 0,
    loanDeductions: 0,
    otherDeductions: 0,
    occupationalHazardRate: 2.0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: "",
  });

  // Live calculations
  const [calculations, setCalculations] = useState({
    grossSalary: 0,
    paye: 0,
    rssbEmployeePension: 0,
    rssbEmployeeMaternity: 0,
    rssbEmployerPension: 0,
    rssbEmployerMaternity: 0,
    occupationalHazard: 0,
    occupationalHazardRate: 2.0,
    totalDeductions: 0,
    netPay: 0,
    totalEmployerCost: 0,
  });

  // Recalculate whenever salary fields change
  useEffect(() => {
    const basic = createForm.basicSalary || 0;
    const transport = createForm.transportAllowance || 0;
    const housing = createForm.housingAllowance || 0;
    const other = createForm.otherAllowances || 0;
    const overtime = createForm.overtime || 0;
    const bonuses = createForm.bonuses || 0;
    const commissions = createForm.commissions || 0;
    const benefitsInKind = createForm.benefitsInKind || 0;
    const healthInsurance = createForm.healthInsurance || 0;
    const loanDeductions = createForm.loanDeductions || 0;
    const otherDeductions = createForm.otherDeductions || 0;
    const gross = basic + transport + housing + other + overtime + bonuses + commissions + benefitsInKind;

    // Rwanda PAYE 2025 brackets
    let paye = 0;
    if (gross <= 60000) paye = 0;
    else if (gross <= 100000) paye = (gross - 60000) * 0.10;
    else if (gross <= 200000) paye = 4000 + (gross - 100000) * 0.20;
    else paye = 4000 + 20000 + (gross - 200000) * 0.30;
    paye = Math.round(paye * 100) / 100;

    // Pension contribution base: Basic + Transport only (Rwanda 2025)
    const pensionBase = basic + transport;

    // RSSB Employee contributions
    const rssbEmployeePension = Math.round(pensionBase * 0.06 * 100) / 100;
    const rssbEmployeeMaternity = Math.round(pensionBase * 0.003 * 100) / 100;
    const rssbPensionTotal = rssbEmployeePension + rssbEmployeeMaternity;

    // Total deductions
    const totalDeductions = paye + rssbPensionTotal + healthInsurance + loanDeductions + otherDeductions;
    const netPay = Math.round((gross - totalDeductions) * 100) / 100;

    // RSSB Employer contributions
    const rssbEmployerPension = Math.round(pensionBase * 0.06 * 100) / 100;
    const rssbEmployerMaternity = Math.round(pensionBase * 0.003 * 100) / 100;
    const hazardRate = createForm.occupationalHazardRate || 2.0;
    const occupationalHazard = Math.round(gross * (hazardRate / 100) * 100) / 100;

    const totalEmployerCost = Math.round(
      (gross + rssbEmployerPension + rssbEmployerMaternity + occupationalHazard) * 100
    ) / 100;

    setCalculations({
      grossSalary: gross,
      paye,
      rssbEmployeePension,
      rssbEmployeeMaternity,
      rssbEmployerPension,
      rssbEmployerMaternity,
      occupationalHazard,
      occupationalHazardRate: hazardRate,
      totalDeductions,
      netPay,
      totalEmployerCost,
    });
  }, [
    createForm.basicSalary,
    createForm.transportAllowance,
    createForm.housingAllowance,
    createForm.otherAllowances,
    createForm.overtime,
    createForm.bonuses,
    createForm.commissions,
    createForm.benefitsInKind,
    createForm.healthInsurance,
    createForm.loanDeductions,
    createForm.otherDeductions,
    createForm.occupationalHazardRate,
  ]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterMonth) params.month = parseInt(filterMonth);
      if (filterYear) params.year = parseInt(filterYear);
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;
      params.page = currentPage;
      params.limit = limit;

      const response = await payrollApi.getAll(params);
      if (response.success) {
        setRecords(response.data || []);
        if (response.pagination) {
          setTotalCount(response.pagination.total || 0);
          setTotalPages(response.pagination.pages || 1);
        }
        if (response.summary) {
          setSummary(prev => ({
            ...prev,
            ...response.summary,
            totalRssbEmployee: (response.summary as any).totalRssbEmployee ?? (response.summary.totalRSSB ? response.summary.totalRSSB * 0.5 : 0),
            totalRssbEmployer: (response.summary as any).totalRssbEmployer ?? (response.summary.totalRSSB ? response.summary.totalRSSB * 0.5 : 0),
          }));
        }
      }
    } catch (error) {
      console.error("[PayrollListPage] Failed to fetch:", error);
      toast.error(t("payroll.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    filterMonth,
    filterYear,
    filterStatus,
    searchQuery,
    currentPage,
    limit,
    t,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) fetchRecords();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchRecords]);

  const handleCreate = async () => {
    if (selectedEmployeeId && !createManualMode) {
      // Employee master mode: send full salary so backend can use it as fallback
      // when the employee has no SalaryHistory record
      setSubmitting(true);
      try {
        const salaryPayload = {
          basicSalary: createForm.basicSalary || 0,
          transportAllowance: createForm.transportAllowance || 0,
          housingAllowance: createForm.housingAllowance || 0,
          otherAllowances: createForm.otherAllowances || 0,
          overtime: createForm.overtime || 0,
          bonuses: createForm.bonuses || 0,
          commissions: createForm.commissions || 0,
          benefitsInKind: createForm.benefitsInKind || 0,
          healthInsurance: createForm.healthInsurance || 0,
          loanDeductions: createForm.loanDeductions || 0,
          otherDeductions: createForm.otherDeductions || 0,
          occupationalHazardRate: createForm.occupationalHazardRate || 2,
        };
        const overrides: any = {};
        if (createForm.overtime > 0) overrides.overtime = createForm.overtime;
        if (createForm.bonuses > 0) overrides.bonuses = createForm.bonuses;
        if (createForm.commissions > 0) overrides.commissions = createForm.commissions;
        if (createForm.benefitsInKind > 0) overrides.benefitsInKind = createForm.benefitsInKind;
        if (createForm.healthInsurance > 0) overrides.healthInsurance = createForm.healthInsurance;
        if (createForm.loanDeductions > 0) overrides.loanDeductions = createForm.loanDeductions;
        if (createForm.otherDeductions > 0) overrides.otherDeductions = createForm.otherDeductions;
        const response = await payrollApi.create({
          employee_id: selectedEmployeeId,
          period: { month: createForm.month, year: createForm.year },
          salary: salaryPayload,
          ...(Object.keys(overrides).length > 0 ? { salaryOverrides: overrides } : {}),
          notes: createForm.notes || undefined,
        });
        if (response.success) {
          toast.success(t("payroll.messages.created"));
          setShowCreateDialog(false);
          resetCreateForm();
          fetchRecords();
        }
      } catch (error: any) {
        console.error("[PayrollListPage] Create error:", error);
        toast.error(error?.message || t("payroll.messages.createFailed"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (
      !createForm.firstName ||
      !createForm.lastName ||
      !createForm.employeeId
    ) {
      toast.error("Please fill in all required employee fields");
      return;
    }
    if (createForm.basicSalary <= 0) {
      toast.error("Basic salary must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const response = await payrollApi.create({
        employee: {
          employeeId: createForm.employeeId,
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          email: createForm.email || undefined,
          phone: createForm.phone || undefined,
          department: createForm.department || undefined,
          position: createForm.position || undefined,
          nationalId: createForm.nationalId || undefined,
          bankName: createForm.bankName || undefined,
          bankAccount: createForm.bankAccount || undefined,
        },
        salary: {
          basicSalary: createForm.basicSalary,
          transportAllowance: createForm.transportAllowance,
          housingAllowance: createForm.housingAllowance,
          otherAllowances: createForm.otherAllowances,
          overtime: createForm.overtime,
          bonuses: createForm.bonuses,
          commissions: createForm.commissions,
          benefitsInKind: createForm.benefitsInKind,
        },
        deductions: {
          healthInsurance: createForm.healthInsurance,
          loanDeductions: createForm.loanDeductions,
          otherDeductions: createForm.otherDeductions,
        },
        period: { month: createForm.month, year: createForm.year },
        notes: createForm.notes || undefined,
      });

      if (response.success) {
        toast.success(t("payroll.messages.created"));
        setShowCreateDialog(false);
        resetCreateForm();
        fetchRecords();
      }
    } catch (error: any) {
      console.error("[PayrollListPage] Create error:", error);
      toast.error(error?.message || t("payroll.messages.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const response = await payrollApi.delete(selectedRecord._id);
      if (response.success) {
        toast.success(t("payroll.messages.deleted"));
        setShowDeleteDialog(false);
        setSelectedRecord(null);
        fetchRecords();
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.deleteFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async () => {
    // First do a dry-run to preview
    setBackfilling(true);
    try {
      const preview = await payrollApi.backfillPayrollJournals(true);
      if (!preview.success) {
        toast.error("Backfill preview failed");
        return;
      }
      const { backfilled, alreadyHaveJournal, total, errors } = preview.data;
      if (backfilled === 0) {
        toast.success(
          `✅ All ${total} payroll record${total !== 1 ? "s" : ""} already have journal entries — nothing to backfill.`,
        );
        return;
      }
      const confirmed = window.confirm(
        `Backfill will create journal entries for ${backfilled} payroll record${backfilled !== 1 ? "s" : ""}.\n` +
          `(${alreadyHaveJournal} already have journals and will be skipped)\n\n` +
          (errors.length > 0
            ? `⚠️ ${errors.length} record(s) may have issues.\n\n`
            : "") +
          `Proceed?`,
      );
      if (!confirmed) return;

      // Apply for real
      const result = await payrollApi.backfillPayrollJournals(false);
      if (result.success) {
        const d = result.data;
        if (d.errors && d.errors.length > 0) {
          toast.warning(
            `Backfill complete with ${d.errors.length} error(s). Created: ${d.backfilled}, Skipped: ${d.alreadyHaveJournal}.`,
          );
        } else {
          toast.success(
            `✅ ${result.message} — ${d.backfilled} new journal entr${d.backfilled !== 1 ? "ies" : "y"} posted.`,
          );
        }
        fetchRecords();
      }
    } catch (error: any) {
      toast.error(error?.message || "Backfill failed. Please try again.");
    } finally {
      setBackfilling(false);
    }
  };

  const handleFinaliseSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error(t("payroll.messages.noRecordsSelected"));
      return;
    }
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await payrollApi.finalise(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setSubmitting(false);
    setSelectedIds(new Set());
    if (successCount > 0) toast.success(`${successCount} record(s) finalised`);
    if (failCount > 0) toast.error(`${failCount} record(s) failed to finalise`);
    fetchRecords();
  };

  const handleExport = () => {
    const dataToExport = records.map((r) => ({
      "Employee ID": r.employee.employeeId,
      "First Name": r.employee.firstName,
      "Last Name": r.employee.lastName,
      Department: r.employee.department || "",
      Position: r.employee.position || "",
      "Basic Salary": r.salary.basicSalary,
      "Transport Allowance": r.salary.transportAllowance,
      "Housing Allowance": r.salary.housingAllowance,
      "Other Allowances": r.salary.otherAllowances,
      "Gross Salary": r.salary.grossSalary,
      PAYE: r.deductions.paye,
      "RSSB Employee":
        r.deductions.rssbEmployeePension + r.deductions.rssbEmployeeMaternity,
      "RSSB Employer":
        (r.contributions?.rssbEmployerPension || 0) +
        (r.contributions?.rssbEmployerMaternity || 0),
      "Net Pay": r.netPay,
      Status: r.record_status || r.payment?.status || "draft",
      Period: `${r.period.monthName} ${r.period.year}`,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `payroll_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const resetCreateForm = () => {
    setCreateForm({
      firstName: "",
      lastName: "",
      employeeId: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      nationalId: "",
      bankName: "",
      bankAccount: "",
      employmentType: "full-time",
      basicSalary: 0,
      transportAllowance: 0,
      housingAllowance: 0,
      otherAllowances: 0,
      overtime: 0,
      bonuses: 0,
      commissions: 0,
      benefitsInKind: 0,
      healthInsurance: 0,
      loanDeductions: 0,
      otherDeductions: 0,
      occupationalHazardRate: 2.0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      notes: "",
    });
    setSelectedEmployeeId(null);
    setCreateManualMode(false);
  };

  const handleEmployeeSelect = (emp: any) => {
    if (!emp) {
      setSelectedEmployeeId(null);
      return;
    }
    setSelectedEmployeeId(emp._id);
    setCreateForm({
      ...createForm,
      employeeId: emp.employeeId || "",
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department || "",
      position: emp.position || "",
      nationalId: emp.nationalId || "",
      bankName: emp.bankName || "",
      bankAccount: emp.bankAccount || "",
      employmentType: emp.employmentType || "full-time",
      basicSalary: emp.currentSalary?.basicSalary || 0,
      transportAllowance: emp.currentSalary?.transportAllowance || 0,
      housingAllowance: emp.currentSalary?.housingAllowance || 0,
      otherAllowances: emp.currentSalary?.otherAllowances || 0,
      overtime: 0,
      bonuses: 0,
      commissions: 0,
      benefitsInKind: 0,
      healthInsurance: 0,
      loanDeductions: 0,
      otherDeductions: 0,
      occupationalHazardRate: 2.0,
    });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r._id)));
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const getStatusBadge = (record: PayrollRecord) => {
    const status = record.record_status || record.payment?.status || "draft";
    const config: Record<string, { className: string }> = {
      draft: { className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500" },
      pending: { className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700" },
      finalised: { className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
      paid: { className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
      processed: { className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
    };
    const { className } = config[status] || config.draft;
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  };

  const canFinalise = (record: PayrollRecord) =>
    record.record_status === "draft";
  const canEdit = (record: PayrollRecord) => record.record_status === "draft";
  const canDelete = (record: PayrollRecord) => record.record_status === "draft";

  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYearNum - 2 + i);
  const selectedMonthLabel =
    MONTHS.find((month) => String(month.value) === filterMonth)?.label || "All months";
  const selectedPeriodLabel = `${selectedMonthLabel} ${filterYear || "All years"}`;
  const totalPayrollCost =
    summary.totalGrossSalary + summary.totalRssbEmployer;
  const netPayRate =
    summary.totalGrossSalary > 0
      ? Math.round((summary.totalNetPay / summary.totalGrossSalary) * 100)
      : 0;
  const deductionLoad =
    summary.totalGrossSalary > 0
      ? Math.round(
          ((summary.totalPAYE + summary.totalRssbEmployee) /
            summary.totalGrossSalary) *
            100,
        )
      : 0;
  const employerLoad =
    summary.totalGrossSalary > 0
      ? Math.round((summary.totalRssbEmployer / summary.totalGrossSalary) * 100)
      : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Users className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {t("payroll.title")}
                  </h1>
                  <Badge variant="secondary" className="h-6">
                    {selectedPeriodLabel}
                  </Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {t("payroll.subtitle")}
                </p>

          <div className="mobile-action-row mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    onClick={() => navigate("/payroll/generate")}
                    className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Users className="h-4 w-4" />
                    Generate Payroll
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/payroll-runs")}
                    className="h-10 gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Payroll Runs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                    className="h-10 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Record
                  </Button>
                  <Button variant="outline" onClick={handleExport} className="h-10 gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleBackfill}
                    disabled={backfilling}
                    className="h-10 gap-2 text-slate-500 dark:text-slate-400"
                  >
                    {backfilling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    Backfill Journals
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net pay rate</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {netPayRate}%
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Deductions</p>
                  <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                    {deductionLoad}%
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Employer load</p>
                  <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                    {employerLoad}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mobile-scroll-tabs flex gap-2 border-b border-slate-200 pb-0 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payroll'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Payroll Records
            </button>
            <button
              onClick={() => setActiveTab('advances')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'advances'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Employee Advances
            </button>
            <button
              onClick={() => setActiveTab('labor-cost')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'labor-cost'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Labor Cost Analysis
            </button>
            <button
              onClick={() => setActiveTab('timesheets')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'timesheets'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Timesheets
            </button>
          </div>

          {activeTab === 'payroll' && (
            <>
          <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Employees
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {summary.employeeCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {totalCount} record(s) in current view
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Gross Payroll
                    </p>
                    <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(summary.totalGrossSalary)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Before taxes and statutory deductions
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Net Pay
                    </p>
                    <p className="mt-3 truncate text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary.totalNetPay)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Employee take-home total
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Total Cost
                    </p>
                    <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(totalPayrollCost)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <Calculator className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Gross plus employer RSSB
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  Payroll Burden Mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">PAYE</span>
                    <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(summary.totalPAYE)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: `${Math.min(deductionLoad, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      RSSB Employee
                    </span>
                    <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(summary.totalRssbEmployee)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-orange-500"
                      style={{
                        width: `${Math.min(
                          summary.totalGrossSalary > 0
                            ? Math.round(
                                (summary.totalRssbEmployee /
                                  summary.totalGrossSalary) *
                                  100,
                              )
                            : 0,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      RSSB Employer
                    </span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(summary.totalRssbEmployer)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(employerLoad, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Pay Cycle Control
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Period</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {selectedPeriodLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Selected</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {selectedIds.size}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Payroll status
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={records.length > 0 ? "secondary" : "outline"}>
                      {records.length} visible
                    </Badge>
                    <Badge variant={selectedIds.size > 0 ? "secondary" : "outline"}>
                      {selectedIds.size > 0 ? "Ready to finalise" : "No selection"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={t("payroll.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 pl-10 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <Select
                  value={filterMonth || "all"}
                  onValueChange={(v) => {
                    setFilterMonth(v === "all" ? "" : v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder={t("payroll.month")} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="all" className="dark:text-slate-200">{t("payroll.allPeriods")}</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)} className="dark:text-slate-200">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterYear || "all"}
                  onValueChange={(v) => {
                    setFilterYear(v === "all" ? "" : v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder={t("payroll.year")} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="all" className="dark:text-slate-200">{t("payroll.year")}</SelectItem>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)} className="dark:text-slate-200">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterStatus || "all"}
                  onValueChange={(v) => {
                    setFilterStatus(v === "all" ? "" : v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder={t("payroll.filterByStatus")} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="all" className="dark:text-slate-200">
                      {t("payroll.allStatuses")}
                    </SelectItem>
                    <SelectItem value="draft" className="dark:text-slate-200">
                      {t("payroll.statuses.draft")}
                    </SelectItem>
                    <SelectItem value="finalised" className="dark:text-slate-200">
                      {t("payroll.statuses.finalised")}
                    </SelectItem>
                    <SelectItem value="paid" className="dark:text-slate-200">
                      {t("payroll.statuses.paid")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterMonth("");
                    setFilterYear("");
                    setFilterStatus("");
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("common.clearFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedIds.size > 0 && (
            <Card className="border-blue-200 bg-blue-50 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/30">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedIds.size} draft payroll record(s) selected
                </p>
                <Button
                  size="sm"
                  onClick={handleFinaliseSelected}
                  disabled={submitting}
                  className="gap-2 sm:ml-auto"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {t("payroll.finaliseSelected")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Payroll Register
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Employee pay, deductions, employer contributions, and workflow state
                </p>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                {totalCount} total
              </Badge>
            </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <FileText className="mx-auto h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-950 dark:text-white">
                  No payroll records found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {filterMonth || filterYear || filterStatus
                    ? "Try adjusting your filters."
                    : "Generate payroll records for all employees, or create an individual record."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/payroll/generate")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Generate Payroll
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Individual Record
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Table className="min-w-[1180px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/70 dark:hover:bg-slate-900/70">
                      <TableHead className="w-10 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={
                            records.length > 0 &&
                            selectedIds.size === records.length
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 dark:border-slate-500"
                        />
                      </TableHead>
                      <TableHead className="dark:text-slate-200">{t("payroll.employeeName")}</TableHead>
                      <TableHead className="dark:text-slate-200">{t("payroll.employeeId")}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("payroll.grossSalary")}
                      </TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("payroll.paye")}
                      </TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("payroll.rssbEmployee")}
                      </TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("payroll.rssbEmployer")}
                      </TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("payroll.netPay")}
                      </TableHead>
                      <TableHead className="dark:text-slate-200">{t("payroll.status")}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record._id} className="dark:border-slate-800">
                        <TableCell>
                          {canFinalise(record) && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(record._id)}
                              onChange={() => toggleSelect(record._id)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-500"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {record.employee.firstName?.charAt(0) || ""}
                              {record.employee.lastName?.charAt(0) || ""}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-950 dark:text-white">
                                {record.employee.firstName} {record.employee.lastName}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {record.employee.department || record.employee.position || "Payroll employee"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-slate-400">
                          {record.employee.employeeId}
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-200">
                          {formatCurrency(record.salary.grossSalary)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          {formatCurrency(record.deductions.paye)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 dark:text-orange-400">
                          {formatCurrency(
                            record.deductions.rssbEmployeePension +
                              record.deductions.rssbEmployeeMaternity,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400">
                          {formatCurrency(
                            (record.contributions?.rssbEmployerPension || 0) +
                              (record.contributions?.rssbEmployerMaternity ||
                                0),
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(record.netPay)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/payroll/${record._id}`)}
                              title="View"
                              className="dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit(record) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/payroll/${record._id}/edit`)
                                }
                                title="Edit"
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete(record) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete"
                                className="dark:text-red-400 dark:hover:bg-slate-700"
                              >
                                <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground dark:text-slate-400">
                    Showing {(currentPage - 1) * limit + 1} to{" "}
                    {Math.min(currentPage * limit, totalCount)} of {totalCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="dark:border-slate-600 dark:text-slate-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm dark:text-slate-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="dark:border-slate-600 dark:text-slate-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select
                      value={limit.toString()}
                      onValueChange={(v) => {
                        setLimit(parseInt(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px] bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="10" className="dark:text-slate-200">10</SelectItem>
                        <SelectItem value="20" className="dark:text-slate-200">20</SelectItem>
                        <SelectItem value="50" className="dark:text-slate-200">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetCreateForm(); setShowCreateDialog(open); }}>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-slate-200 bg-slate-50 p-0 dark:border-slate-800 dark:bg-slate-950">
            <DialogHeader>
              <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900/70">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
                <Plus className="h-5 w-5 text-blue-500" />
                {t("payroll.newRecord")}
              </DialogTitle>
              <DialogDescription className="mt-1 dark:text-slate-400">
                Create a new payroll record. Select an employee from Employee Master or enter details manually.
              </DialogDescription>
              </div>
            </DialogHeader>
            <div className="space-y-4 px-6 py-5">
              {/* Employee Master Select */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                    <Users className="h-4 w-4" />{" "}
                    Select from Employee Master
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreateManualMode(!createManualMode);
                      if (!createManualMode) setSelectedEmployeeId(null);
                    }}
                    className="text-xs dark:text-slate-300"
                  >
                    {createManualMode ? "← Back to Employee Select" : "Enter manually instead"}
                  </Button>
                </div>
                {!createManualMode && (
                  <EmployeeSelect
                    value={selectedEmployeeId || undefined}
                    onChange={handleEmployeeSelect}
                    status="active"
                  />
                )}
                {selectedEmployeeId && !createManualMode && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Employee data auto-filled from master record. Salary will use current active salary unless overridden below.
                    </span>
                  </div>
                )}
              </div>

              {/* Employee Information */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 dark:text-white">
                  <Users className="h-4 w-4" />{" "}
                  {t("payroll.form.employeeInformation")}
                  {selectedEmployeeId && !createManualMode && (
                    <Badge variant="outline" className="ml-2 text-xs font-normal dark:border-slate-600 dark:text-slate-300">Read-only</Badge>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.firstName")} *</Label>
                    <Input
                      value={createForm.firstName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          firstName: e.target.value,
                        })
                      }
                      disabled={!!selectedEmployeeId && !createManualMode}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.lastName")} *</Label>
                    <Input
                      value={createForm.lastName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          lastName: e.target.value,
                        })
                      }
                      disabled={!!selectedEmployeeId && !createManualMode}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.employeeId")} *</Label>
                    <Input
                      value={createForm.employeeId}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          employeeId: e.target.value,
                        })
                      }
                      disabled={!!selectedEmployeeId && !createManualMode}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.email")}</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.phone")}</Label>
                    <Input
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, phone: e.target.value })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.department")}</Label>
                    <Input
                      value={createForm.department}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          department: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.position")}</Label>
                    <Input
                      value={createForm.position}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          position: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.nationalId")}</Label>
                    <Input
                      value={createForm.nationalId}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          nationalId: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.employmentType")}</Label>
                    <Select
                      value={createForm.employmentType}
                      onValueChange={(v: any) =>
                        setCreateForm({ ...createForm, employmentType: v })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="full-time" className="dark:text-slate-200">
                          {t("payroll.form.employmentTypes.full-time")}
                        </SelectItem>
                        <SelectItem value="part-time" className="dark:text-slate-200">
                          {t("payroll.form.employmentTypes.part-time")}
                        </SelectItem>
                        <SelectItem value="contract" className="dark:text-slate-200">
                          {t("payroll.form.employmentTypes.contract")}
                        </SelectItem>
                        <SelectItem value="intern" className="dark:text-slate-200">
                          {t("payroll.form.employmentTypes.intern")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.bankName")}</Label>
                    <Input
                      value={createForm.bankName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          bankName: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.bankAccount")}</Label>
                    <Input
                      value={createForm.bankAccount}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          bankAccount: e.target.value,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 dark:text-white">
                  <FileText className="h-4 w-4" />{" "}
                  {t("payroll.form.periodInformation")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.payMonth")} *</Label>
                    <Select
                      value={String(createForm.month)}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, month: parseInt(v) })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)} className="dark:text-slate-200">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.payYear")} *</Label>
                    <Select
                      value={String(createForm.year)}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, year: parseInt(v) })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)} className="dark:text-slate-200">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 dark:text-white">
                  <DollarSign className="h-4 w-4" />{" "}
                  {t("payroll.form.salaryInformation")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.basicSalary")} *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.basicSalary || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          basicSalary: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.transportAllowance")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.transportAllowance || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          transportAllowance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.housingAllowance")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.housingAllowance || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          housingAllowance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">{t("payroll.form.otherAllowances")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.otherAllowances || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          otherAllowances: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Income (Rwanda-specific) */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 dark:text-white">
                  <TrendingUp className="h-4 w-4" /> Additional Income
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Overtime</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.overtime || ""}
                      onChange={(e) => setCreateForm({ ...createForm, overtime: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Bonuses</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.bonuses || ""}
                      onChange={(e) => setCreateForm({ ...createForm, bonuses: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Commissions</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.commissions || ""}
                      onChange={(e) => setCreateForm({ ...createForm, commissions: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Benefits in Kind (Taxable)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.benefitsInKind || ""}
                      onChange={(e) => setCreateForm({ ...createForm, benefitsInKind: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Deductions (Rwanda-specific) */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 dark:text-white">
                  <TrendingDown className="h-4 w-4" /> Other Deductions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Health Insurance</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.healthInsurance || ""}
                      onChange={(e) => setCreateForm({ ...createForm, healthInsurance: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Loan Repayments</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.loanDeductions || ""}
                      onChange={(e) => setCreateForm({ ...createForm, loanDeductions: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Other Deductions</Label>
                    <Input
                      type="number"
                      min="0"
                      value={createForm.otherDeductions || ""}
                      onChange={(e) => setCreateForm({ ...createForm, otherDeductions: parseFloat(e.target.value) || 0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="dark:text-slate-200">Occ. Hazard Rate (%)</Label>
                    <Input
                      type="number"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={createForm.occupationalHazardRate || 2.0}
                      onChange={(e) => setCreateForm({ ...createForm, occupationalHazardRate: parseFloat(e.target.value) || 2.0 })}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Fields */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 dark:text-white">
                  <Calculator className="h-4 w-4" />{" "}
                  {t("payroll.form.calculatedFields")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.grossSalaryCalc")}
                    </p>
                    <p className="text-lg font-bold dark:text-white">
                      {formatCurrency(calculations.grossSalary)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.payeCalc")}
                    </p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(calculations.paye)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.rssbEmployeeCalc")}
                    </p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(calculations.rssbEmployeePension)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.rssbEmployeeMaternityCalc")}
                    </p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(calculations.rssbEmployeeMaternity)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.totalDeductionsCalc")}
                    </p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">
                      {formatCurrency(calculations.totalDeductions)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.netPayCalc")}
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(calculations.netPay)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.rssbEmployerCalc")}
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(calculations.rssbEmployerPension)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("payroll.form.totalEmployerCostCalc")}
                    </p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(calculations.totalEmployerCost)}
                    </p>
                  </div>
                </div>
                {/* Tax brackets reference */}
                <div className="mt-3 pt-3 border-t dark:border-slate-600">
                  <p className="text-xs font-medium text-muted-foreground dark:text-slate-400 mb-1">
                    {t("payroll.form.taxBrackets")} (Rwanda 2025):
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground dark:text-slate-400">
                    <span>
                      0 - 60,000: <strong>0%</strong>
                    </span>
                    <span>
                      60,001 - 100,000: <strong>10%</strong>
                    </span>
                    <span>
                      100,001 - 200,000: <strong>20%</strong>
                    </span>
                    <span>
                      Above 200,000: <strong>30%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <Label className="dark:text-slate-200">{t("payroll.form.notes")}</Label>
                <Input
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Optional notes..."
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900/70">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("common.delete")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Are you sure you want to delete the payroll record for{" "}
                <strong>
                  {selectedRecord?.employee.firstName}{" "}
                  {selectedRecord?.employee.lastName}
                </strong>
                ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
          )}

          {activeTab === 'advances' && <PayrollAdvancesTab />}

          {activeTab === 'labor-cost' && (
            <div className="space-y-6">
              {/* Filters */}
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="flex flex-wrap gap-3 pt-6">
                  <Input type="number" placeholder="Year" value={lcYear} onChange={(e) => setLcYear(e.target.value)} className="w-32 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                  <Select value={lcMonth} onValueChange={setLcMonth}>
                    <SelectTrigger className="w-40 dark:bg-slate-900 dark:text-white dark:border-slate-700"><SelectValue placeholder="All months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All months</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{new Date(0, i).toLocaleString("en", { month: "long" })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={lcViewBy} onValueChange={setLcViewBy}>
                    <SelectTrigger className="w-48 dark:bg-slate-900 dark:text-white dark:border-slate-700"><SelectValue placeholder="View by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">By Employee</SelectItem>
                      <SelectItem value="department">By Department</SelectItem>
                      <SelectItem value="account">By Account</SelectItem>
                      <SelectItem value="trend">Trend Over Time</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" /> Total Direct Labor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Array.isArray(lcData) ? lcData.reduce((s: number, r: any) => s + (r.direct || 0), 0) : (lcData?.accounts?.find((a: any) => a.accountCode === '5300')?.amount || 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" /> Total Indirect Labor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(Array.isArray(lcData) ? lcData.reduce((s: number, r: any) => s + (r.indirect || 0), 0) : (lcData?.accounts?.find((a: any) => a.accountCode === '5400')?.amount || 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-600" /> Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{Array.isArray(lcData) ? lcData.length : (lcData?.accounts?.length || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Report Data */}
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Report Data</CardTitle>
                </CardHeader>
                <CardContent>
                  {lcLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                  ) : !lcData || (Array.isArray(lcData) && lcData.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <TrendingUp className="h-10 w-10 mb-2" />
                      <p>No data found</p>
                      <p className="text-xs mt-1">Try adjusting the year, month, or view filters</p>
                    </div>
                  ) : lcViewBy === "trend" ? (
                    <div className="divide-y dark:divide-slate-800">
                      {lcData.map((row: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <span className="font-medium text-slate-900 dark:text-white">{row.period}</span>
                          <div className="flex gap-6 text-sm">
                            <span className="text-emerald-600 dark:text-emerald-400">Direct: {formatCurrency(row.direct || 0)}</span>
                            <span className="text-blue-600 dark:text-blue-400">Indirect: {formatCurrency(row.indirect || 0)}</span>
                            <span className="text-slate-500 dark:text-slate-400">Gross: {formatCurrency(row.total_gross || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : lcViewBy === "account" ? (
                    <div className="space-y-2">
                      {lcData.accounts?.map((row: any) => (
                        <div key={row.accountCode} className="flex items-center justify-between py-3">
                          <span className="font-medium text-slate-900 dark:text-white">{row.accountCode} — {row.accountName}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(row.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-3 font-bold text-slate-900 dark:text-white border-t dark:border-slate-800">
                        <span>Total</span>
                        <span>{formatCurrency(lcData.total || 0)}</span>
                      </div>
                    </div>
                  ) : lcViewBy === "department" ? (
                    <div className="divide-y dark:divide-slate-800">
                      {lcData.map((row: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <span className="font-medium text-slate-900 dark:text-white">{row.department}</span>
                          <div className="flex gap-6 text-sm">
                            <span className="text-emerald-600 dark:text-emerald-400">Direct: {formatCurrency(row.direct || 0)}</span>
                            <span className="text-blue-600 dark:text-blue-400">Indirect: {formatCurrency(row.indirect || 0)}</span>
                            <span className="text-slate-500 dark:text-slate-400">{row.count} employees</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-slate-800">
                      {lcData.map((row: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white">{row.employee_name}</span>
                            <span className="ml-2 text-xs text-slate-400 capitalize">({row.labor_type || "—"})</span>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <span className="text-emerald-600 dark:text-emerald-400">Direct: {formatCurrency(row.direct || 0)}</span>
                            <span className="text-blue-600 dark:text-blue-400">Indirect: {formatCurrency(row.indirect || 0)}</span>
                            <span className="text-slate-500 dark:text-slate-400">Gross: {formatCurrency(row.gross || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="space-y-6">
              {tsShowForm ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setTsShowForm(false); setTsEditingId(null); }} className="dark:text-slate-300">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{tsEditingId ? "Edit Timesheet" : "New Timesheet"}</h2>
                  </div>

                  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Employee & Period</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 pt-2">
                      <div className="space-y-1">
                        <Label className="text-sm text-slate-600 dark:text-slate-400">Employee</Label>
                        <Select value={tsFormEmployeeId} onValueChange={setTsFormEmployeeId}>
                          <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700"><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {(tsFormEmployees || []).map((e: any) => (
                              <SelectItem key={e._id} value={e._id} className="dark:text-slate-200">{e.firstName} {e.lastName} ({e.employeeId})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-slate-600 dark:text-slate-400">Period</Label>
                        <Input type="month" value={tsFormPeriod} onChange={(e) => setTsFormPeriod(e.target.value)} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Work Entries</CardTitle>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Total: {tsTotalHours.toFixed(1)} hrs</span>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                      {tsFormLines.map((line, i) => (
                        <div key={i} className="grid gap-3 sm:grid-cols-5 items-end border p-3 rounded-md bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs text-slate-600 dark:text-slate-400">Date</Label>
                            <Input type="date" value={line.date} onChange={(e) => tsUpdateLine(i, "date", e.target.value)} className="dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                          </div>
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs text-slate-600 dark:text-slate-400">Hours</Label>
                            <Input type="number" min={0} max={24} step={0.5} value={line.hoursWorked} onChange={(e) => tsUpdateLine(i, "hoursWorked", e.target.value)} className="dark:bg-slate-800 dark:text-white dark:border-slate-700" />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs text-slate-600 dark:text-slate-400">Activity</Label>
                            <Select value={line.activityType} onValueChange={(v) => tsUpdateLine(i, "activityType", v)}>
                              <SelectTrigger className="dark:bg-slate-800 dark:text-white dark:border-slate-700"><SelectValue placeholder="Select activity" /></SelectTrigger>
                              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                                {TS_ACTIVITY_TYPES.map((a) => <SelectItem key={a.value} value={a.value} className="dark:text-slate-200">{a.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 sm:col-span-1">
                            <Button variant="outline" size="sm" className="flex-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => tsRemoveLine(i)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" onClick={tsAddLine} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Plus className="mr-2 h-4 w-4" /> Add Entry
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => { setTsShowForm(false); setTsEditingId(null); }} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
                    <Button onClick={() => tsSaveMutation.mutate()} disabled={tsSaveMutation.isPending || !tsFormEmployeeId} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                      {tsSaveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Timesheets</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Employee work hour tracking</p>
                    </div>
                    <Button onClick={() => { setTsEditingId(null); setTsShowForm(true); }} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                      <Plus className="mr-2 h-4 w-4" /> New Timesheet
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Input
                      type="month"
                      value={tsPeriod}
                      onChange={(e) => setTsPeriod(e.target.value)}
                      className="w-44 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                    />
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search employee..."
                        value={tsSearch}
                        onChange={(e) => setTsSearch(e.target.value)}
                        className="pl-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">All Timesheets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                      ) : tsItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                          <ClipboardList className="h-10 w-10 mb-2" />
                          <p>No timesheets found for this period</p>
                        </div>
                      ) : (
                        <div className="divide-y dark:divide-slate-800">
                          {tsItems.map((t: any) => (
                            <div key={t._id} className="flex items-center justify-between py-3 px-4 -mx-4 hover:bg-slate-50 dark:hover:bg-slate-900">
                              <div className="flex-1 cursor-pointer min-w-0" onClick={() => navigate(`/timesheets/${t._id}`)}>
                                <p className="font-medium text-slate-900 dark:text-white">{t.employeeName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.period?.monthName} {t.period?.year} • {t.totalHours} hrs total</p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs text-slate-500 hidden sm:inline dark:text-slate-400">{t.directHours || 0} direct / {t.indirectHours || 0} indirect</span>
                                <Badge className={tsStatusColors[t.status] || "bg-slate-100 dark:bg-slate-800 dark:text-slate-300"}>{t.status}</Badge>
                                {t.status === "draft" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 dark:text-slate-300" title="Edit" onClick={(e) => { e.stopPropagation(); setTsEditingId(t._id); setTsShowForm(true); }}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 dark:text-blue-400" title="Submit" onClick={(e) => { e.stopPropagation(); tsSubmit.mutate(t._id); }} disabled={tsSubmit.isPending}>
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {t.status === "submitted" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 dark:text-red-400" title="Reject" onClick={(e) => { e.stopPropagation(); tsReject.mutate(t._id); }} disabled={tsReject.isPending}>
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 dark:text-emerald-400" title="Approve" onClick={(e) => { e.stopPropagation(); tsApprove.mutate(t._id); }} disabled={tsApprove.isPending}>
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
      </div>
    </div>
    </Layout>
  );
}
