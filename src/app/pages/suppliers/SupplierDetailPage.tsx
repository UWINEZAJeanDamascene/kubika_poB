import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  ArrowLeft,
  Pencil,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Package,
  CreditCard,
  CalendarDays,
  Hash,
  TrendingUp,
  Boxes,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  _id: string;
  name: string;
  code: string;
  contact: {
    email?: string;
    phone?: string;
    fax?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    contactPerson?: string;
  };
  region?: string;
  currency?: string;
  leadTime?: number;
  minimumOrder?: number;
  bankName?: string;
  bankAccount?: string;
  paymentTerms: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  totalPurchases: number;
  lastPurchaseDate?: string;
  productsSupplied?: Array<{ _id: string; name: string; sku: string; unit?: string }>;
  createdBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface PurchaseRecord {
  _id: string;
  movementDate: string;
  quantity: number;
  totalCost: number;
  product?: { name: string; sku: string; unit?: string };
}

export default function SupplierDetailPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseSummary, setPurchaseSummary] = useState({ totalAmount: 0, totalQuantity: 0, totalPurchases: 0 });

  useEffect(() => {
    if (id) {
      fetchSupplier();
      fetchPurchaseHistory();
    }
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response: any = await suppliersApi.getById(id!);
      if (response.success && response.data) {
        setSupplier(response.data);
      } else {
        toast.error(t('suppliers.errors.notFound', 'Supplier not found'));
        navigate('/suppliers');
      }
    } catch (error) {
      console.error('[SupplierDetailPage] Failed to fetch supplier:', error);
      toast.error(t('suppliers.errors.fetchFailed', 'Failed to load supplier'));
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    setPurchasesLoading(true);
    try {
      const response: any = await suppliersApi.getPurchaseHistory(id!, { limit: 20 });
      if (response.success) {
        setPurchases(response.data || []);
        if (response.summary) {
          setPurchaseSummary(response.summary);
        }
      }
    } catch (error) {
      console.error('[SupplierDetailPage] Failed to fetch purchase history:', error);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
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

  const toneClass: Record<string, string> = {
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
    amber:
      'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    violet:
      'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60',
    slate:
      'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800',
    red: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
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
    tone: 'emerald' | 'blue' | 'amber' | 'violet' | 'slate' | 'red';
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

  function PanelTitle({
    icon,
    title,
    subtitle,
    action,
  }: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    action?: ReactNode;
  }) {
    return (
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="mt-2 sm:mt-0">{action}</div>}
      </div>
    );
  }

  function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
        <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!supplier) return null;

  const avgOrder =
    purchaseSummary.totalPurchases > 0
      ? purchaseSummary.totalAmount / purchaseSummary.totalPurchases
      : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_380px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate('/suppliers')}
                      className="h-10 w-10 shrink-0 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div
                      className={`rounded-lg p-2.5 ring-1 ${
                        supplier.isActive ? toneClass.emerald : toneClass.slate
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        {supplier.name}
                      </h1>
                      <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{supplier.code}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>{getPaymentTermsLabel(supplier.paymentTerms)}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/suppliers/${id}/edit`)}
                    className="dark:border-slate-700 dark:text-slate-200"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {t('suppliers.editSupplier', 'Edit Supplier')}
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      supplier.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }
                  >
                    {supplier.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                  </Badge>
                  {supplier.currency && (
                    <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-400">
                      {supplier.currency}
                    </Badge>
                  )}
                  {supplier.region && (
                    <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-400">
                      {supplier.region}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('suppliers.totalPurchases', 'Total Purchases')}
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                  {formatCurrency(supplier.totalPurchases)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {supplier.currency && (
                    <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                      {supplier.currency}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                    {purchaseSummary.totalPurchases} {t('suppliers.records', 'records')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title={t('suppliers.totalPurchases', 'Total Purchases')}
              value={formatCurrency(supplier.totalPurchases)}
              icon={<Package className="h-5 w-5" />}
              tone="blue"
              subtitle={`${purchaseSummary.totalPurchases} transactions`}
            />
            <MetricTile
              title={t('suppliers.paymentTerms', 'Payment Terms')}
              value={getPaymentTermsLabel(supplier.paymentTerms)}
              icon={<CreditCard className="h-5 w-5" />}
              tone="violet"
              subtitle={supplier.currency || t('common.nA', 'N/A')}
            />
            <MetricTile
              title={t('suppliers.products', 'Products Supplied')}
              value={supplier.productsSupplied?.length || 0}
              icon={<Boxes className="h-5 w-5" />}
              tone="emerald"
              subtitle={t('suppliers.activeCatalog', 'Active catalog items')}
            />
            <MetricTile
              title={t('suppliers.lastPurchase', 'Last Purchase')}
              value={supplier.lastPurchaseDate ? formatDate(supplier.lastPurchaseDate) : '-'}
              icon={<CalendarDays className="h-5 w-5" />}
              tone="amber"
              subtitle={supplier.lastPurchaseDate ? t('suppliers.mostRecent', 'Most recent') : t('suppliers.noActivity', 'No activity')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title={t('suppliers.totalRecords', 'Total Records')}
              value={purchaseSummary.totalPurchases}
              icon={<Hash className="h-5 w-5" />}
              tone="slate"
              subtitle={t('suppliers.transactions', 'Transactions')}
            />
            <MetricTile
              title={t('suppliers.totalQuantity', 'Total Quantity')}
              value={purchaseSummary.totalQuantity}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="emerald"
              subtitle={t('suppliers.unitsReceived', 'Units received')}
            />
            <MetricTile
              title={t('suppliers.averageOrder', 'Average Order')}
              value={formatCurrency(avgOrder)}
              icon={<ArrowUpRight className="h-5 w-5" />}
              tone="blue"
              subtitle={t('suppliers.perTransaction', 'Per transaction')}
            />
            <MetricTile
              title={t('suppliers.leadTime', 'Lead Time')}
              value={
                supplier.leadTime != null && Number(supplier.leadTime) >= 0
                  ? t('suppliers.leadTimeDaysValue', '{{count}} days', {
                      count: Number(supplier.leadTime),
                    })
                  : t('suppliers.leadTimeNotSet', 'Not set')
              }
              icon={<CalendarDays className="h-5 w-5" />}
              tone="amber"
              subtitle={t('suppliers.deliveryEstimate', 'Delivery estimate')}
            />
          </div>

          {/* Contact & Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Contact Information */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <PanelTitle
                  icon={<Mail className="h-4 w-4" />}
                  title={t('suppliers.contactInfo', 'Contact Information')}
                />
                {supplier.contact?.contactPerson && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {supplier.contact.contactPerson}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('suppliers.contactPerson', 'Contact Person')}
                      </p>
                    </div>
                  </div>
                )}
                {supplier.contact?.email && (
                  <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <a
                      href={`mailto:${supplier.contact.email}`}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {supplier.contact.email}
                    </a>
                  </div>
                )}
                {supplier.contact?.phone && (
                  <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <a
                      href={`tel:${supplier.contact.phone}`}
                      className="text-sm font-medium text-slate-900 hover:underline dark:text-white"
                    >
                      {supplier.contact.phone}
                    </a>
                  </div>
                )}
                {supplier.contact?.website && (
                  <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400">
                      <Globe className="h-4 w-4" />
                    </div>
                    <a
                      href={supplier.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {supplier.contact.website}
                    </a>
                  </div>
                )}
                {(supplier.contact?.address || supplier.contact?.city || supplier.contact?.country) && (
                  <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {supplier.contact.address && <div>{supplier.contact.address}</div>}
                      <div>
                        {[supplier.contact.city, supplier.contact.state, supplier.contact.zipCode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                      {supplier.contact.country && <div>{supplier.contact.country}</div>}
                    </div>
                  </div>
                )}
                {!supplier.contact?.email &&
                  !supplier.contact?.phone &&
                  !supplier.contact?.contactPerson && (
                    <EmptyState
                      icon={<Mail className="h-6 w-6" />}
                      message={t('suppliers.noContactInfo', 'No contact information')}
                    />
                  )}
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <PanelTitle
                  icon={<FileText className="h-4 w-4" />}
                  title={t('suppliers.details', 'Details')}
                />
                <div className="space-y-2.5">
                  {supplier.taxId && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.taxId', 'Tax ID')}
                      </span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {supplier.taxId}
                      </span>
                    </div>
                  )}
                  {supplier.region && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.region', 'Region')}
                      </span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {supplier.region}
                      </span>
                    </div>
                  )}
                  {supplier.currency && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.currency', 'Currency')}
                      </span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {supplier.currency}
                      </span>
                    </div>
                  )}
                  {supplier.leadTime != null ? (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.leadTime', 'Lead Time')}
                      </span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {t('suppliers.leadTimeDaysValue', '{{count}} days', {
                          count: Number(supplier.leadTime),
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.leadTime', 'Lead Time')}
                      </span>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {t('suppliers.leadTimeNotSet', 'Not set')}
                      </span>
                    </div>
                  )}
                  {supplier.minimumOrder != null && supplier.minimumOrder > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.minimumOrder', 'Min Order')}
                      </span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {formatCurrency(supplier.minimumOrder)}
                      </span>
                    </div>
                  )}
                  {supplier.bankName && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.bankName', 'Bank')}
                      </span>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {supplier.bankName}
                      </span>
                    </div>
                  )}
                  {supplier.bankAccount && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t('suppliers.bankAccount', 'Account')}
                      </span>
                      <span className="text-sm font-mono font-semibold text-slate-950 dark:text-white">
                        {supplier.bankAccount}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('common.createdAt', 'Created')}
                    </span>
                    <span className="text-sm font-semibold text-slate-950 dark:text-white">
                      {formatDate(supplier.createdAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Supplied */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <PanelTitle
                  icon={<Boxes className="h-4 w-4" />}
                  title={t('suppliers.productsSupplied', 'Products Supplied by {{name}}', {
                    name: supplier.name,
                  })}
                  subtitle={
                    (supplier.productsSupplied?.length || 0) > 0
                      ? t('suppliers.activeCatalog', '{{count}} catalog items', {
                          count: supplier.productsSupplied!.length,
                        })
                      : t('suppliers.noProductsLinked', 'No products linked to this supplier')
                  }
                />
                {supplier.productsSupplied && supplier.productsSupplied.length > 0 ? (
                  <div className="space-y-2">
                    {supplier.productsSupplied.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/30"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <Package className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {product.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {product.sku}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Boxes className="h-6 w-6" />}
                    message={t('suppliers.noProductsLinked', 'No products linked to this supplier')}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Purchase History */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <PanelTitle
                icon={<TrendingUp className="h-4 w-4" />}
                title={t('suppliers.purchaseHistory', 'Purchase History')}
                subtitle={
                  purchaseSummary.totalPurchases > 0
                    ? `${purchaseSummary.totalPurchases} ${t('suppliers.records', 'records')} · ${t('suppliers.total', 'Total')}: ${formatCurrency(purchaseSummary.totalAmount)}`
                    : undefined
                }
              />
              {purchasesLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="h-6 w-6" />}
                  message={t('suppliers.noPurchaseHistory', 'No purchase history found')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800 dark:bg-slate-900/50">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t('suppliers.date', 'Date')}
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t('suppliers.product', 'Product')}
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t('suppliers.quantity', 'Quantity')}
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t('suppliers.totalCost', 'Total Cost')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow
                          key={purchase._id}
                          className="border-b-slate-100 transition-colors hover:bg-slate-50/50 dark:border-b-slate-800/50 dark:hover:bg-slate-800/30"
                        >
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {formatDate(purchase.movementDate)}
                          </TableCell>
                          <TableCell className="text-slate-900 dark:text-white">
                            <div>{purchase.product?.name || '-'}</div>
                            {purchase.product?.sku && (
                              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {purchase.product.sku}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-slate-600 dark:text-slate-300">
                            {purchase.quantity} {purchase.product?.unit || ''}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-slate-950 dark:text-white">
                            {formatCurrency(purchase.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {supplier.notes && (
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <PanelTitle
                  icon={<FileText className="h-4 w-4" />}
                  title={t('suppliers.notes', 'Notes')}
                />
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {supplier.notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
