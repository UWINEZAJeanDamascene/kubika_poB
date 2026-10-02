import { useEffect, useState, type ReactNode } from 'react';
import { Layout } from '../layout/Layout';
import { departmentsApi } from '@/lib/api';
import { employeeApi } from '@/lib/api.employees';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Briefcase,
  UserCheck,
  Crown,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

interface DeptRow {
  _id: string;
  name: string;
  description: string;
  employeeCount: number;
  defaultLaborAccount?: "5300" | "5400" | null;
  createdAt: string;
  employees?: DeptEmployee[];
}

interface DeptEmployee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  status: string;
}

const toneClass = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60',
  slate:
    'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-900/60',
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'slate';
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, tone, loading }: MetricCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-36" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {value}
            </div>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>{icon}</div>
        </div>
        {subtitle && (
          <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DepartmentsPage() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DeptRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<DeptEmployee[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  // Assign employees state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDeptId, setAssignDeptId] = useState<string | null>(null);
  const [allEmployees, setAllEmployees] = useState<DeptEmployee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentsApi.getAll();
      if (response.success) {
        setDepartments(response.data as unknown as DeptRow[]);
      }
    } catch {
      setError(t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.areYouSure'))) return;
    try {
      await departmentsApi.delete(id);
      setSuccess(t('common.successDeleted'));
      fetchDepartments();
      if (expandedId === id) setExpandedId(null);
    } catch {
      setError(t('errors.deleteFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string,
      defaultLaborAccount: (((formData.get('defaultLaborAccount') as string) === 'none' ? null : (formData.get('defaultLaborAccount') as string)) || null) as "5300" | "5400" | null,
    };
    try {
      if (editingDept) {
        await departmentsApi.update(editingDept._id, data);
      } else {
        await departmentsApi.create(data as any);
      }
      setShowModal(false);
      setEditingDept(null);
      setSuccess(t('common.successSaved'));
      fetchDepartments();
    } catch (err: any) {
      setError(err?.message || t('errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedEmployees([]);
      return;
    }
    setExpandedId(id);
    setExpandLoading(true);
    try {
      const response = await departmentsApi.getEmployees(id);
      if (response.success) {
        setExpandedEmployees(response.data || []);
      }
    } catch {
      setExpandedEmployees([]);
    } finally {
      setExpandLoading(false);
    }
  };

  const openAssignModal = async (deptId: string) => {
    setAssignDeptId(deptId);
    setSelectedEmployeeIds([]);
    setShowAssignModal(true);
    try {
      const response = await employeeApi.getAll({ status: 'active' });
      setAllEmployees(response.data || []);
    } catch {
      setAllEmployees([]);
    }
  };

  const handleAssignEmployees = async () => {
    if (!assignDeptId || selectedEmployeeIds.length === 0) return;
    setAssignLoading(true);
    try {
      await departmentsApi.assignEmployees(assignDeptId, selectedEmployeeIds);
      setShowAssignModal(false);
      setSuccess(t('departments.employeesAssigned'));
      fetchDepartments();
      if (expandedId === assignDeptId) toggleExpand(assignDeptId);
    } catch {
      setError(t('errors.saveFailed'));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveEmployee = async (deptId: string, employeeId: string) => {
    try {
      await departmentsApi.removeEmployee(deptId, employeeId);
      setSuccess(t('departments.employeeRemoved'));
      fetchDepartments();
      if (expandedId === deptId) toggleExpand(deptId);
    } catch {
      setError(t('errors.deleteFailed'));
    }
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Clear messages after 4 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const totalDepts = departments.length;
  const totalEmployeesInDepts = departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0);
  const deptsWithEmployees = departments.filter((d) => (d.employeeCount || 0) > 0).length;
  const largestDept = departments.reduce(
    (max, d) => ((d.employeeCount || 0) > (max.employeeCount || 0) ? d : max),
    departments[0] || { name: '-', employeeCount: 0 }
  );

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {t('departments.title')}
                  </h1>
                  <Badge variant="secondary" className="h-6">
                    {totalDepts} total
                  </Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {t('departments.subtitle')}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {isAdmin() && (
                    <Button
                      onClick={() => {
                        setEditingDept(null);
                        setShowModal(true);
                      }}
                      className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      {t('departments.addDepartment')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDepartments}
                    disabled={loading}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Departments</p>
                  <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                    {totalDepts}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Employees</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalEmployeesInDepts}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                  <p className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-400">
                    {deptsWithEmployees}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Departments"
              value={String(totalDepts)}
              subtitle={`${deptsWithEmployees} with assigned employees`}
              icon={<Building2 className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <MetricCard
              title="Assigned Employees"
              value={String(totalEmployeesInDepts)}
              subtitle="Total employees across all departments"
              icon={<UserCheck className="h-5 w-5" />}
              tone="emerald"
              loading={loading}
            />
            <MetricCard
              title="Active Departments"
              value={String(deptsWithEmployees)}
              subtitle="Departments with at least 1 employee"
              icon={<Briefcase className="h-5 w-5" />}
              tone="violet"
              loading={loading}
            />
            <MetricCard
              title="Largest Department"
              value={String(largestDept.employeeCount || 0)}
              subtitle={largestDept.name}
              icon={<Crown className="h-5 w-5" />}
              tone="amber"
              loading={loading}
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              {success}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder={t('departments.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm pl-10 bg-white dark:bg-slate-950 dark:text-white dark:border-slate-800"
            />
          </div>

          {/* Department Cards */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card
                  key={i}
                  className="overflow-hidden border-slate-200 dark:border-slate-800"
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-5">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-72" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDepts.length === 0 ? (
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm">{t('departments.noDepartments')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDepts.map((dept) => (
                <Card
                  key={dept._id}
                  className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between p-4 md:p-5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {dept.name}
                        </h3>
                        {dept.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {dept.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 h-6 px-2.5 text-xs bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <Users className="h-3 w-3" /> {dept.employeeCount || 0}
                      </Badge>
                      {isAdmin() && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Assign Employees"
                            onClick={() => openAssignModal(dept._id)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            title={t('common.edit')}
                            onClick={() => {
                              setEditingDept(dept);
                              setShowModal(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title={t('common.delete')}
                            onClick={() => handleDelete(dept._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        onClick={() => toggleExpand(dept._id)}
                      >
                        {expandedId === dept._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded employee list */}
                  {expandedId === dept._id && (
                    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                      {expandLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                      ) : expandedEmployees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-slate-500 dark:text-slate-400">
                          <Users className="h-5 w-5 text-slate-300 dark:text-slate-600 mb-1" />
                          <p className="text-sm">No employees in this department</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {expandedEmployees.map((emp) => (
                            <div
                              key={emp._id}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                  {emp.firstName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {emp.firstName} {emp.lastName}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {emp.employeeId} · {emp.position || 'No position'}
                                  </p>
                                </div>
                              </div>
                              {isAdmin() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                  title="Remove Employee"
                                  onClick={() => handleRemoveEmployee(dept._id, emp._id)}
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {editingDept
                    ? t('departments.editDepartment')
                    : t('departments.addDepartment')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDept(null);
                  }}
                  className="text-slate-500 dark:text-slate-400"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('common.name')} *
                  </Label>
                  <Input
                    name="name"
                    defaultValue={editingDept?.name || ''}
                    required
                    placeholder={t('departments.namePlaceholder')}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Code *
                  </Label>
                  <Input
                    name="code"
                    defaultValue={editingDept?._id ? (editingDept as any).code || '' : ''}
                    required={!editingDept}
                    placeholder="e.g. HR, FIN, OPS"
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('common.description')}
                  </Label>
                  <textarea
                    name="description"
                    defaultValue={editingDept?.description || ''}
                    rows={3}
                    placeholder={t('departments.descriptionPlaceholder')}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Default Labor Account
                  </Label>
                  <Select
                    name="defaultLaborAccount"
                    defaultValue={editingDept?.defaultLaborAccount || "none"}
                  >
                    <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                      <SelectValue placeholder="Select default labor account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="5300">5300 - Direct Labor</SelectItem>
                      <SelectItem value="5400">5400 - Salaries & Wages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingDept(null);
                    }}
                    className="dark:border-slate-700 dark:text-slate-200"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingDept ? t('common.update') : t('common.create')}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Assign Employees Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md max-h-[80vh] flex flex-col border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Assign Employees
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                  className="text-slate-500 dark:text-slate-400"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-2">
                {allEmployees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                    <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm">{t('common.noData')}</p>
                  </div>
                ) : (
                  allEmployees.map((emp) => (
                    <label
                      key={emp._id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEmployeeIds.includes(emp._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployeeIds((prev) => [...prev, emp._id]);
                          } else {
                            setSelectedEmployeeIds((prev) =>
                              prev.filter((id) => id !== emp._id)
                            );
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {emp.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.employeeId} · {emp.position || 'No position'}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                  className="dark:border-slate-700 dark:text-slate-200"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleAssignEmployees}
                  disabled={selectedEmployeeIds.length === 0 || assignLoading}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Assign ({selectedEmployeeIds.length})
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
