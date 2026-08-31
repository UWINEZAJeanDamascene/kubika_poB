import { useState, type ReactNode } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Building2,
  Users,
  TrendingUp,
  Package,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { toast } from 'sonner';

interface Supplier {
  _id: string;
  name: string;
  code: string;
  contact: {
    email?: string;
    phone?: string;
    contactPerson?: string;
    city?: string;
    country?: string;
  };
  paymentTerms: string;
  isActive: boolean;
  totalPurchases: number;
  productsCount?: number;
  productsSupplied?: unknown[];
}

export default function SuppliersListPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const {
    data: supplierData,
    isPending: loading,
    refetch: fetchSuppliers,
  } = useQuery({
    queryKey: ['suppliers', 'list', { page, search: search || undefined, statusFilter: statusFilter || undefined }],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.isActive = statusFilter;
      const response: any = await suppliersApi.getAll(params);
      if (!response.success) throw new Error('Failed to load suppliers');
      return {
        items: (response.data || []) as Supplier[],
        totalPages: response.pages || 1,
        total: response.total || 0,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const suppliers = supplierData?.items ?? [];
  const totalPages = supplierData?.totalPages ?? 1;
  const total = supplierData?.total ?? 0;


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('suppliers.confirmDelete', 'Are you sure you want to delete this supplier?'))) return;
    try {
      const response: any = await suppliersApi.delete(id);
      if (response.success) {
        toast.success(t('suppliers.success.deleted', 'Supplier deleted successfully'));
        fetchSuppliers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suppliers.errors.deleteFailed', 'Failed to delete supplier'));
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response: any = await suppliersApi.toggleStatus(id);
      if (response.success) {
        toast.success(t('suppliers.success.statusToggled', 'Supplier status updated'));
        fetchSuppliers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suppliers.errors.toggleFailed', 'Failed to update status'));
    }
  };

  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      credit_7: 'Credit 7 Days',
      credit_15: 'Credit 15 Days',
      credit_30: 'Credit 30 Days',
      credit_45: 'Credit 45 Days',
      credit_60: 'Credit 60 Days',
    };
    return labels[terms] || terms;
  };

  // Aggregates
  const activeCount = suppliers.filter((s) => s.isActive).length;
  const inactiveCount = suppliers.filter((s) => !s.isActive).length;
  const totalPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);

  const toneClass: Record<string, string> = {
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
    amber:
      'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    slate:
      'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800',
  };

  function MetricTile({
    title,
    value,
    icon,
    tone,
    loading,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: ReactNode;
    tone: 'emerald' | 'blue' | 'amber' | 'slate';
    loading?: boolean;
    subtitle?: string;
  }) {
    if (loading) {
      return (
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="mt-5 h-8 w-32" />
            {subtitle && <Skeleton className="mt-2 h-3 w-20" />}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {title}
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {value}
              </p>
            </div>
            <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>{icon}</div>
          </div>
          {subtitle && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  function LocalEmptyPanel({ icon, message }: { icon: ReactNode; message: string }) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
        <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
        <p className="text-sm">{message}</p>
      </div>
    );
  }

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
                    {t('suppliers.title', 'Suppliers')}
                  </h1>
                  {!loading && (
                    <Badge variant="secondary" className="h-6">
                      {total} total
                    </Badge>
                  )}
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  {t('suppliers.subtitle', 'Manage supplier relationships, track purchases, and view performance')}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={() => navigate('/suppliers/new')}
                    className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    {t('suppliers.addSupplier', 'Add Supplier')}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Inactive</p>
                  <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{inactiveCount}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Spend</p>
                  <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(totalPurchases)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title={t('suppliers.totalSuppliers', 'Total Suppliers')}
              value={total}
              icon={<Users className="h-5 w-5" />}
              tone="blue"
              loading={loading}
              subtitle={`${activeCount} active · ${inactiveCount} inactive`}
            />
            <MetricTile
              title={t('suppliers.activeSuppliers', 'Active Suppliers')}
              value={activeCount}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="emerald"
              loading={loading}
              subtitle={total > 0 ? `${Math.round((activeCount / total) * 100)}% of total` : '-'}
            />
            <MetricTile
              title={t('suppliers.inactiveSuppliers', 'Inactive Suppliers')}
              value={inactiveCount}
              icon={<AlertCircle className="h-5 w-5" />}
              tone="amber"
              loading={loading}
              subtitle={total > 0 ? `${Math.round((inactiveCount / total) * 100)}% of total` : '-'}
            />
            <MetricTile
              title={t('suppliers.totalPurchases', 'Total Purchases')}
              value={formatCurrency(totalPurchases)}
              icon={<Package className="h-5 w-5" />}
              tone="slate"
              loading={loading}
              subtitle={t('suppliers.acrossAll', 'Across all suppliers')}
            />
          </div>

          {/* Filters */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder={t('suppliers.searchPlaceholder', 'Search by name, code, or email...')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">{t('suppliers.allStatus', 'All Status')}</option>
                  <option value="true">{t('common.active', 'Active')}</option>
                  <option value="false">{t('common.inactive', 'Inactive')}</option>
                </select>
                <Button type="submit" variant="outline" className="h-10 dark:border-slate-700 dark:text-slate-200">
                  {t('common.search', 'Search')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {loading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : suppliers.length === 0 ? (
              <EmptyState
                compact
                icon={Building2}
                title={t('suppliers.noSuppliers', 'No suppliers yet')}
                description={t('suppliers.noSuppliersHint', 'Add your first supplier to start creating purchase orders and tracking payables.')}
                action={
                  <Button onClick={() => navigate('/suppliers/new')} className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/30 hover:brightness-110">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('suppliers.addFirst', 'Add your first supplier')}
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800 dark:bg-slate-900/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('suppliers.code', 'Code')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('suppliers.name', 'Name')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('suppliers.contact', 'Contact')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('suppliers.paymentTerms', 'Payment Terms')}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('suppliers.totalPurchases', 'Total Purchases')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('suppliers.status', 'Status')}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('common.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow
                        key={supplier._id}
                        className="border-b-slate-100 transition-colors hover:bg-slate-50/50 dark:border-b-slate-800/50 dark:hover:bg-slate-800/30"
                      >
                        <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">
                          {supplier.code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-950 dark:text-white">
                          {supplier.name}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          <div className="text-sm">
                            {supplier.contact?.contactPerson && (
                              <div className="text-slate-900 dark:text-slate-200">{supplier.contact.contactPerson}</div>
                            )}
                            {supplier.contact?.email && (
                              <div className="text-slate-500 dark:text-slate-400">{supplier.contact.email}</div>
                            )}
                            {supplier.contact?.phone && (
                              <div className="text-slate-500 dark:text-slate-400">{supplier.contact.phone}</div>
                            )}
                            {!supplier.contact?.email &&
                              !supplier.contact?.phone &&
                              !supplier.contact?.contactPerson &&
                              '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {getPaymentTermsLabel(supplier.paymentTerms)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-950 dark:text-white">
                          {formatCurrency(supplier.totalPurchases)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              supplier.isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleStatus(supplier._id)}
                          >
                            {supplier.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/suppliers/${supplier._id}`)}
                              title={t('common.view', 'View')}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/suppliers/${supplier._id}/edit`)}
                              title={t('common.edit', 'Edit')}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(supplier._id)}
                              title={t('common.delete', 'Delete')}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t('common.showing', 'Showing')} {suppliers.length} {t('common.of', 'of')} {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${page === 1 ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors ${
                        page === pageNum
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${page === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
