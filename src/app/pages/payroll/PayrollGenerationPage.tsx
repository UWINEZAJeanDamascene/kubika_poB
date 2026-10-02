import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { useEmployees } from "@/lib/hooks/useEmployees";
import { useGeneratePayroll } from "@/lib/hooks/useEmployees";
import { payrollApi } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  Calculator,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  DollarSign,
  UserCheck,
  ChevronRight,
  Clock,
  History,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Separator } from "@/app/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollAuditHistoryDialog } from "@/app/components/payroll/PayrollAuditHistoryDialog";

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

type PayrollInputDraft = {
  scheduledDays: number; workedDays: number; paidLeaveDays: number; unpaidLeaveDays: number;
  overtime: number; bonuses: number; commissions: number; benefitsInKind: number;
  healthInsurance: number; loanDeductions: number; otherDeductions: number;
  id?: string; status?: "draft" | "approved" | "applied"; enteredById?: string | null; approvedById?: string | null;
};

function defaultPayrollInput(month: number, year: number): PayrollInputDraft {
  let workDays = 0;
  const days = new Date(year, month, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday !== 0 && weekday !== 6) workDays += 1;
  }
  return { scheduledDays: workDays, workedDays: workDays, paidLeaveDays: 0, unpaidLeaveDays: 0, overtime: 0, bonuses: 0, commissions: 0, benefitsInKind: 0, healthInsurance: 0, loanDeductions: 0, otherDeductions: 0 };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface StepProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, label, active, completed }: StepProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          completed
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            : active
            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
        }`}
      >
        {completed ? <CheckCircle className="h-4 w-4" /> : number}
      </div>
      <span
        className={`text-sm font-medium ${
          active || completed
            ? "text-slate-900 dark:text-white"
            : "text-slate-400 dark:text-slate-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function PayrollGenerationPage() {
  const navigate = useNavigate();
  const { data: employees, isLoading } = useEmployees({ status: "active", limit: 100 });
  const generateMutation = useGeneratePayroll();
  const { user, hasPermission } = useAuth();

  const [step, setStep] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [results, setResults] = useState<any>(null);
  const [payrollInputs, setPayrollInputs] = useState<Record<string, PayrollInputDraft>>({});
  const [inputBusyEmployeeId, setInputBusyEmployeeId] = useState<string | null>(null);
  const [auditInputId, setAuditInputId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!searchFilter.trim()) return employees;
    const q = searchFilter.toLowerCase();
    return employees.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q))
    );
  }, [employees, searchFilter]);

  // Auto-select all when toggling selectAll
  useEffect(() => {
    if (selectAll && filteredEmployees) {
      setSelectedIds(new Set(filteredEmployees.map((e) => e._id)));
    } else if (!selectAll) {
      setSelectedIds(new Set());
    }
  }, [selectAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const eligibleEmployees = useMemo(() => {
    return filteredEmployees.filter((e) => e.currentSalary && e.currentSalary.basicSalary > 0);
  }, [filteredEmployees]);

  const ineligibleEmployees = useMemo(() => {
    return filteredEmployees.filter((e) => !e.currentSalary || e.currentSalary.basicSalary <= 0);
  }, [filteredEmployees]);

  const selectedCount = selectedIds.size;
  const selectedEmployeeRows = (employees || []).filter((employee) => selectedIds.has(employee._id) && employee.currentSalary && employee.currentSalary.basicSalary > 0);
  const estimatedGross = useMemo(() => {
    if (!employees) return 0;
    let total = 0;
    employees.forEach((e) => {
      if (selectedIds.has(e._id) && e.currentSalary) {
        total +=
          e.currentSalary.basicSalary +
          e.currentSalary.transportAllowance +
          e.currentSalary.housingAllowance +
          e.currentSalary.otherAllowances;
      }
    });
    return total;
  }, [employees, selectedIds]);

  const handleGenerate = useCallback(() => {
    if (selectedCount === 0) {
      toast.error("Select at least one employee");
      return;
    }
    const needsApproval = Array.from(selectedIds).find((employeeId) => {
      const input = payrollInputs[employeeId];
      return input && input.status !== "approved" && input.status !== "applied";
    });
    if (needsApproval) {
      toast.error("Approve each saved attendance and leave input before generating payroll");
      return;
    }
    generateMutation.mutate(
      {
        period: { month, year },
        employeeIds: Array.from(selectedIds),
      },
      {
        onSuccess: (res) => {
          setResults(res);
          setStep(3);
          toast.success(`Generated ${res.count} payroll records`);
        },
        onError: (err: any) => {
          toast.error(err.message || "Generation failed");
        },
      }
    );
  }, [selectedCount, month, year, selectedIds, generateMutation, payrollInputs]);

  const loadPeriodInputs = async () => {
    try {
      const response = await payrollApi.getPeriodInputs(month, year);
      const next: Record<string, PayrollInputDraft> = {};
      for (const input of response.data || []) {
        next[input.employeeId] = {
          ...defaultPayrollInput(month, year),
          scheduledDays: Number(input.scheduledDays), workedDays: Number(input.workedDays),
          paidLeaveDays: Number(input.paidLeaveDays), unpaidLeaveDays: Number(input.unpaidLeaveDays),
          overtime: Number(input.additionalIncome?.overtime || 0), bonuses: Number(input.additionalIncome?.bonuses || 0),
          commissions: Number(input.additionalIncome?.commissions || 0), benefitsInKind: Number(input.additionalIncome?.benefitsInKind || 0),
          healthInsurance: Number(input.deductions?.healthInsurance || 0), loanDeductions: Number(input.deductions?.loanDeductions || 0), otherDeductions: Number(input.deductions?.otherDeductions || 0),
          id: input.id, status: input.status, enteredById: input.enteredById, approvedById: input.approvedById,
        };
      }
      setPayrollInputs(next);
    } catch (error: any) { toast.error(error?.message || "Could not load period attendance inputs"); }
    setStep(2);
  };

  const updatePayrollInput = (employeeId: string, key: keyof PayrollInputDraft, value: number) => {
    setPayrollInputs((all) => ({ ...all, [employeeId]: { ...(all[employeeId] || defaultPayrollInput(month, year)), [key]: value } }));
  };

  const savePeriodInput = async (employeeId: string) => {
    const input = payrollInputs[employeeId] || defaultPayrollInput(month, year);
    if (input.status === "approved" || input.status === "applied") return input.id;
    setInputBusyEmployeeId(employeeId);
    try {
      const response = await payrollApi.savePeriodInput({
        employeeId, periodMonth: month, periodYear: year,
        scheduledDays: input.scheduledDays, workedDays: input.workedDays, paidLeaveDays: input.paidLeaveDays, unpaidLeaveDays: input.unpaidLeaveDays,
        additionalIncome: { overtime: input.overtime, bonuses: input.bonuses, commissions: input.commissions, benefitsInKind: input.benefitsInKind },
        deductions: { healthInsurance: input.healthInsurance, loanDeductions: input.loanDeductions, otherDeductions: input.otherDeductions },
      });
      setPayrollInputs((all) => ({ ...all, [employeeId]: { ...input, id: response.data.id, status: response.data.status as PayrollInputDraft["status"], enteredById: response.data.enteredById } }));
      return response.data.id;
    } catch (error: any) { toast.error(error?.message || "Could not save payroll inputs"); return undefined; }
    finally { setInputBusyEmployeeId(null); }
  };

  const approvePeriodInput = async (employeeId: string) => {
    const input = payrollInputs[employeeId] || defaultPayrollInput(month, year);
    if (input.status === "approved" || input.status === "applied") return;
    const id = input.id || await savePeriodInput(employeeId);
    if (!id) return;
    setInputBusyEmployeeId(employeeId);
    try {
      const response = await payrollApi.approvePeriodInput(id);
      setPayrollInputs((all) => ({ ...all, [employeeId]: { ...(all[employeeId] || input), id, status: response.data.status as PayrollInputDraft["status"], approvedById: response.data.approvedById } }));
      toast.success("Attendance and leave inputs approved");
    } catch (error: any) { toast.error(error?.message || "Could not approve payroll inputs"); }
    finally { setInputBusyEmployeeId(null); }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl 2xl:max-w-[1400px] space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/payroll")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Generate Payroll
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bulk-create payroll records from Employee Master for a selected period
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-4">
          <StepIndicator number={1} label="Select Period" active={step === 1} completed={step > 1} />
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <StepIndicator number={2} label="Choose Employees" active={step === 2} completed={step > 2} />
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <StepIndicator number={3} label="Results" active={step === 3} completed={false} />
        </div>

        {step === 1 && (
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Select Pay Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Month
                  </label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Year
                  </label>
                  <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Period:</span>{" "}
                  {MONTHS.find((m) => m.value === month)?.label} {year}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => void loadPeriodInputs()}
                  className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Next: Choose Employees
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <>
            {/* Summary bar */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Active Employees
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : employees?.length || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Selected
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {selectedCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Est. Total Gross
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    RWF {formatCurrency(estimatedGross)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filter employees by name, ID, or department..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Eligible table */}
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Eligible Employees
                    <Badge variant="secondary" className="ml-2">
                      {eligibleEmployees.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={(v) => setSelectAll(v as boolean)}
                      />
                      Select All
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Department</TableHead>
                        <TableHead className="font-semibold">Position</TableHead>
                        <TableHead className="text-right font-semibold">
                          Gross Salary
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          </TableRow>
                        ))
                      ) : eligibleEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-24 text-center text-slate-500 dark:text-slate-400"
                          >
                            No eligible employees found
                          </TableCell>
                        </TableRow>
                      ) : (
                        eligibleEmployees.map((emp) => {
                          const gross =
                            (emp.currentSalary?.basicSalary || 0) +
                            (emp.currentSalary?.transportAllowance || 0) +
                            (emp.currentSalary?.housingAllowance || 0) +
                            (emp.currentSalary?.otherAllowances || 0);
                          return (
                            <TableRow
                              key={emp._id}
                              className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                              onClick={() => toggleEmployee(emp._id)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(emp._id)}
                                  onCheckedChange={() => toggleEmployee(emp._id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {emp.firstName?.[0]}
                                    {emp.lastName?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {emp.firstName} {emp.lastName}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {emp.employeeId}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-300">
                                {emp.department || "—"}
                              </TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-300">
                                {emp.position || "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-900 dark:text-white">
                                RWF {formatCurrency(gross)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {selectedEmployeeRows.length > 0 && (
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Approved attendance, leave, and pay adjustments</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Enter scheduled, worked, paid leave, and unpaid leave days. Save and approve each employee’s inputs before generation; only approved inputs affect prorated pay.</p>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Employee</TableHead><TableHead>Scheduled</TableHead><TableHead>Worked</TableHead><TableHead>Paid leave</TableHead><TableHead>Unpaid leave</TableHead>
                      <TableHead>Overtime</TableHead><TableHead>Bonus</TableHead><TableHead>Commission</TableHead><TableHead>Benefits</TableHead><TableHead>Health deduction</TableHead><TableHead>Loan</TableHead><TableHead>Other deduction</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{selectedEmployeeRows.map((employee) => {
                      const input = payrollInputs[employee._id] || defaultPayrollInput(month, year);
                      const locked = input.status === "approved" || input.status === "applied";
                      const numberField = (key: keyof PayrollInputDraft, label: string) => <Input aria-label={`${employee.firstName} ${label}`} type="number" min="0" step="0.5" className="w-24" disabled={locked || inputBusyEmployeeId === employee._id} value={input[key] as number} onChange={(event) => updatePayrollInput(employee._id, key, Number(event.target.value) || 0)} />;
                      return <TableRow key={employee._id}>
                        <TableCell className="whitespace-nowrap font-medium">{employee.firstName} {employee.lastName}</TableCell>
                        <TableCell>{numberField("scheduledDays", "scheduled days")}</TableCell><TableCell>{numberField("workedDays", "worked days")}</TableCell><TableCell>{numberField("paidLeaveDays", "paid leave days")}</TableCell><TableCell>{numberField("unpaidLeaveDays", "unpaid leave days")}</TableCell>
                        <TableCell>{numberField("overtime", "overtime")}</TableCell><TableCell>{numberField("bonuses", "bonus")}</TableCell><TableCell>{numberField("commissions", "commission")}</TableCell><TableCell>{numberField("benefitsInKind", "benefits in kind")}</TableCell><TableCell>{numberField("healthInsurance", "health insurance deduction")}</TableCell><TableCell>{numberField("loanDeductions", "loan deduction")}</TableCell><TableCell>{numberField("otherDeductions", "other deduction")}</TableCell>
                        <TableCell><div className="capitalize">{input.status || "not saved"}</div>{input.enteredById && <div className="text-xs text-slate-500">Prepared by {input.enteredById}</div>}{input.approvedById && <div className="text-xs text-slate-500">Approved by {input.approvedById}</div>}</TableCell>
                        <TableCell><div className="flex gap-2">{input.id && <Button size="sm" variant="ghost" title="View immutable audit history" onClick={() => setAuditInputId(input.id!)}><History className="h-4 w-4" />Audit</Button>}<Button size="sm" variant="outline" disabled={locked || inputBusyEmployeeId === employee._id || !hasPermission("payroll:update")} onClick={() => void savePeriodInput(employee._id)}>{inputBusyEmployeeId === employee._id && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button><Button size="sm" disabled={locked || inputBusyEmployeeId === employee._id || !hasPermission("payroll:approve") || (!!input.enteredById && input.enteredById === user?._id)} title={input.enteredById === user?._id ? "A different user must approve inputs you prepared" : undefined} onClick={() => void approvePeriodInput(employee._id)}>{inputBusyEmployeeId === employee._id && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{input.status === "approved" || input.status === "applied" ? "Approved" : input.enteredById === user?._id ? "Waiting for another approver" : "Approve"}</Button></div></TableCell>
                      </TableRow>;
                    })}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Ineligible table */}
            {ineligibleEmployees.length > 0 && (
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Missing Salary
                    <Badge variant="secondary" className="ml-2">
                      {ineligibleEmployees.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                          <TableHead className="font-semibold">Employee</TableHead>
                          <TableHead className="font-semibold">Department</TableHead>
                          <TableHead className="font-semibold">Position</TableHead>
                          <TableHead className="text-right font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ineligibleEmployees.map((emp) => (
                          <TableRow
                            key={emp._id}
                            className="bg-amber-50/30 dark:bg-amber-950/10"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {emp.firstName?.[0]}
                                  {emp.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {emp.firstName} {emp.lastName}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {emp.employeeId}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-300">
                              {emp.department || "—"}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-300">
                              {emp.position || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/employees/${emp._id}`)}
                              >
                                Set Salary
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || selectedCount === 0 || !hasPermission("payroll:create")}
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {generateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Play className="mr-2 h-4 w-4" />
                Generate {selectedCount > 0 && `${selectedCount}`} Payroll
                {selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}

        {step === 3 && results && (
          <>
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Generation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
                    <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                      Created
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                      {results.count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
                    <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">
                      Errors
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
                      {results.errors?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                    <p className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
                      Period
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-100">
                      {MONTHS.find((m) => m.value === month)?.label} {year}
                    </p>
                  </div>
                </div>

                {results.errors && results.errors.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                        Errors & Skipped Records
                      </h3>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                        <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                          {results.errors.map((err: any, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                <span className="font-medium">{err.name}</span>{" "}
                                ({err.employeeId}): {err.reason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => { setStep(1); setResults(null); setSelectedIds(new Set()); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
              <Button
                onClick={() => navigate("/payroll")}
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Go to Payroll List
              </Button>
            </div>
          </>
        )}
      </div>
      <PayrollAuditHistoryDialog open={auditInputId !== null} onOpenChange={(open) => !open && setAuditInputId(null)} entityType="payroll_period_input" entityId={auditInputId || ""} title="Attendance and pay-input audit history" />
    </Layout>
  );
}
