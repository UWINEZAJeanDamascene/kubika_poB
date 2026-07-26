import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { purchaseOrdersApi, grnApi, bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Package,
  FileText,
  Clock,
  Loader2,
  Plus,
  Truck,
  CreditCard,
  DollarSign,
  Mail,
  Hash,
  Building2,
  Warehouse,
  CalendarDays,
  Banknote,
  ReceiptText,
  ClipboardList,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseOrder {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  warehouse?: {
    _id: string;
    name: string;
    code?: string;
  };
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'approved' | 'partially_received' | 'fully_received' | 'cancelled';
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid?: number;
  balance?: number;
  paymentStatus?: string;
  payments?: Array<{
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    paidDate: string;
  }>;
  notes?: string;
  freight?: {
    carrier?: string;
    amount?: number;
    paymentMethod?: string;
    account?: string;
    includeInInventoryCost?: boolean;
  };
  createdBy?: {
    name: string;
    email: string;
  };
  approvedBy?: {
    name: string;
    email: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
      unit?: string;
    };
    qtyOrdered: number;
    qtyReceived: number;
    unitCost: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    budgetId?: string | { _id: string; name: string; fiscalYear?: string };
    accountId?: string | { _id: string; code: string; name: string };
  }>;
}

interface GRN {
  _id: string;
  referenceNo: string;
  receivedDate: string;
  status: string;
  totalAmount: number;
  createdBy?: {
    name: string;
    email: string;
  };
  confirmedBy?: {
    name: string;
    email: string;
  };
  confirmedAt?: string;
}

const STATUS_FLOW = [
  { status: 'draft', label: 'Draft' },
  { status: 'approved', label: 'Approved' },
  { status: 'partially_received', label: 'Partially Received' },
  { status: 'fully_received', label: 'Fully Received' },
];

