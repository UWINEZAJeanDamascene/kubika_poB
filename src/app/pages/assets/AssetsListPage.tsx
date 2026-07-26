import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { fixedAssetsApi, assetCategoriesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Package,
  Layers,
  Banknote,
  TrendingDown,
  BadgeCheck,
  RefreshCw,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currencyUtils';

// Types
interface FixedAsset {
  _id: string;
  referenceNo?: string;
  reference?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  purchaseDate: string;
  purchaseCost: any; // Allow any type to handle MongoDB Decimal
  salvageValue: any; // Allow any type to handle MongoDB Decimal
  usefulLifeMonths: number;
  depreciationMethod: 'straight-line' | 'declining-balance';
  decliningRate?: number;
  accumulatedDepreciation: any; // Allow any type to handle MongoDB Decimal
  netBookValue: any; // Allow any type to handle MongoDB Decimal
  status: 'active' | 'fully-depreciated' | 'disposed' | 'maintenance';
  location?: string;
  serialNumber?: string;
  supplierId?: string;
  supplierName?: string;
  assetAccountCode?: string;
  accumDepreciationAccountCode?: string;
  depreciationExpenseAccountCode?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AssetCategory {
  _id: string;
  name: string;
  description?: string;
}

export default function AssetsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCategories = useCallback(async () => {
    try {
      const response: any = await assetCategoriesApi.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('[AssetsListPage] Failed to fetch categories:', error);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;

      const response: any = await fixedAssetsApi.getAll(params);
      if (response.success) {
        setAssets(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
        }
      }
    } catch (error) {
      console.error('[AssetsListPage] Failed to fetch assets:', error);
      toast.error(t('assets.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, t]);

  useEffect(() => {
    fetchCategories();
    fetchAssets();
  }, [fetchCategories, fetchAssets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      const response: any = await fixedAssetsApi.delete(id);
      if (response.success) {
        toast.success(t('assets.assetDeleted'));
        fetchAssets();
      } else {
        toast.error(response.message || t('common.deleteFailed'));
      }
    } catch (error) {
      console.error('[AssetsListPage] Delete failed:', error);
      toast.error(t('common.deleteFailed'));
    }
  };

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      'in_transit': { variant: 'outline', label: tr('assets.status.inTransit', 'In Transit') },
      'in_service': { variant: 'default', label: tr('assets.status.inService', 'In Service') },
      'under_maintenance': { variant: 'outline', label: tr('assets.status.maintenance', 'Under Maintenance') },
      'idle': { variant: 'secondary', label: tr('assets.status.idle', 'Idle') },
      'active': { variant: 'default', label: tr('assets.status.active', 'Active') },
      'fully-depreciated': { variant: 'secondary', label: tr('assets.status.fullyDepreciated', 'Fully Depreciated') },
      'fully_depreciated': { variant: 'secondary', label: tr('assets.status.fullyDepreciated', 'Fully Depreciated') },
      'disposed': { variant: 'destructive', label: tr('assets.status.disposed', 'Disposed') },
      'maintenance': { variant: 'outline', label: tr('assets.status.maintenance', 'Under Maintenance') },
    };
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant} className="dark:bg-slate-700 dark:text-slate-200">{config.label}</Badge>;
  };

  // use shared currency formatter (defaults to company/display currency)
  // `formatCurrency` imported from lib/currencyUtils

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Helper to safely get numeric values (handles MongoDB Decimal)
  const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object') {
      // Handle MongoDB Decimal128 objects with $numberDecimal
      if (value.$numberDecimal !== undefined) {
        const num = parseFloat(value.$numberDecimal);
        return isNaN(num) ? 0 : num;
      }
      // Handle objects with toString method
      if (value.toString && typeof value.toString === 'function') {
        const str = value.toString();
        if (str === '[object Object]') return 0;
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      }
    }
    return 0;
  };

  // Helper to resolve an amount from multiple potential keys on an asset
  const getAssetAmount = (asset: any, keys: string[]): string => {
    for (const k of keys) {
      const val = asset ? asset[k] : undefined;
      const num = getNumericValue(val);
      if (num !== 0) return formatCurrency(num);
    }
    // fallback to 0
    return formatCurrency(0);
  };

  // Helper to get category name by ID
  const getCategoryName = (categoryId: string | { _id?: string; name?: string } | null | undefined): string => {
    if (!categoryId) return '-';
    if (typeof categoryId === 'object' && categoryId.name) return categoryId.name;
    const category = categories.find((c) => c._id === categoryId);
    return category ? category.name : '-';
  };

  // Calculate stats
  const totalValue = assets.reduce((sum, asset) => sum + getNumericValue(asset.purchaseCost), 0);
  const totalDepreciation = assets.reduce((sum, asset) => sum + getNumericValue(asset.accumulatedDepreciation), 0);
  const totalNetBookValue = assets.reduce((sum, asset) => sum + getNumericValue(asset.netBookValue), 0);

  const activeCount = assets.filter(a => (a.status as string) === 'active' || (a.status as string) === 'in_service').length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* ── Hero Header ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t('assets.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('assets.subtitle')}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-6 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                    {activeCount} Active
                  </Badge>
                  <Badge variant="outline" className="h-6 border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                    {assets.length - activeCount} Other
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate('/assets/new')} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                  {t('assets.addAsset')}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('assets.totalAssets')}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{assets.length}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('assets.totalValue')}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <Banknote className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('assets.totalDepreciation')}</p>
                    <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDepreciation)}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2.5 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('assets.netBookValue')}</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalNetBookValue)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Calculator className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
              />
            </form>
            <div className="flex gap-2">
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">{t('assets.allStatuses')}</option>
                <option value="active">{t('assets.statusActive')}</option>
                <option value="fully-depreciated">{t('assets.statusFullyDepreciated')}</option>
                <option value="disposed">{t('assets.statusDisposed')}</option>
                <option value="maintenance">{t('assets.statusUnderMaintenance')}</option>
              </select>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              >
                <option value="all">{t('assets.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => fetchAssets()} className="h-9 dark:border-slate-700 dark:text-slate-200">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* ── Table ── */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl p-8 text-center">
                  <Package className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('assets.noAssets')}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Add your first asset to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.reference')}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.name')}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.category')}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.purchaseDate')}</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.cost')}</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.accumulatedDepreciation')}</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.netBookValue')}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('assets.fields.status')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y dark:divide-slate-800">
                      {assets.map((asset) => (
                        <TableRow key={asset._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{asset.referenceNo || asset.reference || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{asset.name}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{getCategoryName(asset.categoryId)}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(asset.purchaseDate)}</TableCell>
                          <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{getAssetAmount(asset, ['purchaseCost','purchase_cost','cost','totalValue','total_value'])}</TableCell>
                          <TableCell className="text-right text-sm text-slate-600 dark:text-slate-300">{getAssetAmount(asset, ['accumulatedDepreciation','accumulated_depreciation','accumDepreciation','accum_depr'])}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{getAssetAmount(asset, ['netBookValue','net_book_value','netValue','net_book'])}</TableCell>
                          <TableCell>{getStatusBadge(asset.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => navigate(`/assets/${asset._id}`)} title={t('common.view')}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => navigate(`/assets/${asset._id}/edit`)} title={t('common.edit')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={() => handleDelete(asset._id)} title={t('common.delete')}>
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
            </CardContent>
          </Card>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 gap-1 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="flex items-center rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="h-8 gap-1 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
