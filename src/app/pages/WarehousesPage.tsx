import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Warehouse as WarehouseIcon,
  Loader2,
  AlertCircle,
  MapPin,
  CheckCircle,
  XCircle,
  Search,
  Boxes,
  Landmark,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { EmptyState } from '@/app/components/EmptyState';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import { warehousesApi, ebmApi } from '@/lib/api';

// Type definitions
interface Warehouse {
  _id: string;
  code: string;
  name: string;
  description?: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  };
  inventoryAccount?: string;
  isActive: boolean;
  isDefault: boolean;
  totalProducts?: number;
  totalQuantity?: number;
  totalValue?: number;
  rraBranchId?: string | null;
  ebmRegistrationStatus?: 'not_registered' | 'registered' | 'failed';
  ebmRegisteredAt?: string | null;
  ebmRegistrationError?: string | null;
  ebmInsuranceSubmitted?: boolean;
  ebmInsurances?: BranchInsurance[];
}

interface BranchInsurance {
  isrccCd: string;
  isrccNm: string;
  isrcRt?: number | null;
  useYn?: 'Y' | 'N';
}

interface WarehouseFormData {
  name: string;
  code: string;
  description: string;
  address: string;
  city: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  inventoryAccount: string;
  rraBranchId: string;
  isDefault: boolean;
  isActive: boolean;
}

const initialFormData: WarehouseFormData = {
  name: '',
  code: '',
  description: '',
  address: '',
  city: '',
  country: '',
  contactPerson: '',
  phone: '',
  email: '',
  inventoryAccount: '',
  rraBranchId: '',
  isDefault: false,
  isActive: true,
};