export default function PurchaseOrderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canUpdatePurchaseOrder = hasPermission('purchase_orders:update');
  const canApprovePurchaseOrder = hasPermission('purchase_orders:approve');
  const canCancelPurchaseOrder =
    hasPermission('purchase_orders:delete') ||
    hasPermission('purchase_orders:update');
  const canCreateGrn = hasPermission('grn:create');
  const canRecordPayment = hasPermission('ap_payments:create');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [grns, setGrns] = useState<GRN[]>([]);
  
  // Email notification states
  const [sendEmailApprove, setSendEmailApprove] = useState(true);
  const [sendEmailCancel, setSendEmailCancel] = useState(true);
  const [sendEmailReceive, setSendEmailReceive] = useState(true);

  const fetchPurchaseOrder = useCallback(async () => {
    if (!id) {
      setError('No purchase order ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await purchaseOrdersApi.getById(id);
      if (response.success && response.data) {
        const po = response.data as any;
        // Ensure lines is always an array
        if (!Array.isArray(po.lines)) {
          po.lines = [];
        }
        // Ensure supplier and warehouse are objects (not just IDs)
        if (typeof po.supplier === 'string') {
          po.supplier = { _id: po.supplier, name: 'Unknown' };
        }
        if (typeof po.warehouse === 'string') {
          po.warehouse = { _id: po.warehouse, name: 'Unknown' };
        }
        setPurchaseOrder(po as PurchaseOrder);
        setGrns(Array.isArray(response.grns) ? response.grns as GRN[] : []);
      } else {
        setError('Failed to load purchase order: ' + (response.message || 'Unknown error'));
        setPurchaseOrder(null);
      }
    } catch (err: any) {
      console.error('[PurchaseOrderDetailPage] Error:', err);
      setError(err.message || 'Failed to fetch purchase order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [fetchPurchaseOrder]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as Array<{_id: string; name: string; accountType: string}>);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  }, []);

  const handleApprove = async () => {
    if (!id || !canApprovePurchaseOrder) return;
    setActionLoading(true);
    try {
      await purchaseOrdersApi.approve(id, sendEmailApprove);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !canCancelPurchaseOrder) return;
    setActionLoading(true);
    try {
      await purchaseOrdersApi.cancel(id, sendEmailCancel);
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Failed to cancel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Payment state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<Array<{_id: string; name: string; accountType: string}>>([]);

  useEffect(() => {
    if (paymentOpen) {
      fetchBankAccounts();
    }
  }, [paymentOpen, fetchBankAccounts]);

  const handleRecordPayment = async () => {
    if (!id || !paymentAmount) return;
    setPaymentSaving(true);
    try {
      const data: { amount: number; paymentMethod: string; notes?: string; bankAccountId?: string } = {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        notes: paymentNotes || undefined,
      };
      if (
        (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') &&
        bankAccountId
      ) {
        data.bankAccountId = bankAccountId;
      }
      await purchaseOrdersApi.recordPayment(id, data);
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setBankAccountId('');
      fetchPurchaseOrder();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setPaymentSaving(false);
    }
  };

  const statusBadgeClass: Record<string, string> = {
    draft:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    approved:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    partially_received:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    fully_received:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    cancelled:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      draft: t('purchase.status.draft', 'Draft'),
      approved: t('purchase.status.approved', 'Approved'),
      partially_received: t('purchase.status.partially_received', 'Partial'),
      fully_received: t('purchase.status.fully_received', 'Received'),
      cancelled: t('purchase.status.cancelled', 'Cancelled'),
    };
    const label = labels[status] || status;
    const cls = statusBadgeClass[status] || statusBadgeClass.draft;
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cls}`}>
        {label}
      </Badge>
    );
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
  };

  function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="rounded-md p-1.5 ring-1 bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          {icon}
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
      </div>
    );
  }

  function MetricTile({
    title,
    value,
    icon,
    tone,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: ReactNode;
    tone: 'emerald' | 'blue' | 'amber' | 'violet' | 'slate';
    subtitle?: string;
  }) {
    return (
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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

  const getStatusStep = (status: string) => {
    const stepIndex = STATUS_FLOW.findIndex(s => s.status === status);
    if (status === 'cancelled') return -1;
    return stepIndex;
  };

  const formatCurrency = (amount: number | string | object | null | undefined, currency: string = 'USD') => {
    try {
      let num: number;
      if (amount == null) {
        num = 0;
      } else if (typeof amount === 'object') {
        // Handle Decimal128: { $numberDecimal: "123" }
        const raw = (amount as any).$numberDecimal || (amount as any).toString();
        num = parseFloat(raw) || 0;
      } else if (typeof amount === 'string') {
        num = parseFloat(amount) || 0;
      } else {
        num = amount;
      }
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
    } catch {
      return '0.00';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950 sm:px-6 lg:px-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px]">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" size="icon" onClick={() => navigate('/purchase-orders')} className="h-10 w-10 dark:border-slate-700 dark:text-slate-200">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <AlertCircle className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">{error || 'Purchase order not found'}</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">ID: {id || 'undefined'}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentStatusStep = getStatusStep(purchaseOrder.status);
  const totalPaid = purchaseOrder.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  const balance = Number(purchaseOrder.totalAmount) - totalPaid;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_380px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate('/purchase-orders')}
                    className="h-10 w-10 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className={`rounded-lg p-2.5 ring-1 ${toneClass.blue}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {purchaseOrder.referenceNo || 'N/A'}
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {(purchaseOrder.supplier as any)?.name || '-'} {purchaseOrder.warehouse?.name ? `· ${purchaseOrder.warehouse.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {getStatusBadge(purchaseOrder.status)}
                  <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-400">
                    {purchaseOrder.currencyCode}
                  </Badge>
                  <Badge variant="outline" className="gap-1 dark:border-slate-700 dark:text-slate-400">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(purchaseOrder.orderDate)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('purchase.detail.total', 'Total Amount')}
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                  {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                    {purchaseOrder.lines?.length || 0} {t('purchase.detail.lines', 'items')}
                  </Badge>
                  {purchaseOrder.expectedDeliveryDate && (
                    <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                      <Clock className="mr-1 h-3 w-3" />
                      {t('purchase.detail.expectedDelivery', 'Delivery')}: {formatDate(purchaseOrder.expectedDeliveryDate)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('purchase.detail.statusTimeline', 'Status Timeline')}
              </p>
              <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:gap-2">
                {STATUS_FLOW.map((step, index) => (
                  <div key={step.status} className="flex items-center flex-shrink-0">
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
                        index <= currentStatusStep
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {index < currentStatusStep ? (
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                      ) : index === currentStatusStep ? (
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                      ) : (
                        <div className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                      )}
                      <span className="whitespace-nowrap">{step.label}</span>
                    </div>
                    {index < STATUS_FLOW.length - 1 && (
                      <div
                        className={`mx-1 h-0.5 w-4 flex-shrink-0 sm:mx-2 sm:w-8 ${
                          index < currentStatusStep ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                ))}
                {purchaseOrder.status === 'cancelled' && (
                  <Badge variant="outline" className="ml-2 flex-shrink-0 border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                    {t('purchase.status.cancelled', 'Cancelled')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Email Options & Action Buttons */}
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              {purchaseOrder.status === 'draft' && (canApprovePurchaseOrder || canCancelPurchaseOrder) && (
                <div className="mb-3 flex flex-wrap items-center gap-4">
                  {canApprovePurchaseOrder && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Checkbox
                        checked={sendEmailApprove}
                        onCheckedChange={(checked) => setSendEmailApprove(checked === true)}
                      />
                      <Mail className="h-4 w-4" />
                      {t('purchase.detail.sendEmailApprove', 'Send email notification on approve')}
                    </label>
                  )}
                  {canCancelPurchaseOrder && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Checkbox
                        checked={sendEmailCancel}
                        onCheckedChange={(checked) => setSendEmailCancel(checked === true)}
                      />
                      <Mail className="h-4 w-4" />
                      {t('purchase.detail.sendEmailCancel', 'Send email notification on cancel')}
                    </label>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {purchaseOrder.status === 'draft' && (
                  <>
                    {canApprovePurchaseOrder && (
                      <Button
                        size="sm"
                        className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-1 h-4 w-4" />
                        )}
                        {t('purchase.detail.approve', 'Approve')}
                      </Button>
                    )}
                    {canCancelPurchaseOrder && (
                      <Button size="sm" variant="outline" onClick={handleCancel} disabled={actionLoading} className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30">
                        <XCircle className="mr-1 h-4 w-4" />
                        {t('purchase.detail.cancel', 'Cancel')}
                      </Button>
                    )}
                  </>
                )}
                {purchaseOrder.status === 'approved' && canCreateGrn && (
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    onClick={() => navigate('/grn/new', { state: { purchaseOrderId: id } })}
                  >
                    <Package className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">{t('purchase.detail.createGRN', 'Create GRN')}</span>
                    <span className="sm:hidden">{t('purchase.detail.createGRN', 'GRN')}</span>
                  </Button>
                )}
                {(purchaseOrder.status === 'approved' || purchaseOrder.status === 'partially_received' || purchaseOrder.status === 'fully_received') && (purchaseOrder as any).paymentStatus !== 'paid' && canRecordPayment && (
                  <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)} className="dark:border-slate-700 dark:text-white">
                    <DollarSign className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">{t('purchase.detail.recordPayment', 'Record Payment')}</span>
                    <span className="sm:hidden">{t('purchase.detail.recordPayment', 'Payment')}</span>
                  </Button>
                )}
                {canUpdatePurchaseOrder && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/purchase-orders/${id}/edit`)}
                    className="dark:border-slate-700 dark:text-white"
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    {t('common.edit', 'Edit')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              title={t('purchase.detail.total', 'Total Amount')}
              value={formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}
              icon={<Banknote className="h-5 w-5" />}
              tone="blue"
            />
            <MetricTile
              title={t('purchase.detail.amountPaid', 'Amount Paid')}
              value={formatCurrency(totalPaid, purchaseOrder.currencyCode)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone={totalPaid > 0 ? 'emerald' : 'slate'}
            />
            <MetricTile
              title={t('purchase.detail.balance', 'Balance')}
              value={formatCurrency(balance, purchaseOrder.currencyCode)}
              icon={<AlertCircle className="h-5 w-5" />}
              tone={balance > 0 ? 'amber' : 'emerald'}
            />
            <MetricTile
              title={t('purchase.detail.lineItems', 'Line Items')}
              value={purchaseOrder.lines?.length || 0}
              icon={<ClipboardList className="h-5 w-5" />}
              tone="violet"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              <TabsTrigger
                value="details"
                className="flex-shrink-0 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                {t('purchase.detail.tabs.details', 'Details')}
              </TabsTrigger>
              <TabsTrigger
                value="grns"
                className="flex-shrink-0 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                {t('purchase.detail.tabs.grns', 'GRNs')}
                {grns.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {grns.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="flex-shrink-0 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                {t('purchase.detail.tabs.payments', 'Payments')}
                {(purchaseOrder.payments?.length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {purchaseOrder.payments?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-shrink-0 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                {t('purchase.detail.tabs.history', 'History')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <PanelTitle icon={<ClipboardList className="h-4 w-4" />} title={t('purchase.detail.lineItems', 'Line Items')} />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800 dark:bg-slate-900/50">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('purchase.detail.product', 'Product')}
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('purchase.detail.qtyOrdered', 'Qty')}
                          </TableHead>
                          <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell dark:text-slate-400">
                            {t('purchase.detail.qtyReceived', 'Received')}
                          </TableHead>
                          <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell dark:text-slate-400">
                            {t('purchase.detail.unitCost', 'Unit Cost')}
                          </TableHead>
                          <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell dark:text-slate-400">
                            {t('purchase.detail.tax', 'Tax')}
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('purchase.detail.total', 'Total')}
                          </TableHead>
                          <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 xl:table-cell dark:text-slate-400">
                            {t('purchase.detail.budget', 'Budget')}
                          </TableHead>
                          <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 xl:table-cell dark:text-slate-400">
                            {t('purchase.detail.account', 'Account')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrder.lines?.map((line) => (
                          <TableRow key={line._id} className="border-b-slate-100 dark:border-b-slate-800/50">
                            <TableCell className="min-w-[150px]">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">
                                  {line.product?.name || (line as any).productName || '-'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                                  {line.product?.sku || (line as any).productCode || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-mono text-sm text-slate-600 dark:text-slate-300">
                              {line.qtyOrdered}
                            </TableCell>
                            <TableCell className="hidden whitespace-nowrap text-right font-mono text-sm text-slate-600 sm:table-cell dark:text-slate-300">
                              {line.qtyReceived || 0}
                            </TableCell>
                            <TableCell className="hidden whitespace-nowrap text-right font-mono text-sm text-slate-600 md:table-cell dark:text-slate-300">
                              {formatCurrency(line.unitCost, purchaseOrder.currencyCode)}
                            </TableCell>
                            <TableCell className="hidden whitespace-nowrap text-right font-mono text-sm text-slate-600 lg:table-cell dark:text-slate-300">
                              {formatCurrency(line.taxAmount, purchaseOrder.currencyCode)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-mono font-medium text-sm text-slate-950 dark:text-white">
                              {formatCurrency(line.lineTotal, purchaseOrder.currencyCode)}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {(() => {
                                if (typeof line.budgetId === 'object' && line.budgetId?.name) {
                                  return (
                                    <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">
                                      {line.budgetId.name}
                                    </Badge>
                                  );
                                } else if (typeof line.budgetId === 'string' && line.budgetId) {
                                  return (
                                    <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">
                                      {line.budgetId.substring(0, 8)}...
                                    </Badge>
                                  );
                                }
                                return <span className="text-sm text-slate-400">-</span>;
                              })()}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {(() => {
                                if (typeof line.accountId === 'object' && line.accountId?.code) {
                                  return (
                                    <span className="text-xs text-slate-600 dark:text-slate-300">{line.accountId.code} - {line.accountId.name}</span>
                                  );
                                } else if (typeof line.accountId === 'string' && line.accountId) {
                                  return (
                                    <span className="text-xs text-slate-600 dark:text-slate-300">{line.accountId.substring(0, 8)}...</span>
                                  );
                                }
                                return <span className="text-sm text-slate-400">-</span>;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary */}
                  <div className="border-t border-slate-100 p-5 dark:border-slate-800">
                    <div className="flex flex-wrap justify-end gap-4 sm:gap-6">
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.subtotal', 'Subtotal')}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(purchaseOrder.subtotal, purchaseOrder.currencyCode)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.tax', 'Tax')}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(purchaseOrder.taxAmount, purchaseOrder.currencyCode)}</p>
                      </div>
                      {purchaseOrder.freight && Number(purchaseOrder.freight.amount) > 0 && (
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.freight', 'Freight (est.)')}</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(purchaseOrder.freight.amount, purchaseOrder.currencyCode)}</p>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.total', 'Total')}</p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {purchaseOrder.notes && (
                    <div className="border-t border-slate-100 p-5 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.notes', 'Notes')}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{purchaseOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grns" className="mt-4">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <PanelTitle icon={<Truck className="h-4 w-4" />} title={t('purchase.detail.grnList', 'Goods Received Notes')} />
                  {purchaseOrder.status === 'approved' && canCreateGrn && (
                    <Button
                      size="sm"
                      className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      onClick={() => navigate('/grn/new', { state: { purchaseOrderId: id } })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('purchase.detail.createGRN', 'Create GRN')}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {grns.length === 0 ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <Truck className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm">{t('purchase.detail.noGRNs', 'No GRNs found for this purchase order')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800 dark:bg-slate-900/50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.grnRef', 'GRN Reference')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.receivedDate', 'Received Date')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.status', 'Status')}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.amount', 'Amount')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.confirmedBy', 'Confirmed By')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grns.map((grn) => (
                            <TableRow key={grn._id} className="border-b-slate-100 dark:border-b-slate-800/50">
                              <TableCell className="font-medium text-slate-900 dark:text-white">{grn.referenceNo}</TableCell>
                              <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(grn.receivedDate)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    grn.status === 'confirmed'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }
                                >
                                  {grn.status === 'confirmed' ? t('purchase.grn.confirmed', 'Confirmed') : t('purchase.grn.draft', 'Draft')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600 dark:text-slate-300">{formatCurrency(grn.totalAmount, purchaseOrder.currencyCode)}</TableCell>
                              <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                                {grn.confirmedBy?.name || '-'}
                                {grn.confirmedAt && <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{formatDate(grn.confirmedAt)}</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <PanelTitle icon={<Banknote className="h-4 w-4" />} title={t('purchase.detail.paymentsTitle', 'Payments')} />
                  {purchaseOrder.status !== 'cancelled' && (purchaseOrder.paymentStatus || 'unpaid') !== 'paid' && canRecordPayment && (
                    <Button
                      size="sm"
                      className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('purchase.detail.recordPayment', 'Record Payment')}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-5">
                  {/* Payment Summary Tiles */}
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <MetricTile
                      title={t('purchase.detail.totalAmount', 'Total Amount')}
                      value={formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currencyCode)}
                      icon={<Banknote className="h-5 w-5" />}
                      tone="blue"
                    />
                    <MetricTile
                      title={t('purchase.detail.amountPaid', 'Amount Paid')}
                      value={formatCurrency(totalPaid, purchaseOrder.currencyCode)}
                      icon={<TrendingUp className="h-5 w-5" />}
                      tone={totalPaid > 0 ? 'emerald' : 'slate'}
                    />
                    <MetricTile
                      title={t('purchase.detail.balance', 'Balance')}
                      value={formatCurrency(balance, purchaseOrder.currencyCode)}
                      icon={<AlertCircle className="h-5 w-5" />}
                      tone={balance > 0 ? 'amber' : 'emerald'}
                    />
                  </div>

                  {/* Payments Table */}
                  {(!purchaseOrder.payments || purchaseOrder.payments.length === 0) ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <DollarSign className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm">{t('purchase.detail.noPayments', 'No payments recorded yet')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800 dark:bg-slate-900/50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.date', 'Date')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.method', 'Method')}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.amount', 'Amount')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.notes', 'Notes')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(purchaseOrder.payments || []).map((payment: any, idx: number) => (
                            <TableRow key={idx} className="border-b-slate-100 dark:border-b-slate-800/50">
                              <TableCell className="text-sm text-slate-600 dark:text-slate-300">{new Date(payment.paidDate || payment.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">
                                  {payment.paymentMethod}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium text-sm text-slate-950 dark:text-white">{formatCurrency(payment.amount, purchaseOrder.currencyCode)}</TableCell>
                              <TableCell className="text-sm text-slate-600 dark:text-slate-300">{payment.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <PanelTitle icon={<Clock className="h-4 w-4" />} title={t('purchase.detail.historyTitle', 'Activity History')} />
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-slate-900 dark:bg-white" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{t('purchase.history.created', 'Purchase Order Created')}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {purchaseOrder.createdBy?.name || 'Unknown'} · {formatDate(purchaseOrder.createdAt)}
                        </p>
                      </div>
                    </div>
                    {purchaseOrder.approvedAt && (
                      <div className="flex gap-4">
                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{t('purchase.history.approved', 'Purchase Order Approved')}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {purchaseOrder.approvedBy?.name || 'Unknown'} · {formatDate(purchaseOrder.approvedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                    {purchaseOrder.status === 'partially_received' && (
                      <div className="flex gap-4">
                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{t('purchase.history.partialReceived', 'Partially Received')}</p>
                        </div>
                      </div>
                    )}
                    {purchaseOrder.status === 'fully_received' && (
                      <div className="flex gap-4">
                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{t('purchase.history.fullyReceived', 'Fully Received')}</p>
                        </div>
                      </div>
                    )}
                    {purchaseOrder.status === 'cancelled' && (
                      <div className="flex gap-4">
                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{t('purchase.history.cancelled', 'Purchase Order Cancelled')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Record Payment Dialog */}
          {paymentOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('purchase.detail.recordPayment', 'Record Payment')}</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.paymentAmount', 'Amount')}</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={String((purchaseOrder as any).balance ?? purchaseOrder.totalAmount)}
                      className="mt-1 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.paymentMethod', 'Payment Method')}</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <SelectItem value="cash" className="dark:text-slate-200">Cash</SelectItem>
                        <SelectItem value="card" className="dark:text-slate-200">Card</SelectItem>
                        <SelectItem value="bank_transfer" className="dark:text-slate-200">Bank Transfer</SelectItem>
                        <SelectItem value="cheque" className="dark:text-slate-200">Cheque</SelectItem>
                        <SelectItem value="mobile_money" className="dark:text-slate-200">Mobile Money</SelectItem>
                        <SelectItem value="credit" className="dark:text-slate-200">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.paymentNotes', 'Notes')}</Label>
                    <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} className="mt-1 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                  {(paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && (
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('purchase.detail.bankAccount', 'Bank Account')}</Label>
                      <Select value={bankAccountId} onValueChange={setBankAccountId}>
                        <SelectTrigger className="mt-1 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc._id} value={acc._id} className="dark:text-slate-200">
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPaymentOpen(false)} className="border-slate-200 text-slate-900 dark:border-slate-700 dark:text-white">
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    onClick={handleRecordPayment}
                    disabled={paymentSaving || !paymentAmount}
                    className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {paymentSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    {t('purchase.detail.submitPayment', 'Submit Payment')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
