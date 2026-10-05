import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  payrollRunApi,
  chartOfAccountsApi,
  bankAccountsApi,
  PayrollRun,
  PayrollRunPreview,
  BankAccount,
  PayrollRecord,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  RotateCcw,
  FileText,
  DollarSign,
  Users,
  Building2,
  Eye,
  AlertCircle,
  Calendar,
  Info,
  Download,
  AlertTriangle,
  Plus,
  Play,
  TrendingDown,
  Shield,
  Banknote,
  Clock,
  Hash,
  CreditCard,
  BadgeCheck,
  Sparkles,
  History,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollAuditHistoryDialog } from "@/app/components/payroll/PayrollAuditHistoryDialog";

const localDateInputValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isCreateMode = !id;
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<PayrollRun | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<PayrollRunPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Post dialog
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reverse dialog
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState("");
  const [showRemitPayeDialog, setShowRemitPayeDialog] = useState(false);
  const [showRemitRssbDialog, setShowRemitRssbDialog] = useState(false);
  const [remitForm, setRemitForm] = useState({ remitted_date: "", reference_no: "", amount: "", evidence_reference: "", evidence_url: "" });
  const [showBankConfirmDialog, setShowBankConfirmDialog] = useState(false);
  const [bankConfirmForm, setBankConfirmForm] = useState({ confirmed_at: localDateInputValue(), transfer_reference: "", bank_statement_reference: "", evidence_reference: "", evidence_url: "" });
  const [filingType, setFilingType] = useState<"paye" | "rssb" | null>(null);
  const [filingForm, setFilingForm] = useState({ declaration_reference: "", evidence_reference: "", evidence_url: "", submitted_at: localDateInputValue() });

  const [chartAccounts, setChartAccounts] = useState<
    Array<{ _id: string; code: string; name: string; type: string }>
  >([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Available periods (months with finalised unprocessed records)
  const [availablePeriods, setAvailablePeriods] = useState<
    Array<{
      month: number;
      year: number;
      count: number;
      totalGross: number;
      totalNet: number;
    }>
  >([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<{
    month: number;
    year: number;
  } | null>(null);
  const [periodPayrollRecords, setPeriodPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loadingPeriodRecords, setLoadingPeriodRecords] = useState(false);
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<Set<string>>(new Set());

  const [createForm, setCreateForm] = useState({
    pay_period_start: "",
    pay_period_end: "",
    payment_date: "",
    period_month: 0,
    period_year: 0,
    salary_account_id: "",
    tax_payable_account_id: "",
    bank_account_id: "",
    other_deductions_account_id: "",
    notes: "",
  });

  useEffect(() => {
    if (id && !isCreateMode) {
      fetchRun();
    } else {
      setLoading(false);
      fetchAvailablePeriods();
    }
  }, [id]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchAvailablePeriods = async () => {
    setLoadingPeriods(true);
    try {
      const response = await payrollRunApi.getAvailablePeriods();
      if (response.success) {
        setAvailablePeriods(response.data || []);
      }
    } catch (error) {
      console.error(
        "[PayrollRunDetailPage] Failed to fetch available periods:",
        error,
      );
    } finally {
      setLoadingPeriods(false);
    }
  };

  const fetchPeriodPayrollRecords = async (month: number, year: number) => {
    setLoadingPeriodRecords(true);
    try {
      const response = await payrollRunApi.getAvailablePeriodRecords(year, month);
      if (response.success) {
        const records = response.data || [];
        setPeriodPayrollRecords(records);
        setSelectedPayrollIds(new Set(records.map((record) => record._id)));
      }
    } catch (error) {
      console.error("[PayrollRunDetailPage] Failed to fetch period payroll records:", error);
      toast.error("Failed to load employee payroll records for this period");
    } finally {
      setLoadingPeriodRecords(false);
    }
  };

  const fetchRun = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await payrollRunApi.getById(id);
      if (response.success) {
        setRun(response.data);
      }
    } catch (error) {
      console.error("[PayrollRunDetailPage] Failed to fetch:", error);
      toast.error(t("payroll.messages.runLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [accountsRes, bankRes] = await Promise.all([
        chartOfAccountsApi.getAll(),
        bankAccountsApi.getAll(),
      ]);
      if (accountsRes.success) setChartAccounts(accountsRes.data || []);
      if (bankRes.success) setBankAccounts(bankRes.data || []);
    } catch (error) {
      console.error(
        "[PayrollRunDetailPage] Failed to fetch dropdown data:",
        error,
      );
    }
  };

  const handlePreview = async () => {
    if (!run) return;
    setPreviewLoading(true);
    try {
      const salaryAccountId =
        typeof run.salary_account_id === "object"
          ? run.salary_account_id._id
          : run.salary_account_id;
      const taxAccountId =
        typeof run.tax_payable_account_id === "object"
          ? run.tax_payable_account_id._id
          : run.tax_payable_account_id;
      const bankAccountId =
        typeof run.bank_account_id === "object"
          ? run.bank_account_id._id
          : run.bank_account_id;
      const otherDedId = run.other_deductions_account_id
        ? typeof run.other_deductions_account_id === "object"
          ? run.other_deductions_account_id._id
          : run.other_deductions_account_id
        : undefined;

      const response = await payrollRunApi.preview({
        pay_period_start: run.pay_period_start,
        pay_period_end: run.pay_period_end,
        salary_account_id: salaryAccountId,
        tax_payable_account_id: taxAccountId,
        bank_account_id: bankAccountId,
        other_deductions_account_id: otherDedId,
      });
      if (response.success) {
        setPreview(response.data);
        setShowPreview(true);
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.previewFailed"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePost = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.post(run._id);
      if (response.success) {
        toast.success(t("payroll.messages.runPosted"));
        setShowPostDialog(false);
        fetchRun();
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.runPostFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemitPaye = async () => {
    try {
      setSubmitting(true);
      await payrollRunApi.remitPaye(id!, {
        remitted_date: remitForm.remitted_date || undefined,
        reference_no: remitForm.reference_no || undefined,
        evidence_reference: remitForm.evidence_reference,
        evidence_url: remitForm.evidence_url || undefined,
        amount: remitForm.amount ? parseFloat(remitForm.amount) : undefined,
      });
      toast.success("PAYE remitted successfully");
      setShowRemitPayeDialog(false);
      setRemitForm({ remitted_date: "", reference_no: "", amount: "", evidence_reference: "", evidence_url: "" });
      fetchRun();
    } catch (error: any) {
      toast.error(error?.message || "Failed to remit PAYE");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemitRssb = async () => {
    try {
      setSubmitting(true);
      await payrollRunApi.remitRssb(id!, {
        remitted_date: remitForm.remitted_date || undefined,
        reference_no: remitForm.reference_no || undefined,
        evidence_reference: remitForm.evidence_reference,
        evidence_url: remitForm.evidence_url || undefined,
        amount: remitForm.amount ? parseFloat(remitForm.amount) : undefined,
      });
      toast.success("RSSB contributions remitted successfully");
      setShowRemitRssbDialog(false);
      setRemitForm({ remitted_date: "", reference_no: "", amount: "", evidence_reference: "", evidence_url: "" });
      fetchRun();
    } catch (error: any) {
      toast.error(error?.message || "Failed to remit RSSB");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBankPayment = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      await payrollRunApi.confirmBankTransfer(run._id, { ...bankConfirmForm, amount: run.total_net });
      toast.success("Bank payment confirmation recorded");
      setShowBankConfirmDialog(false);
      fetchRun();
    } catch (error: any) { toast.error(error?.message || "Failed to confirm bank payment"); }
    finally { setSubmitting(false); }
  };

  const handleFilingExport = async (type: "paye" | "rssb") => {
    if (!run) return;
    try {
      const response = await payrollRunApi.exportStatutoryFiling(run._id, type);
      const blob = new Blob([response.data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = response.data.filename; anchor.click(); URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} filing export downloaded`);
    } catch (error: any) { toast.error(error?.message || "Could not export statutory filing"); }
  };

  const handleSubmitFiling = async () => {
    if (!run || !filingType) return;
    setSubmitting(true);
    try {
      await payrollRunApi.submitStatutoryFiling(run._id, filingType, filingForm);
      toast.success(`${filingType.toUpperCase()} filing evidence recorded`);
      setFilingType(null); fetchRun();
    } catch (error: any) { toast.error(error?.message || "Could not record filing evidence"); }
    finally { setSubmitting(false); }
  };

  const handleBankTransfer = async () => {
    try {
      setSubmitting(true);
      const response = await payrollRunApi.generateBankTransfer(id!);
      const data = response.data;
      // Generate CSV content
      const headers = ["Employee Name", "Employee ID", "Bank Name", "Bank Account", "Net Pay", "Currency"];
      const rows = data.records.map((r: any) => [
        r.employee_name,
        r.employee_id,
        r.bank_name,
        r.bank_account,
        r.net_pay.toString(),
        r.currency,
      ]);
      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bank-transfer-${data.reference_no}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Bank transfer file generated");
    } catch (error) {
      toast.error("Failed to generate bank transfer file");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.reverse(run._id, {
        reason: reversalReason || undefined,
      });
      if (response.success) {
        toast.success(t("payroll.messages.runReversed"));
        setShowReverseDialog(false);
        setReversalReason("");
        fetchRun();
      }
    } catch (error: any) {
      toast.error(error?.message || t("payroll.messages.runReverseFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPeriod = (month: number, year: number) => {
    setSelectedPeriod({ month, year });
    setPeriodPayrollRecords([]);
    setSelectedPayrollIds(new Set());
    fetchPeriodPayrollRecords(month, year);
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const paymentDateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-05`;
    setCreateForm((prev) => ({
      ...prev,
      pay_period_start: firstDay,
      pay_period_end: lastDayStr,
      payment_date: paymentDateStr,
      period_month: month,
      period_year: year,
    }));
  };

  const handleCreateFromRecords = async () => {
    if (!selectedPeriod) {
      toast.error("Please select a payroll period first");
      return;
    }
    if (periodPayrollRecords.length > 0 && selectedPayrollIds.size === 0) {
      toast.error("Please select at least one employee payroll record");
      return;
    }
    if (
      !createForm.payment_date ||
      !createForm.salary_account_id ||
      !createForm.tax_payable_account_id ||
      !createForm.bank_account_id
    ) {
      toast.error(
        "Please fill in all required fields (Payment Date, Bank Account, Salary Account, Tax Account)",
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await payrollRunApi.createFromRecords({
        pay_period_start: createForm.pay_period_start,
        pay_period_end: createForm.pay_period_end,
        payment_date: createForm.payment_date,
        period_month: selectedPeriod.month,
        period_year: selectedPeriod.year,
        employee_ids: Array.from(selectedPayrollIds),
        salary_account_id: createForm.salary_account_id,
        tax_payable_account_id: createForm.tax_payable_account_id,
        bank_account_id: createForm.bank_account_id,
        other_deductions_account_id:
          createForm.other_deductions_account_id || undefined,
        notes: createForm.notes || undefined,
      });
      if (response.success) {
        toast.success(
          t("payroll.messages.runCreated") ||
            "Payroll run created successfully",
        );
        navigate(`/payroll-runs/${response.data._id}`);
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("NO_FINALISED_RECORDS")) {
        toast.error(
          "No finalised payroll records found for this period. Please go to Payroll and finalise employee records first.",
        );
      } else if (msg.includes("PAYROLL_TOTALS_MISMATCH")) {
        toast.error(
          "Payroll totals do not balance. Please review the payroll records for this period.",
        );
      } else {
        toast.error(
          msg ||
            t("payroll.messages.runLoadFailed") ||
            "Failed to create payroll run",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: any }> = {
      draft: {
        className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500",
        icon: Clock,
      },
      posted: {
        className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
        icon: CheckCircle,
      },
      reversed: {
        className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
        icon: RotateCcw,
      },
    };
    const { className, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant="outline" className={`gap-1.5 ${className}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getAccountLabel = (account: any) => {
    if (!account) return "-";
    if (typeof account === "object")
      return `${account.code || ""} - ${account.name || ""}`;
    return account;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading payroll run...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Create-from-records page ─────────────────────────────
  if (!id) {
    const selectedPeriodData = selectedPeriod
      ? availablePeriods.find(
          (p) =>
            p.month === selectedPeriod.month && p.year === selectedPeriod.year,
        )
      : null;

    const totalAvailableGross = availablePeriods.reduce((s, p) => s + p.totalGross, 0);
    const totalAvailableEmployees = availablePeriods.reduce((s, p) => s + p.count, 0);
    const selectedRecords = periodPayrollRecords.filter((record) =>
      selectedPayrollIds.has(record._id),
    );
    const selectedGross = selectedRecords.reduce(
      (sum, record) => sum + (record.salary?.grossSalary || 0),
      0,
    );
    const selectedNet = selectedRecords.reduce(
      (sum, record) => sum + (record.netPay || 0),
      0,
    );

    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px] 2xl:max-w-[2200px] space-y-6">
            {/* Hero Header */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="grid gap-5 p-5 xl:grid-cols-[1fr_380px] xl:items-stretch">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/payroll-runs")}
                      className="h-9 w-9 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                      Create Payroll Run
                    </h1>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                    Process finalised employee records into a payroll run. Select a period, configure accounts, and generate.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/payroll-runs")}
                      className="h-10 gap-2"
                    >
                      <Play className="h-4 w-4" />
                      All Payroll Runs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/payroll")}
                      className="h-10 gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Employee Records
                    </Button>
                  </div>
                </div>

                {/* Mini Stats */}
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-3">
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Periods</p>
                    <p className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {availablePeriods.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Employees</p>
                    <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                      {totalAvailableEmployees}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Gross</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {formatCurrency(totalAvailableGross)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Progress Indicator */}
              <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    !selectedPeriod
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  }`}>
                    {selectedPeriod ? <CheckCircle className="h-3 w-3" /> : <span className="h-4 w-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">1</span>}
                    Select Period
                  </div>
                  <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    selectedPeriod
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}>
                    <span className="h-4 w-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold dark:bg-indigo-600">2</span>
                    Configure &amp; Create
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 — Select Payroll Period */}
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Step 1 — Select Payroll Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPeriods ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    <span>Loading available periods…</span>
                  </div>
                ) : availablePeriods.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-8 text-center dark:border-amber-800/50 dark:bg-amber-950/20">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                      No Payroll Records Available
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-5 max-w-md mx-auto">
                      To generate a payroll run, you first need to create and finalise individual payroll records for your employees. A payroll run groups these existing records together.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => navigate("/payroll")}
                        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Go to Payroll Page — Create Records
                      </Button>
                      {hasPermission("payroll:admin") && <Button
                        variant="outline"
                        onClick={() => navigate("/payroll-runs")}
                        className="gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Runs
                      </Button>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {availablePeriods.length} period{availablePeriods.length !== 1 ? "s" : ""} with unprocessed finalised records:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {availablePeriods.map((p) => {
                        const isSelected =
                          selectedPeriod?.month === p.month &&
                          selectedPeriod?.year === p.year;
                        return (
                          <button
                            key={`${p.year}-${p.month}`}
                            onClick={() => handleSelectPeriod(p.month, p.year)}
                            className={`group text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100 dark:bg-indigo-900/20 dark:shadow-indigo-950/20 dark:border-indigo-400"
                                : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-slate-950 dark:text-white">
                                {MONTH_NAMES[p.month - 1]} {p.year}
                              </span>
                              {isSelected ? (
                                <CheckCircle className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-indigo-300 dark:border-slate-600 transition-colors" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Users className="h-3.5 w-3.5" />
                              {p.count} employee{p.count !== 1 ? "s" : ""}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-300">
                                Gross {formatCurrency(p.totalGross)}
                              </span>
                            </div>
                            <div className="mt-0.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              Net {formatCurrency(p.totalNet)}
                            </div>
                            {/* Mini progress bar */}
                            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isSelected
                                    ? "bg-indigo-500 dark:bg-indigo-400"
                                    : "bg-slate-300 dark:bg-slate-600"
                                }`}
                                style={{
                                  width: `${p.totalGross > 0 ? Math.max(Math.round((p.totalNet / p.totalGross) * 100), 10) : 0}%`,
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2 — Configure Run */}
            {selectedPeriod && (
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    Step 2 — Configure Run for {MONTH_NAMES[selectedPeriod.month - 1]} {selectedPeriod.year}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Selected period summary */}
                  {selectedPeriodData && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200/80 dark:border-indigo-700/50 text-sm">
                      <Info className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className="text-indigo-800 dark:text-indigo-300">
                        Will process <strong>{selectedPeriodData.count}</strong>{" "}
                        employee record{selectedPeriodData.count !== 1 ? "s" : ""}{" "}
                        &nbsp;·&nbsp; Gross{" "}
                        <strong>{formatCurrency(selectedPeriodData.totalGross)}</strong>{" "}
                        &nbsp;·&nbsp; Net{" "}
                        <strong>{formatCurrency(selectedPeriodData.totalNet)}</strong>
                      </span>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Employees to Include
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Select all records or create this run for individual employees.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedPayrollIds(new Set(periodPayrollRecords.map((record) => record._id)))
                          }
                          disabled={loadingPeriodRecords || periodPayrollRecords.length === 0}
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayrollIds(new Set())}
                          disabled={loadingPeriodRecords || periodPayrollRecords.length === 0}
                        >
                          None
                        </Button>
                      </div>
                    </div>

                    {loadingPeriodRecords ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading employee records...
                      </div>
                    ) : periodPayrollRecords.length === 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        No unprocessed finalised employee records were found for this period.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {periodPayrollRecords.map((record) => {
                            const checked = selectedPayrollIds.has(record._id);
                            const employeeName = `${record.employee.firstName} ${record.employee.lastName}`;
                            return (
                              <label
                                key={record._id}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                                  checked
                                    ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    setSelectedPayrollIds((prev) => {
                                      const next = new Set(prev);
                                      if (value) next.add(record._id);
                                      else next.delete(record._id);
                                      return next;
                                    });
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-slate-900 dark:text-white">
                                    {employeeName}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {record.employee.employeeId} · Net {formatCurrency(record.netPay)}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div className="rounded-md bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                          Selected <strong>{selectedPayrollIds.size}</strong> of{" "}
                          <strong>{periodPayrollRecords.length}</strong> records · Gross{" "}
                          <strong>{formatCurrency(selectedGross)}</strong> · Net{" "}
                          <strong>{formatCurrency(selectedNet)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Pay Period & Payment Date
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">Pay Period Start</Label>
                        <Input
                          type="date"
                          value={createForm.pay_period_start}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, pay_period_start: e.target.value })
                          }
                          className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">Pay Period End</Label>
                        <Input
                          type="date"
                          value={createForm.pay_period_end}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, pay_period_end: e.target.value })
                          }
                          className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">Payment Date *</Label>
                        <Input
                          type="date"
                          value={createForm.payment_date}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, payment_date: e.target.value })
                          }
                          className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                        />
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Date salaries are disbursed
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Accounts */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      Account Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">Bank Account (Net Pay) *</Label>
                        <Select
                          value={createForm.bank_account_id}
                          onValueChange={(v) =>
                            setCreateForm({ ...createForm, bank_account_id: v })
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <SelectValue placeholder="Select bank account…" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {bankAccounts.map((ba) => (
                              <SelectItem key={ba._id} value={ba._id} className="dark:text-slate-200">
                                {ba.name}
                                {ba.bankName ? ` — ${ba.bankName}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Account to debit for net salaries
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">Salary Expense Account *</Label>
                        <Select
                          value={createForm.salary_account_id}
                          onValueChange={(v) =>
                            setCreateForm({ ...createForm, salary_account_id: v })
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <SelectValue placeholder="Select salary account…" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {chartAccounts
                              .filter((a) => a.type === "expense" || a.type === "cogs")
                              .map((a) => (
                                <SelectItem key={a._id} value={a._id} className="dark:text-slate-200">{a.code} — {a.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          e.g. 5400 Salaries & Wages
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">PAYE Tax Payable Account *</Label>
                        <Select
                          value={createForm.tax_payable_account_id}
                          onValueChange={(v) =>
                            setCreateForm({ ...createForm, tax_payable_account_id: v })
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <SelectValue placeholder="Select PAYE account…" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {chartAccounts
                              .filter((a) => a.type === "liability")
                              .map((a) => (
                                <SelectItem key={a._id} value={a._id} className="dark:text-slate-200">
                                  {a.code} — {a.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          e.g. 2230 PAYE Tax Payable
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 dark:text-slate-300">RSSB Deductions Account</Label>
                        <Select
                          value={createForm.other_deductions_account_id}
                          onValueChange={(v) =>
                            setCreateForm({
                              ...createForm,
                              other_deductions_account_id: v === "_none_" ? "" : v,
                            })
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <SelectValue placeholder="Select RSSB account (optional)…" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            <SelectItem value="_none_" className="dark:text-slate-200">— None —</SelectItem>
                            {chartAccounts
                              .filter((a) => a.type === "liability")
                              .map((a) => (
                                <SelectItem key={a._id} value={a._id} className="dark:text-slate-200">
                                  {a.code} — {a.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          e.g. 2240 RSSB Payable
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <Label className="text-slate-600 dark:text-slate-300">Notes (optional)</Label>
                    <Input
                      value={createForm.notes}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, notes: e.target.value })
                      }
                      placeholder="e.g. April 2026 salary run"
                      className="mt-1.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/payroll-runs")}
                      className="dark:border-slate-700 dark:text-slate-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateFromRecords}
                      disabled={
                        submitting ||
                        !hasPermission("payroll:create") ||
                        !createForm.bank_account_id ||
                        !createForm.salary_account_id ||
                        !createForm.tax_payable_account_id ||
                        !createForm.payment_date
                      }
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Create Payroll Run for {MONTH_NAMES[selectedPeriod.month - 1]}{" "}
                      {selectedPeriod.year}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Not found ─────────────────────────────
  if (!run) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px] 2xl:max-w-[2200px]">
            <div className="flex flex-col items-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <AlertCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white mb-2">Payroll Run Not Found</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">The payroll run you're looking for doesn't exist or has been removed.</p>
              <Button
                variant="outline"
                onClick={() => navigate("/payroll-runs")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Payroll Runs
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Detail view ─────────────────────────────
  const totalDeductions = run.total_tax + run.total_other_deductions;
  const isRunPreparer = String(typeof run.created_by === "object" ? run.created_by?._id : run.created_by || "") === String(user?._id || "");
  const rssbEmployerTotal = run.lines.reduce((s, l) => s + (l.rssb_employer_total || 0), 0);
  const totalCost = run.total_gross + rssbEmployerTotal;
  const netPayRate = run.total_gross > 0 ? Math.round((run.total_net / run.total_gross) * 100) : 0;
  const deductionRate = run.total_gross > 0 ? Math.round((totalDeductions / run.total_gross) * 100) : 0;
  const employerRate = run.total_gross > 0 ? Math.round((rssbEmployerTotal / run.total_gross) * 100) : 0;
  const payeRate = run.total_gross > 0 ? Math.round((run.total_tax / run.total_gross) * 100) : 0;
  const rssbEmpRate = run.total_gross > 0 ? Math.round((run.total_other_deductions / run.total_gross) * 100) : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/payroll-runs")}
                    className="h-9 w-9 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Play className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight font-mono text-slate-950 dark:text-white sm:text-3xl">
                    {run.reference_no}
                  </h1>
                  {getStatusBadge(run.status)}
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  Pay period: {formatDate(run.pay_period_start)} — {formatDate(run.pay_period_end)} · Payment date: {formatDate(run.payment_date)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {run.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handlePreview}
                        disabled={previewLoading}
                        className="h-10 gap-2"
                      >
                        {previewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {t("payroll.run.previewJournal")}
                      </Button>
                      {hasPermission("payroll:post") && <Button
                        onClick={() => setShowPostDialog(true)}
                        disabled={isRunPreparer}
                        title={isRunPreparer ? "A different user must post this payroll run" : undefined}
                        className="h-10 gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {t("payroll.run.postRun")}
                      </Button>}
                    </>
                  )}
                  {run.status === "posted" && (
                    <>
                      {hasPermission("payroll:export") && (
                        <Button
                          variant="outline"
                          onClick={handleBankTransfer}
                          disabled={submitting}
                          className="h-10 gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export Bank Transfer
                        </Button>
                      )}
                      {hasPermission("payroll:admin") && <Button
                        variant="outline"
                        onClick={() => setShowReverseDialog(true)}
                        className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t("payroll.run.reverseRun")}
                      </Button>}
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/payroll-runs")}
                    className="h-10 gap-2"
                  >
                    <Play className="h-4 w-4" />
                    All Runs
                  </Button>
                  {hasPermission("payroll:read") && <Button variant="outline" onClick={() => setShowAudit(true)} className="h-10 gap-2"><History className="h-4 w-4" />Audit history</Button>}
                </div>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net pay rate</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {netPayRate}%
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Deductions</p>
                  <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                    {deductionRate}%
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Employer load</p>
                  <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                    {employerRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregated Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("payroll.employees")}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {run.employee_count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Active employees in this run
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("payroll.totalGross")}
                    </p>
                    <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(run.total_gross)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Before taxes & deductions
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      PAYE + RSSB
                    </p>
                    <p className="mt-3 truncate text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(totalDeductions)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2.5 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Total statutory deductions
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("payroll.totalNet")}
                    </p>
                    <p className="mt-3 truncate text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(run.total_net)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <Banknote className="h-5 w-5" />
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
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Gross + employer RSSB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Burden Mix + Run Info */}
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
                    <span className="text-slate-600 dark:text-slate-300">PAYE Tax</span>
                    <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(run.total_tax)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${Math.min(payeRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">RSSB Employee</span>
                    <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(run.total_other_deductions)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-orange-500 transition-all duration-500"
                      style={{ width: `${Math.min(rssbEmpRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-300">RSSB Employer</span>
                      <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400">6150 / 2310</Badge>
                    </div>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(rssbEmployerTotal)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(employerRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Net Pay (Take-home)</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(run.total_net)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(netPayRate, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Run Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Payment Date</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {formatDate(run.payment_date)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(run.status)}
                  </div>
                </div>
                {run.journal_entry_id && (
                  <div className="col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Linked Journal Entry
                    </p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono dark:border-slate-600 dark:text-slate-200">
                        {typeof run.journal_entry_id === "object"
                          ? (run.journal_entry_id as any).entryNumber
                          : run.journal_entry_id}
                      </Badge>
                      {run.posted_by && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          by {typeof run.posted_by === "object"
                            ? (run.posted_by as any).name
                            : run.posted_by}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {run.notes && (
                  <div className="col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Notes</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{run.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account References */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <Building2 className="h-4 w-4 text-slate-500" />
                Account References
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bank Account</p>
                  </div>
                  <p className="font-medium text-sm text-slate-950 dark:text-white truncate">
                    {getAccountLabel(run.bank_account_id)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Salary Expense</p>
                  </div>
                  <p className="font-medium text-sm text-slate-950 dark:text-white truncate">
                    {getAccountLabel(run.salary_account_id)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-3.5 w-3.5 text-red-500" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tax Payable</p>
                  </div>
                  <p className="font-medium text-sm text-slate-950 dark:text-white truncate">
                    {getAccountLabel(run.tax_payable_account_id)}
                  </p>
                </div>
                {run.other_deductions_account_id && (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="h-3.5 w-3.5 text-orange-500" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Other Deductions</p>
                    </div>
                    <p className="font-medium text-sm text-slate-950 dark:text-white truncate">
                      {getAccountLabel(run.other_deductions_account_id)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Remittance & Compliance */}
          {run.status === "posted" && (
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Remittance & Compliance
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Track PAYE and RSSB remittances to RRA / RSSB
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">Salary bank payment</span>
                    <Badge variant={run.bank_transfer?.status === "confirmed" ? "default" : "secondary"}>{run.bank_transfer?.status === "confirmed" ? "Confirmed" : "Confirmation pending"}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">Due {formatDate(run.payment_date)} · Ledger payment is created when this run is posted; confirmation records the bank evidence.</p>
                  {run.bank_transfer?.status === "confirmed" && <p className="mt-1 text-slate-600 dark:text-slate-400">Ref: {run.bank_transfer.transfer_reference || "-"} · Evidence: {run.bank_transfer.evidence_reference || "-"}{run.bank_transfer.evidence_url && <> · <a className="underline" href={run.bank_transfer.evidence_url} target="_blank" rel="noreferrer">View</a></>}</p>}
                  {run.bank_transfer?.status !== "confirmed" && hasPermission("payroll:pay") && <Button size="sm" className="mt-2" onClick={() => setShowBankConfirmDialog(true)}>Confirm bank payment</Button>}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(["paye", "rssb"] as const).map((type) => {
                    const deadline = run.statutory_deadlines?.[type];
                    const filing = run.compliance?.filings?.[type];
                    const label = type.toUpperCase();
                    return <div key={type} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center justify-between"><span className="font-semibold">{label} filing</span><Badge variant={filing?.status === "submitted" ? "default" : deadline?.filing_status === "overdue" ? "destructive" : "secondary"}>{filing?.status === "submitted" ? "Filed" : deadline?.filing_status || "Pending"}</Badge></div>
                      <p className="mt-1 text-sm text-slate-500">Due {deadline?.due_date || "—"}{filing?.declaration_reference ? ` · Ref ${filing.declaration_reference}` : ""}</p>
                      {filing?.evidence_reference && <p className="text-sm text-slate-500">Evidence: {filing.evidence_reference}{filing.evidence_url && <> · <a className="underline" href={filing.evidence_url} target="_blank" rel="noreferrer">View document</a></>}</p>}
                      <p className="text-sm text-slate-500">Payment: {deadline?.payment_status || (run.remittance?.[type]?.remitted ? "complete" : "pending")} {deadline?.payment_reference ? `· Ref ${deadline.payment_reference}` : ""}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {hasPermission("payroll:export") && <Button size="sm" variant="outline" onClick={() => handleFilingExport(type)}>Export {label} CSV</Button>}
                        {filing?.status !== "submitted" && hasPermission("payroll:file") && <Button size="sm" variant="outline" onClick={() => { setFilingForm({ declaration_reference: "", evidence_reference: "", evidence_url: "", submitted_at: localDateInputValue() }); setFilingType(type); }}>Record filing evidence</Button>}
                      </div>
                    </div>;
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PAYE Remittance */}
                  <div className={`rounded-xl border-2 p-5 transition-all ${
                    run.remittance?.paye?.remitted
                      ? "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20"
                      : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          run.remittance?.paye?.remitted
                            ? "bg-green-100 dark:bg-green-900/40"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}>
                          {run.remittance?.paye?.remitted ? (
                            <BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-950 dark:text-white">PAYE</span>
                          <Badge
                            variant={run.remittance?.paye?.remitted ? "default" : "secondary"}
                            className={`ml-2 text-xs ${
                              run.remittance?.paye?.remitted
                                ? "bg-green-600 text-white dark:bg-green-500"
                                : ""
                            }`}
                          >
                            {run.remittance?.paye?.remitted ? "Remitted" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                      <p>Amount: <span className="font-semibold text-slate-950 dark:text-white">{formatCurrency(run.remittance?.paye?.amount || run.total_tax)}</span></p>
                      {run.remittance?.paye?.remitted && (
                        <>
                          <p>Date: {formatDate(run.remittance.paye.remitted_date)}</p>
                          <p>Ref: {run.remittance.paye.reference_no || "-"}</p>
                          <p>Evidence: {run.remittance.paye.evidence_reference || "-"}{run.remittance.paye.evidence_url && <> · <a className="underline" href={run.remittance.paye.evidence_url} target="_blank" rel="noreferrer">View</a></>}</p>
                        </>
                      )}
                    </div>
                    {!run.remittance?.paye?.remitted && hasPermission("payroll:remit") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2"
                        onClick={() => setShowRemitPayeDialog(true)}
                        disabled={(run.total_tax || 0) > 0 && run.compliance?.filings?.paye?.status !== "submitted"}
                      >
                        <CheckCircle className="h-4 w-4" />
                        {run.compliance?.filings?.paye?.status === "submitted" || (run.total_tax || 0) === 0 ? "Record PAYE payment" : "File PAYE before payment"}
                      </Button>
                    )}
                  </div>

                  {/* RSSB Remittance */}
                  <div className={`rounded-xl border-2 p-5 transition-all ${
                    run.remittance?.rssb?.remitted
                      ? "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20"
                      : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          run.remittance?.rssb?.remitted
                            ? "bg-green-100 dark:bg-green-900/40"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}>
                          {run.remittance?.rssb?.remitted ? (
                            <BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-950 dark:text-white">RSSB</span>
                          <Badge
                            variant={run.remittance?.rssb?.remitted ? "default" : "secondary"}
                            className={`ml-2 text-xs ${
                              run.remittance?.rssb?.remitted
                                ? "bg-green-600 text-white dark:bg-green-500"
                                : ""
                            }`}
                          >
                            {run.remittance?.rssb?.remitted ? "Remitted" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                      <p>Amount: <span className="font-semibold text-slate-950 dark:text-white">{formatCurrency(
                        run.remittance?.rssb?.amount ||
                        run.lines.reduce((s, l) => s + (l.rssb_employee_total || 0) + (l.rssb_employer_total || 0), 0)
                      )}</span></p>
                      {run.remittance?.rssb?.remitted && (
                        <>
                          <p>Date: {formatDate(run.remittance.rssb.remitted_date)}</p>
                          <p>Ref: {run.remittance.rssb.reference_no || "-"}</p>
                          <p>Evidence: {run.remittance.rssb.evidence_reference || "-"}{run.remittance.rssb.evidence_url && <> · <a className="underline" href={run.remittance.rssb.evidence_url} target="_blank" rel="noreferrer">View</a></>}</p>
                        </>
                      )}
                    </div>
                    {!run.remittance?.rssb?.remitted && hasPermission("payroll:remit") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2"
                        onClick={() => setShowRemitRssbDialog(true)}
                        disabled={run.compliance?.filings?.rssb?.status !== "submitted"}
                      >
                        <CheckCircle className="h-4 w-4" />
                        {run.compliance?.filings?.rssb?.status === "submitted" ? "Record RSSB payment" : "File RSSB before payment"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Lines Table */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Users className="h-4 w-4 text-blue-500" />
                  {t("payroll.run.employeeLines")}
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Individual employee pay breakdown for this payroll run
                </p>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex dark:border-slate-700 dark:text-slate-300">
                {run.employee_count} employees
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {preview?.workflow?.length ? (
                <div className="space-y-4">
                  {(preview?.workflow || []).map((entry) => {
                    const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
                    const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
                    return (
                      <div key={entry.step} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2 dark:bg-slate-800">
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">{entry.title}</p>
                          <Badge
                            variant={Math.abs(totalDebit - totalCredit) < 0.01 ? "default" : "destructive"}
                            className={Math.abs(totalDebit - totalCredit) < 0.01 ? "bg-green-600 dark:bg-green-500" : ""}
                          >
                            {Math.abs(totalDebit - totalCredit) < 0.01 ? "Balanced" : "Not balanced"}
                          </Badge>
                        </div>
                        <div className="space-y-2 p-3 xl:hidden">{entry.lines.map((line, i) => <article key={`${entry.step}-mobile-${i}`} className="rounded-lg border p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{line.accountCode}</p><p className="mt-1 break-words text-sm font-medium">{line.accountName}</p><p className="mt-1 break-words text-xs text-muted-foreground">{line.description}</p></div></div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs dark:border-slate-700"><div className="text-muted-foreground">Debit<p className="mt-1 text-sm font-medium text-foreground">{line.debit > 0 ? formatCurrency(line.debit) : "—"}</p></div><div className="text-muted-foreground">Credit<p className="mt-1 text-sm font-medium text-foreground">{line.credit > 0 ? formatCurrency(line.credit) : "—"}</p></div></div></article>)}<div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><div className="text-muted-foreground">Total debit<p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(totalDebit)}</p></div><div className="text-muted-foreground">Total credit<p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(totalCredit)}</p></div></div></div>
                        <div className="hidden overflow-x-auto xl:block"><Table>
                          <TableHeader>
                            <TableRow className="dark:border-slate-700">
                              <TableHead className="dark:text-slate-200">{t("payroll.run.accountCode")}</TableHead>
                              <TableHead className="dark:text-slate-200">{t("payroll.run.accountName")}</TableHead>
                              <TableHead className="dark:text-slate-200">{t("payroll.run.description")}</TableHead>
                              <TableHead className="text-right dark:text-slate-200">{t("payroll.run.debit")}</TableHead>
                              <TableHead className="text-right dark:text-slate-200">{t("payroll.run.credit")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entry.lines.map((line, i) => (
                              <TableRow key={`${entry.step}-${i}`} className="dark:border-slate-700">
                                <TableCell className="font-mono dark:text-slate-200">{line.accountCode}</TableCell>
                                <TableCell className="dark:text-slate-300">{line.accountName}</TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">{line.description}</TableCell>
                                <TableCell className="text-right dark:text-slate-200">{line.debit > 0 ? formatCurrency(line.debit) : "-"}</TableCell>
                                <TableCell className="text-right dark:text-slate-200">{line.credit > 0 ? formatCurrency(line.credit) : "-"}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-bold dark:bg-slate-800">
                              <TableCell colSpan={3} className="dark:text-white">TOTAL</TableCell>
                              <TableCell className="text-right dark:text-white">{formatCurrency(totalDebit)}</TableCell>
                              <TableCell className="text-right dark:text-white">{formatCurrency(totalCredit)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <>
              <div className="space-y-3 p-3 xl:hidden">{run.lines.map((line, index) => <article key={`employee-mobile-${index}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{line.employee_name}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{line.employee_id}</p></div><span className="shrink-0 text-right text-xs text-muted-foreground">Net pay<p className="mt-1 text-sm font-semibold text-emerald-600">{formatCurrency(line.net_pay)}</p></span></div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs dark:border-slate-700"><div className="text-muted-foreground">Gross<p className="mt-1 text-sm text-foreground">{formatCurrency(line.gross_salary)}</p></div><div className="text-muted-foreground">PAYE<p className="mt-1 text-sm text-red-600">{formatCurrency(line.tax_deduction)}</p></div><div className="text-muted-foreground">Employee RSSB<p className="mt-1 text-sm text-orange-600">{formatCurrency(line.rssb_employee_total)}</p></div><div className="text-muted-foreground">Employer RSSB<p className="mt-1 text-sm text-blue-600">{formatCurrency(line.rssb_employer_total)}</p></div></div></article>)}<div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><p className="font-semibold">Run totals</p><div className="mt-2 grid grid-cols-2 gap-3"><span className="text-muted-foreground">Gross<b className="mt-1 block text-sm text-foreground">{formatCurrency(run.total_gross)}</b></span><span className="text-muted-foreground">PAYE<b className="mt-1 block text-sm text-red-600">{formatCurrency(run.total_tax)}</b></span><span className="text-muted-foreground">Employee RSSB<b className="mt-1 block text-sm text-orange-600">{formatCurrency(run.total_other_deductions)}</b></span><span className="text-muted-foreground">Employer RSSB<b className="mt-1 block text-sm text-blue-600">{formatCurrency(rssbEmployerTotal)}</b></span><span className="col-span-2 text-muted-foreground">Net pay<b className="mt-1 block text-sm text-emerald-600">{formatCurrency(run.total_net)}</b></span></div></div></div>
              <div className="hidden overflow-x-auto xl:block"><Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/70 dark:hover:bg-slate-900/70">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.lines.map((line, index) => (
                    <TableRow key={index} className="dark:border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {line.employee_name?.split(" ").map((n: string) => n.charAt(0)).join("").slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-950 dark:text-white">
                            {line.employee_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400">
                        {line.employee_id}
                      </TableCell>
                      <TableCell className="text-right dark:text-slate-200">
                        {formatCurrency(line.gross_salary)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {formatCurrency(line.tax_deduction)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 dark:text-orange-400">
                        {formatCurrency(line.rssb_employee_total)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(line.rssb_employer_total)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(line.net_pay)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-slate-50 font-bold dark:bg-slate-900/70 border-t-2 border-slate-300 dark:border-slate-600">
                    <TableCell colSpan={2} className="text-slate-950 dark:text-white">
                      <span className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        TOTAL
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-950 dark:text-white">
                      {formatCurrency(run.total_gross)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatCurrency(run.total_tax)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">
                      {formatCurrency(run.total_other_deductions)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400">
                      {formatCurrency(rssbEmployerTotal)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(run.total_net)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table></div>
              </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Dialogs ═══ */}

      {/* Journal Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t("payroll.run.journalPreview")}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Preview of journal entry that will be created when posting.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="max-h-[calc(90vh-9rem)] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-slate-500 dark:text-slate-400">Employees</p>
                  <p className="font-bold dark:text-white">{preview.employeeCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-slate-500 dark:text-slate-400">Total Debit</p>
                  <p className="font-bold dark:text-white">
                    {formatCurrency(preview.lines.reduce((s, l) => s + l.debit, 0))}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-slate-500 dark:text-slate-400">Total Credit</p>
                  <p className="font-bold dark:text-white">
                    {formatCurrency(preview.lines.reduce((s, l) => s + l.credit, 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={preview.isBalanced ? "default" : "destructive"}
                  className={preview.isBalanced ? "bg-green-600 dark:bg-green-500" : ""}
                >
                  {preview.isBalanced
                    ? t("payroll.run.balanced")
                    : t("payroll.run.notBalanced")}
                </Badge>
              </div>
              <div className="space-y-2 xl:hidden">{preview.lines.map((line, i) => <article key={`journal-mobile-${i}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="font-mono text-xs text-muted-foreground">{line.accountCode}</p><p className="mt-1 break-words text-sm font-medium">{line.accountName}</p><p className="mt-1 break-words text-xs text-muted-foreground">{line.description}</p><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs dark:border-slate-700"><div className="text-muted-foreground">Debit<p className="mt-1 text-sm font-medium text-foreground">{line.debit > 0 ? formatCurrency(line.debit) : "—"}</p></div><div className="text-muted-foreground">Credit<p className="mt-1 text-sm font-medium text-foreground">{line.credit > 0 ? formatCurrency(line.credit) : "—"}</p></div></div></article>)}<div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><div className="text-muted-foreground">Total debit<p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(preview.lines.reduce((s, l) => s + l.debit, 0))}</p></div><div className="text-muted-foreground">Total credit<p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(preview.lines.reduce((s, l) => s + l.credit, 0))}</p></div></div></div>
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 xl:block">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="dark:border-slate-700">
                      <TableHead className="w-28 dark:text-slate-200">{t("payroll.run.accountCode")}</TableHead>
                      <TableHead className="w-64 dark:text-slate-200">{t("payroll.run.accountName")}</TableHead>
                      <TableHead className="min-w-[320px] dark:text-slate-200">{t("payroll.run.description")}</TableHead>
                      <TableHead className="w-36 text-right dark:text-slate-200">
                        {t("payroll.run.debit")}
                      </TableHead>
                      <TableHead className="w-36 text-right dark:text-slate-200">
                        {t("payroll.run.credit")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.lines.map((line, i) => (
                      <TableRow key={i} className="dark:border-slate-700">
                        <TableCell className="font-mono dark:text-slate-200">
                          {line.accountCode}
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{line.accountName}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {line.description}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right dark:text-slate-200">
                          {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right dark:text-slate-200">
                          {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-slate-50 dark:bg-slate-800">
                      <TableCell colSpan={3} className="dark:text-white">TOTAL</TableCell>
                      <TableCell className="whitespace-nowrap text-right dark:text-white">
                        {formatCurrency(preview.lines.reduce((s, l) => s + l.debit, 0))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right dark:text-white">
                        {formatCurrency(preview.lines.reduce((s, l) => s + l.credit, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} className="dark:border-slate-700 dark:text-slate-200">
              {t("common.close")}
            </Button>
            {run.status === "draft" && (
              <Button
                onClick={() => {
                  setShowPreview(false);
                  setShowPostDialog(true);
                }}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                {t("payroll.run.postRun")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Confirmation Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t("payroll.run.postConfirmTitle")}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {t("payroll.run.postConfirmMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPostDialog(false)}
              className="dark:border-slate-700 dark:text-slate-200"
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handlePost} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("payroll.run.postRun")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Confirmation Dialog */}
      <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t("payroll.run.reverseConfirmTitle")}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {t("payroll.run.reverseConfirmMessage")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label className="dark:text-slate-200">{t("payroll.run.reversalReason")}</Label>
              <Input
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Enter reason for reversal..."
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReverseDialog(false)}
              className="dark:border-slate-700 dark:text-slate-200"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("payroll.run.reverseRun")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remit PAYE Dialog */}
      <Dialog open={showRemitPayeDialog} onOpenChange={setShowRemitPayeDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Mark PAYE as Remitted</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Record PAYE remittance to RRA for this payroll run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="dark:text-slate-200">Remittance Date</Label>
              <Input
                type="date"
                value={remitForm.remitted_date}
                onChange={(e) => setRemitForm({ ...remitForm, remitted_date: e.target.value })}
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="space-y-1">
              <Label className="dark:text-slate-200">Reference / Receipt No</Label>
              <Input
                placeholder="e.g. RRA-123456"
                value={remitForm.reference_no}
                onChange={(e) => setRemitForm({ ...remitForm, reference_no: e.target.value })}
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="space-y-1"><Label className="dark:text-slate-200">Evidence reference (required)</Label><Input value={remitForm.evidence_reference} onChange={(e) => setRemitForm({ ...remitForm, evidence_reference: e.target.value })} placeholder="Receipt or uploaded document ID" /></div>
            <div className="space-y-1"><Label className="dark:text-slate-200">Evidence URL (optional)</Label><Input type="url" value={remitForm.evidence_url} onChange={(e) => setRemitForm({ ...remitForm, evidence_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1">
              <Label className="dark:text-slate-200">Amount (RWF)</Label>
              <Input
                type="number"
                placeholder={run?.total_tax?.toString()}
                value={remitForm.amount}
                onChange={(e) => setRemitForm({ ...remitForm, amount: e.target.value })}
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">Leave blank to use run total: {formatCurrency(run?.total_tax)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemitPayeDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRemitPaye} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Remittance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remit RSSB Dialog */}
      <Dialog open={showRemitRssbDialog} onOpenChange={setShowRemitRssbDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Mark RSSB as Remitted</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Record RSSB contribution remittance for this payroll run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="dark:text-slate-200">Remittance Date</Label>
              <Input
                type="date"
                value={remitForm.remitted_date}
                onChange={(e) => setRemitForm({ ...remitForm, remitted_date: e.target.value })}
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="space-y-1">
              <Label className="dark:text-slate-200">Reference / Receipt No</Label>
              <Input
                placeholder="e.g. RSSB-789012"
                value={remitForm.reference_no}
                onChange={(e) => setRemitForm({ ...remitForm, reference_no: e.target.value })}
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="space-y-1"><Label className="dark:text-slate-200">Evidence reference (required)</Label><Input value={remitForm.evidence_reference} onChange={(e) => setRemitForm({ ...remitForm, evidence_reference: e.target.value })} placeholder="Receipt or uploaded document ID" /></div>
            <div className="space-y-1"><Label className="dark:text-slate-200">Evidence URL (optional)</Label><Input type="url" value={remitForm.evidence_url} onChange={(e) => setRemitForm({ ...remitForm, evidence_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1">
              <Label className="dark:text-slate-200">Amount (RWF)</Label>
              <Input
                type="number"
                value={remitForm.amount}
                onChange={(e) => setRemitForm({ ...remitForm, amount: e.target.value })}
                className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Total RSSB (Employee + Employer): {formatCurrency(
                  run?.lines?.reduce((s, l) => s + (l.rssb_employee_total || 0) + (l.rssb_employer_total || 0), 0) || 0
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemitRssbDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRemitRssb} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Remittance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showBankConfirmDialog} onOpenChange={setShowBankConfirmDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader><DialogTitle>Confirm salary bank payment</DialogTitle><DialogDescription>Enter the bank transfer reference and retain the payment evidence. Expected amount: {formatCurrency(run?.total_net || 0)}.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            <div><Label>Paid date</Label><Input type="date" value={bankConfirmForm.confirmed_at} onChange={(e) => setBankConfirmForm({ ...bankConfirmForm, confirmed_at: e.target.value })} /></div>
            <div><Label>Bank transfer reference</Label><Input value={bankConfirmForm.transfer_reference} onChange={(e) => setBankConfirmForm({ ...bankConfirmForm, transfer_reference: e.target.value })} /></div>
            <div><Label>Statement reference (optional)</Label><Input value={bankConfirmForm.bank_statement_reference} onChange={(e) => setBankConfirmForm({ ...bankConfirmForm, bank_statement_reference: e.target.value })} /></div>
            <div><Label>Evidence reference</Label><Input value={bankConfirmForm.evidence_reference} onChange={(e) => setBankConfirmForm({ ...bankConfirmForm, evidence_reference: e.target.value })} /></div>
            <div><Label>Evidence URL (optional)</Label><Input type="url" value={bankConfirmForm.evidence_url} onChange={(e) => setBankConfirmForm({ ...bankConfirmForm, evidence_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowBankConfirmDialog(false)}>Cancel</Button><Button onClick={handleConfirmBankPayment} disabled={submitting || !bankConfirmForm.transfer_reference || !bankConfirmForm.evidence_reference}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={filingType !== null} onOpenChange={(open) => !open && setFilingType(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader><DialogTitle>Record {filingType?.toUpperCase()} filing evidence</DialogTitle><DialogDescription>Download the generated CSV and submit it through the statutory portal, then record the portal reference and retained evidence.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            <div><Label>Submitted date</Label><Input type="date" value={filingForm.submitted_at} onChange={(e) => setFilingForm({ ...filingForm, submitted_at: e.target.value })} /></div>
            <div><Label>Declaration / portal reference</Label><Input value={filingForm.declaration_reference} onChange={(e) => setFilingForm({ ...filingForm, declaration_reference: e.target.value })} /></div>
            <div><Label>Evidence reference</Label><Input value={filingForm.evidence_reference} onChange={(e) => setFilingForm({ ...filingForm, evidence_reference: e.target.value })} /></div>
            <div><Label>Evidence URL (optional)</Label><Input type="url" value={filingForm.evidence_url} onChange={(e) => setFilingForm({ ...filingForm, evidence_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFilingType(null)}>Cancel</Button><Button onClick={handleSubmitFiling} disabled={submitting || !filingForm.declaration_reference || !filingForm.evidence_reference}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record filing</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <PayrollAuditHistoryDialog open={showAudit} onOpenChange={setShowAudit} entityType="payroll_run" entityId={run._id} title="Payroll run audit history" />
    </Layout>
  );
}