export default function WarehousesPage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);

  // Branch insurance dialog state
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false);
  const [insuranceWarehouse, setInsuranceWarehouse] = useState<Warehouse | null>(null);
  const [insuranceRows, setInsuranceRows] = useState<BranchInsurance[]>([]);
  const [savingInsurance, setSavingInsurance] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await warehousesApi.getAll({
        search: searchTerm,
        isActive: filterActive,
        page: 1,
        limit: 100,
      });
      
      if (response.success && response.data) {
        // Handle both array and paginated response
        const data = Array.isArray(response.data) ? response.data : (response.data as any).data;
        setWarehouses(data || []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterActive, t]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name || '',
        code: warehouse.code || '',
        description: warehouse.description || '',
        address: warehouse.location?.address || '',
        city: warehouse.location?.city || '',
        country: warehouse.location?.country || '',
        contactPerson: warehouse.location?.contactPerson || '',
        phone: warehouse.location?.phone || '',
        email: warehouse.location?.email || '',
        inventoryAccount: warehouse.inventoryAccount || '',
        rraBranchId: warehouse.rraBranchId || '',
        isDefault: warehouse.isDefault || false,
        isActive: warehouse.isActive !== false,
      });
    } else {
      setEditingWarehouse(null);
      // The head office is branch 00 at RRA, which is what a first/default warehouse usually is.
      setFormData({ ...initialFormData, rraBranchId: warehouses.length === 0 ? '00' : '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('pages.warehouses.nameRequired'));
      return;
    }
    const rraBranchId = formData.rraBranchId.trim();
    if (rraBranchId && !/^\d{2}$/.test(rraBranchId)) {
      toast.error('RRA Branch ID must be exactly two digits, for example 00 for the head office.');
      return;
    }

    try {
      setSaving(true);
      
      const warehouseData = {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        location: {
          address: formData.address || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        },
        inventoryAccount: formData.inventoryAccount || undefined,
        rraBranchId: rraBranchId || null,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      };

      let response;
      if (editingWarehouse) {
        response = await warehousesApi.update(editingWarehouse._id, warehouseData);
        if (response.success) {
          toast.success(t('pages.warehouses.warehouseUpdated') || 'Warehouse updated successfully');
        }
      } else {
        response = await warehousesApi.create(warehouseData);
        if (response.success) {
          toast.success(t('pages.warehouses.warehouseCreated') || 'Warehouse created successfully');
        }
      }

      if (response.success) {
        setDialogOpen(false);
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (warehouse: Warehouse) => {
    setDeletingWarehouse(warehouse);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingWarehouse) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      
      const response = await warehousesApi.delete(deletingWarehouse._id);
      
      if (response.success) {
        toast.success(t('pages.warehouses.warehouseDeleted') || 'Warehouse deleted successfully');
        setDeleteDialogOpen(false);
        fetchWarehouses();
      } else {
        setDeleteError(response.message || t('common.error'));
      }
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      // Handle WAREHOUSE_HAS_STOCK error
      if (error?.code === 'WAREHOUSE_HAS_STOCK' || error?.response?.data?.code === 'WAREHOUSE_HAS_STOCK') {
        setDeleteError(t('pages.warehouses.cannotDeleteWithStock') || 'Cannot delete warehouse with stock on hand');
      } else {
        setDeleteError(t('common.error'));
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async (warehouse: Warehouse) => {
    try {
      const response = await warehousesApi.update(warehouse._id, { isActive: false });
      
      if (response.success) {
        toast.success(t('pages.warehouses.warehouseDeactivated') || 'Warehouse deactivated successfully');
        fetchWarehouses();
      } else if ((response as any).code === 'WAREHOUSE_HAS_STOCK') {
        toast.error(t('pages.warehouses.cannotDeactivateWithStock') || 'Cannot deactivate warehouse while it holds stock');
      } else {
        toast.error(response.message || t('common.error'));
      }
    } catch (error: any) {
      console.error('Error deactivating warehouse:', error);
      if (error?.code === 'WAREHOUSE_HAS_STOCK' || error?.response?.data?.code === 'WAREHOUSE_HAS_STOCK') {
        toast.error(t('pages.warehouses.cannotDeactivateWithStock') || 'Cannot deactivate warehouse while it holds stock');
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  const handleRegisterBranch = async (warehouse: Warehouse) => {
    if (!warehouse.rraBranchId) {
      toast.error('Set the RRA Branch ID on this warehouse first (use 00 for the head office).');
      return;
    }
    try {
      await ebmApi.registerBranch({ branchId: warehouse.rraBranchId });
      toast.success('Branch registered with RRA');
      fetchWarehouses();
    } catch (error: any) {
      toast.error(error.message || 'Branch registration failed');
      fetchWarehouses();
    }
  };

  const handleOpenInsuranceDialog = (warehouse: Warehouse) => {
    setInsuranceWarehouse(warehouse);
    const existing = warehouse.ebmInsurances || [];
    setInsuranceRows(existing.length > 0 ? existing : [{ isrccCd: '', isrccNm: '', isrcRt: null, useYn: 'Y' }]);
    setInsuranceDialogOpen(true);
  };

  const handleInsuranceRowChange = (index: number, field: keyof BranchInsurance, value: string | number) => {
    setInsuranceRows((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: field === 'isrcRt' ? (value === '' ? null : Number(value)) : value,
            }
          : row,
      ),
    );
  };

  const handleAddInsuranceRow = () => {
    setInsuranceRows((rows) => [...rows, { isrccCd: '', isrccNm: '', isrcRt: null, useYn: 'Y' }]);
  };

  const handleRemoveInsuranceRow = (index: number) => {
    setInsuranceRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSaveInsurance = async () => {
    if (!insuranceWarehouse) return;

    const cleaned = insuranceRows
      .map((row) => ({
        isrccCd: (row.isrccCd || '').trim(),
        isrccNm: (row.isrccNm || '').trim(),
        isrcRt: row.isrcRt == null || Number.isNaN(row.isrcRt) ? 0 : Number(row.isrcRt),
        useYn: row.useYn === 'N' ? 'N' : 'Y',
      }))
      .filter((row) => row.isrccCd && row.isrccNm);

    if (cleaned.length === 0) {
      toast.error('Add at least one insurance entry');
      return;
    }

    try {
      setSavingInsurance(true);
      const response = await warehousesApi.update(insuranceWarehouse._id, { ebmInsurances: cleaned });
      if (response.success) {
        toast.success('Branch insurance saved');
        setInsuranceDialogOpen(false);
        fetchWarehouses();
      }
    } catch (error: any) {
      console.error('Error saving branch insurance:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to save branch insurance';
      toast.error(message);
    } finally {
      setSavingInsurance(false);
    }
  };

  const getAddress = (warehouse: Warehouse): string => {
    if (!warehouse.location) return '-';
    const parts = [
      warehouse.location.address,
      warehouse.location.city,
      warehouse.location.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const warehouseSummary = warehouses.reduce(
    (summary, warehouse) => {
      if (warehouse.isActive) summary.active += 1;
      if (warehouse.isDefault) summary.defaults += 1;
      summary.products += warehouse.totalProducts || 0;
      summary.quantity += warehouse.totalQuantity || 0;
      summary.value += warehouse.totalValue || 0;
      return summary;
    },
    { active: 0, defaults: 0, products: 0, quantity: 0, value: 0 }
  );

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen 2xl:max-w-[2200px]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('pages.warehouses.title')}</h1>
            <p className="text-muted-foreground">{t('pages.warehouses.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('pages.warehouses.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:w-72 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
              />
            </div>
            <select
              value={filterActive === undefined ? '' : filterActive.toString()}
              onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{t('common.all')}</option>
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </select>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('pages.warehouses.addWarehouse')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Locations</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{warehouses.length}</p>
              </div>
              <WarehouseIcon className="h-9 w-9 text-blue-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{warehouseSummary.active} active</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Inventory Assigned</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{warehouseSummary.quantity.toLocaleString()}</p>
              </div>
              <Boxes className="h-9 w-9 text-emerald-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{warehouseSummary.products.toLocaleString()} product links</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Default Control</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{warehouseSummary.defaults}</p>
              </div>
              <CheckCircle className="h-9 w-9 text-violet-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Primary receiving location</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Stored Value</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{warehouseSummary.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <Landmark className="h-9 w-9 text-amber-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">From warehouse stock totals</p>
          </div>
        </div>

        {/* Warehouse List */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : warehouses.length === 0 ? (
              <EmptyState
                compact
                icon={WarehouseIcon}
                title={t('pages.warehouses.noWarehouses', 'No warehouses yet')}
                description={t('pages.warehouses.noWarehousesHint', 'Add warehouses to track stock across multiple locations and manage transfers.')}
                action={
                  <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/30 hover:brightness-110">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('pages.warehouses.addWarehouse', 'Add warehouse')}
                  </Button>
                }
                className="m-4"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-slate-100/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.code')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.name')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.address')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.inventoryAccount')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">RRA Branch</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.default')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.status')}</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {warehouses.map((warehouse) => (
                      <tr key={warehouse._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-white">{warehouse.code}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                          <div>{warehouse.name}</div>
                          {warehouse.description && (
                            <div className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">{warehouse.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getAddress(warehouse)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                          {warehouse.inventoryAccount || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-mono text-slate-900 dark:text-white">{warehouse.rraBranchId || '-'}</div>
                          {warehouse.ebmRegistrationStatus === 'registered' ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle className="h-3 w-3" /> Registered
                            </span>
                          ) : warehouse.ebmRegistrationStatus === 'failed' ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300" title={warehouse.ebmRegistrationError || ''}>
                              <XCircle className="h-3 w-3" /> Failed
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              <AlertCircle className="h-3 w-3" /> Not registered
                            </span>
                          )}
                          {warehouse.ebmRegisteredAt && <div className="mt-1 text-xs text-slate-500">{new Date(warehouse.ebmRegisteredAt).toLocaleString()}</div>}
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {warehouse.ebmInsuranceSubmitted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                                <ShieldCheck className="h-3 w-3" /> Insurance synced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <ShieldCheck className="h-3 w-3" /> Insurance pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {warehouse.isDefault ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              {t('pages.warehouses.default')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {warehouse.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle className="h-4 w-4" />
                              {t('common.active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <XCircle className="h-4 w-4" />
                              {t('common.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(warehouse)}
                              title={t('common.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenInsuranceDialog(warehouse)}
                              title="Branch insurance"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRegisterBranch(warehouse)}
                              title="Register branch with RRA"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            {warehouse.isActive && warehouse.isDefault !== true && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(warehouse)}
                                title={t('common.deactivate')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {warehouse.isDefault !== true && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(warehouse)}
                                title={t('common.delete')}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden bg-white p-0 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <DialogTitle className="text-slate-900 dark:text-white">
                {editingWarehouse
                  ? t('pages.warehouses.editWarehouse')
                  : t('pages.warehouses.addWarehouse')}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                {editingWarehouse
                  ? t('pages.warehouses.editWarehouseDesc')
                  : t('pages.warehouses.addWarehouseDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 [scrollbar-width:thin] [scrollbar-color:#64748b_transparent]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-900 dark:text-white">{t('pages.warehouses.warehouseName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('pages.warehouses.warehouseNamePlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-900 dark:text-white">{t('pages.warehouses.code')}</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Auto generated if blank"
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-900 dark:text-white">{t('pages.warehouses.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('pages.warehouses.descriptionPlaceholder')}
                  rows={2}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-white">{t('pages.warehouses.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={t('pages.warehouses.addressPlaceholder')}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-slate-900 dark:text-white">{t('pages.warehouses.city')}</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder={t('pages.warehouses.cityPlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-slate-900 dark:text-white">{t('pages.warehouses.country')}</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder={t('pages.warehouses.countryPlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="text-slate-900 dark:text-white">{t('pages.warehouses.contactPerson')}</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder={t('pages.warehouses.contactPersonPlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-900 dark:text-white">{t('pages.warehouses.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={t('pages.warehouses.phonePlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-900 dark:text-white">{t('pages.warehouses.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('pages.warehouses.emailPlaceholder')}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventoryAccount" className="text-slate-900 dark:text-white">{t('pages.warehouses.inventoryAccount')}</Label>
                <Input
                  id="inventoryAccount"
                  value={formData.inventoryAccount}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventoryAccount: e.target.value }))}
                  placeholder={t('pages.warehouses.inventoryAccountPlaceholder')}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rraBranchId" className="text-slate-900 dark:text-white">RRA Branch ID</Label>
                <Input
                  id="rraBranchId"
                  value={formData.rraBranchId}
                  onChange={(e) => setFormData(prev => ({ ...prev, rraBranchId: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                  placeholder="00"
                  inputMode="numeric"
                  maxLength={2}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The two digit branch number this warehouse has at RRA (00 is the head office). Required before you can
                  register the branch, register products, or send EBM invoices from this warehouse.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-900 dark:text-white">{t('pages.warehouses.setAsDefault')}</span>
                </label>
                {editingWarehouse && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                    <span className="text-sm text-slate-900 dark:text-white">{t('common.active')}</span>
                  </label>
                )}
              </div>
            </div>
            <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingWarehouse ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Branch Insurance Dialog */}
        <Dialog open={insuranceDialogOpen} onOpenChange={setInsuranceDialogOpen}>
          <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden bg-white p-0 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <DialogTitle className="text-slate-900 dark:text-white">
                Branch insurance (VSDC /branches/saveBranchInsurance)
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                Configure the insurance codes, names, and rates that will be submitted to RRA for this branch. Required when products are marked insurance applicable (isrcAplcbYn = "Y").
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {insuranceRows.map((row, index) => (
                <div key={`${row.isrccCd}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-12">
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-slate-900 dark:text-white">Insurance Code</Label>
                    <Input
                      value={row.isrccCd}
                      onChange={(e) => handleInsuranceRowChange(index, 'isrccCd', e.target.value)}
                      placeholder="e.g. INS01"
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-slate-900 dark:text-white">Insurance Name</Label>
                    <Input
                      value={row.isrccNm}
                      onChange={(e) => handleInsuranceRowChange(index, 'isrccNm', e.target.value)}
                      placeholder="Provider or policy name"
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-slate-900 dark:text-white">Insurance Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.isrcRt ?? ''}
                      onChange={(e) => handleInsuranceRowChange(index, 'isrcRt', e.target.value)}
                      placeholder="0"
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                      <input
                        type="checkbox"
                        checked={(row.useYn || 'Y') === 'Y'}
                        onChange={(e) => handleInsuranceRowChange(index, 'useYn', e.target.checked ? 'Y' : 'N')}
                        className="rounded border-gray-300 dark:border-slate-600"
                      />
                      Active
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveInsuranceRow(index)}
                      disabled={insuranceRows.length === 1}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleAddInsuranceRow} className="border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add insurance entry
                </Button>
              </div>
            </div>
            <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <Button variant="outline" onClick={() => setInsuranceDialogOpen(false)} className="border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveInsurance} disabled={savingInsurance} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                {savingInsurance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save branch insurance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-white">{t('pages.warehouses.deleteWarehouse')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
                {deleteError ? (
                  <div className="flex items-center gap-2 text-destructive mt-2">
                    <AlertCircle className="h-4 w-4" />
                    {deleteError}
                  </div>
                ) : (
                  <>
                    {t('pages.warehouses.deleteConfirmMessage') || `Are you sure you want to delete "${deletingWarehouse?.name}"?`}
                    {t('pages.warehouses.deleteWarning') || ' This action cannot be undone.'}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                disabled={deleting || !!deleteError}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

