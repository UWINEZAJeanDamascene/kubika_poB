import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { useEmployees, useDeleteEmployee } from "@/lib/hooks/useEmployees";
import type { Employee } from "@/lib/api";
import {
  Plus,
  RefreshCw,
  Search,
  Users,
  UserX,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  FilterX,
  UserCheck,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "terminated", label: "Terminated" },
];

const LIMIT_OPTIONS = [10, 20, 50];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300",
    inactive:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300",
    terminated:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <Badge
      variant="outline"
      className={`capitalize font-medium ${styles[status] || styles.inactive}`}
    >
      {status}
    </Badge>
  );
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "green" | "blue" | "violet" | "red";
  subtext?: string;
}

function SummaryCard({ title, value, icon, tone, subtext }: SummaryCardProps) {
  const toneMap = {
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {value}
            </p>
            {subtext && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {subtext}
              </p>
            )}
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${toneMap[tone]}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmployeesListPage() {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const params = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
      page: currentPage,
      limit,
    }),
    [statusFilter, searchQuery, currentPage, limit]
  );

  const { data: employees, isLoading, isFetching, refetch } = useEmployees(params);
  const deleteMutation = useDeleteEmployee();

  // Extract unique departments from loaded employees
  const departments = useMemo(() => {
    if (!employees) return [];
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Summary stats
  const stats = useMemo(() => {
    if (!employees) {
      return {
        total: 0,
        active: 0,
        terminated: 0,
        departments: 0,
        avgSalary: 0,
      };
    }
    const total = employees.length;
    const active = employees.filter((e) => e.status === "active").length;
    const terminated = employees.filter((e) => e.status === "terminated").length;
    const deptCount = new Set(employees.map((e) => e.department).filter(Boolean))
      .size;
    const salaries = employees
      .filter((e) => e.currentSalary)
      .map((e) =>
        (e.currentSalary?.basicSalary || 0) +
        (e.currentSalary?.transportAllowance || 0) +
        (e.currentSalary?.housingAllowance || 0) +
        (e.currentSalary?.otherAllowances || 0)
      );
    const avgSalary =
      salaries.length > 0
        ? salaries.reduce((a, b) => a + b, 0) / salaries.length
        : 0;
    return { total, active, terminated, departments: deptCount, avgSalary };
  }, [employees]);

  const handleDelete = useCallback(() => {
    if (!employeeToDelete) return;
    deleteMutation.mutate(employeeToDelete._id, {
      onSuccess: (res) => {
        toast.success(res.message || "Employee removed");
        setShowDeleteDialog(false);
        setEmployeeToDelete(null);
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to remove employee");
      },
    });
  }, [employeeToDelete, deleteMutation]);

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setDepartmentFilter("all");
    setCurrentPage(1);
  };

  const hasFilters = statusFilter !== "all" || searchQuery || departmentFilter !== "all";

  // Client-side department filter since API doesn't support it yet
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (departmentFilter === "all") return employees;
    return employees.filter((e) => e.department === departmentFilter);
  }, [employees, departmentFilter]);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Employee Master
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your employee roster, salary structures, and organizational details
            </p>
          </div>
          <div className="mobile-action-row grid grid-cols-1 gap-2 sm:flex sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/employees/new")}
              className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            title="Total Employees"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
            tone="blue"
            subtext={`${stats.active} active`}
          />
          <SummaryCard
            title="Active Staff"
            value={stats.active}
            icon={<UserCheck className="h-5 w-5" />}
            tone="green"
          />
          <SummaryCard
            title="Terminated"
            value={stats.terminated}
            icon={<UserX className="h-5 w-5" />}
            tone="red"
          />
          <SummaryCard
            title="Departments"
            value={stats.departments}
            icon={<Building2 className="h-5 w-5" />}
            tone="violet"
          />
          <SummaryCard
            title="Avg. Gross Salary"
            value={`RWF ${formatCurrency(stats.avgSalary)}`}
            icon={<DollarSign className="h-5 w-5" />}
            tone="green"
          />
        </div>

        {/* Filters */}
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name, ID, email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="mobile-filter-row grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={departmentFilter}
                  onValueChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <FilterX className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-0">
            <div className="space-y-3 p-3 xl:hidden">{isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Loading employees…</div> : filteredEmployees.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{hasFilters ? "No employees match these filters." : "Add your first employee to get started."}</div> : filteredEmployees.map((emp) => { const gross = (emp.currentSalary?.basicSalary || 0) + (emp.currentSalary?.transportAllowance || 0) + (emp.currentSalary?.housingAllowance || 0) + (emp.currentSalary?.otherAllowances || 0); return <article key={emp._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{emp.firstName?.[0]}{emp.lastName?.[0]}</div><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</p><p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{emp.employeeId}</p>{emp.email && <p className="mt-0.5 break-all text-xs text-muted-foreground">{emp.email}</p>}</div><StatusBadge status={emp.status}/></div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs dark:border-slate-800"><div className="text-muted-foreground">Department<p className="mt-1 text-sm text-foreground">{emp.department || "—"}</p></div><div className="text-muted-foreground">Position<p className="mt-1 text-sm text-foreground">{emp.position || "—"}</p></div><div className="text-muted-foreground">Employment type<p className="mt-1"><Badge variant="secondary" className="capitalize">{emp.employmentType}</Badge></p></div><div className="text-muted-foreground">Gross salary<p className="mt-1 text-sm font-semibold text-foreground">{gross > 0 ? `RWF ${formatCurrency(gross)}` : "—"}</p></div></div><div className="mt-3 flex gap-2 border-t pt-3 dark:border-slate-800"><Button size="sm" variant="outline" className="min-h-10 flex-1" onClick={() => navigate(`/employees/${emp._id}`)}><Eye className="mr-1.5 h-4 w-4"/>View</Button><Button size="sm" variant="outline" className="min-h-10 flex-1" onClick={() => navigate(`/employees/${emp._id}/edit`)}><Edit className="mr-1.5 h-4 w-4"/>Edit</Button><Button size="icon" variant="outline" className="min-h-10 min-w-10 text-red-600" onClick={() => { setEmployeeToDelete(emp); setShowDeleteDialog(true); }} aria-label={`Delete ${emp.firstName} ${emp.lastName}`}><Trash2 className="h-4 w-4"/></Button></div></article>; })}</div>
            <div className="hidden overflow-x-auto xl:block">
              <Table className="min-w-[940px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableHead className="w-[100px] font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Position</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Gross Salary</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-32 text-center text-slate-500 dark:text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">No employees found</p>
                          <p className="text-xs">
                            {hasFilters
                              ? "Try adjusting your filters"
                              : "Add your first employee to get started"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const gross =
                        (emp.currentSalary?.basicSalary || 0) +
                        (emp.currentSalary?.transportAllowance || 0) +
                        (emp.currentSalary?.housingAllowance || 0) +
                        (emp.currentSalary?.otherAllowances || 0);
                      return (
                        <TableRow
                          key={emp._id}
                          className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                          onClick={() => navigate(`/employees/${emp._id}`)}
                        >
                          <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                            {emp.employeeId}
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
                                {emp.email && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {emp.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {emp.department || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {emp.position || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="capitalize text-xs"
                            >
                              {emp.employmentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={emp.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-900 dark:text-white">
                            {gross > 0 ? `RWF ${formatCurrency(gross)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/employees/${emp._id}`);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/employees/${emp._id}/edit`);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmployeeToDelete(emp);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  Showing {filteredEmployees.length} record
                  {filteredEmployees.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(limit)}
                  onValueChange={(v) => {
                    setLimit(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMIT_OPTIONS.map((o) => (
                      <SelectItem key={o} value={String(o)}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-950 dark:text-white">
              Remove Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                {employeeToDelete?.firstName} {employeeToDelete?.lastName}
              </span>
              ? If payroll history exists, this will mark them as inactive instead of deleting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
