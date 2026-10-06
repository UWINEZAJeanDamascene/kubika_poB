import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { recurringInvoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Edit,
  Play,
  Pause,
  Zap,
  XCircle,
  FileText,
  Package,
  Calendar,
  User,
  Repeat,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';

interface RecurringInvoiceLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    code?: string;
  };
  productName: string;
  productCode: string;
  qty: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  discountPct?: number;
}

interface RecurringInvoiceRun {
  _id: string;
  runDate: string;
  status: 'processing' | 'success' | 'failed';
  invoice?: {
    _id: string;
    referenceNo: string;
    status: string;
    totalAmount: number;
  };
  errorMessage?: string;
  createdAt: string;
}

interface RecurringInvoice {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  lines: RecurringInvoiceLine[];
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    interval: number;
    dayOfMonth?: number;
    dayOfWeek?: number;
  };
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  autoConfirm: boolean;
  currencyCode: string;
  notes?: string;
  lastRunAt?: string;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

// Helper to convert Decimal values
const toNumber = (val: any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

export default function RecurringInvoiceDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [recurringInvoice, setRecurringInvoice] = useState<RecurringInvoice | null>(null);
  const [runs, setRuns] = useState<RecurringInvoiceRun[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);

  const fetchRecurringInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await recurringInvoicesApi.getById(id);
      if (response.success && response.data) {
        setRecurringInvoice(response.data as RecurringInvoice);
      } else {
        toast.error('Failed to load recurring invoice');
      }
    } catch (error) {
      console.error('Failed to fetch recurring invoice:', error);
      toast.error('Failed to load recurring invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRuns = useCallback(async () => {
    if (!id) return;
    try {
      const response = await recurringInvoicesApi.getRuns(id);
      if (response.success && response.data) {
        const data = response.data as any;
        setRuns(Array.isArray(data) ? data : (data.runs || []));
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchRecurringInvoice();
    fetchRuns();
  }, [fetchRecurringInvoice, fetchRuns]);

  const handlePause = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.pause(id);
      if (response.success) {
        toast.success('Recurring invoice paused');
        fetchRecurringInvoice();
      }
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause recurring invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.resume(id);
      if (response.success) {
        toast.success('Recurring invoice resumed');
        fetchRecurringInvoice();
      }
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume recurring invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm(t('recurringInvoices.confirmCancel', 'Are you sure you want to cancel this recurring invoice?'))) {
      return;
    }
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.cancel(id);
      if (response.success) {
        toast.success('Recurring invoice cancelled');
        fetchRecurringInvoice();
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
      toast.error('Failed to cancel recurring invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleTrigger = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.trigger(id);
      if (response.success) {
        const data = response.data as any;
        if (data) {
          toast.success('Invoice generated successfully');
        } else {
          toast.info('Template already run today (idempotent)');
        }
        fetchRecurringInvoice();
        fetchRuns();
      }
    } catch (error) {
      console.error('Failed to trigger:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setProcessing(false);
      setShowTriggerDialog(false);
    }
  };

  const formatCurrency = (amount: number | any, currency: string = 'USD') => {
    const num = toNumber(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    paused: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    completed: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700',
    cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return (
      <Badge variant="outline" className={`${STATUS_COLORS[status] || STATUS_COLORS.completed} capitalize text-xs`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getFrequencyLabel = (schedule: RecurringInvoice['schedule']) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually',
    };
    const freq = labels[schedule.frequency] || schedule.frequency;
    if (schedule.interval > 1) {
      return `Every ${schedule.interval} ${freq}s`;
    }
    return freq;
  };

  const { subtotal, taxAmount, totalAmount } = !recurringInvoice
    ? { subtotal: 0, taxAmount: 0, totalAmount: 0 }
    : recurringInvoice.lines.reduce(
        (acc, line) => ({
          subtotal: acc.subtotal + toNumber(line.lineSubtotal || line.qty * line.unitPrice),
          taxAmount: acc.taxAmount + toNumber(line.lineTax || line.qty * line.unitPrice * (line.taxRate / 100)),
          totalAmount: acc.totalAmount + toNumber(line.lineTotal || line.qty * line.unitPrice * (1 + line.taxRate / 100)),
        }),
        { subtotal: 0, taxAmount: 0, totalAmount: 0 }
      );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-10 w-80 rounded-lg" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!recurringInvoice) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px]">
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50">
              <AlertTriangle className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recurring Invoice Not Found</h3>
              <Button onClick={() => navigate('/recurring-invoices')} className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                <ArrowLeft className="h-4 w-4" />
                Back to Recurring Invoices
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate('/recurring-invoices')}
                    className="h-9 w-9 flex-shrink-0 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                      {recurringInvoice.referenceNo}
                    </h1>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(recurringInvoice.status)}
                      {recurringInvoice.autoConfirm && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 text-xs">
                          {t('recurringInvoices.autoConfirm', 'Auto-Confirm')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(recurringInvoice.status === 'active' || recurringInvoice.status === 'paused') && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/recurring-invoices/${id}/edit`)}
                      disabled={processing}
                      className="gap-2 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('common.edit', 'Edit')}</span>
                    </Button>
                  )}
                  {recurringInvoice.status === 'active' && (
                    <Button
                      variant="outline"
                      onClick={handlePause}
                      disabled={processing}
                      className="gap-2 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Pause className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="hidden sm:inline">{t('recurringInvoices.pause', 'Pause')}</span>
                    </Button>
                  )}
                  {recurringInvoice.status === 'paused' && (
                    <Button
                      variant="outline"
                      onClick={handleResume}
                      disabled={processing}
                      className="gap-2 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">{t('recurringInvoices.resume', 'Resume')}</span>
                    </Button>
                  )}
                  {(recurringInvoice.status === 'active' || recurringInvoice.status === 'paused') && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowTriggerDialog(true)}
                        disabled={processing}
                        className="gap-2 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="hidden sm:inline">{t('recurringInvoices.trigger', 'Trigger')}</span>
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={processing}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('recurringInvoices.cancel', 'Cancel')}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              {[
                { label: 'Created', icon: FileText, active: true },
                { label: 'Active', icon: CheckCircle, active: recurringInvoice.status === 'active' },
                { label: 'Paused', icon: Pause, active: recurringInvoice.status === 'paused' },
                { label: 'Runs', icon: Repeat, active: (runs?.length || 0) > 0 },
                { label: recurringInvoice.status === 'cancelled' ? 'Cancelled' : recurringInvoice.status === 'completed' ? 'Completed' : 'Next Run', icon: recurringInvoice.status === 'cancelled' ? XCircle : Calendar, active: true },
              ].map((step, index, arr) => (
                <div key={step.label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${step.active ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-950/30 dark:text-indigo-400' : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className={`text-xs font-medium ${step.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{step.label}</span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className={`mx-2 hidden h-0.5 flex-1 sm:block ${step.active ? 'bg-indigo-200 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="flex h-auto w-full justify-start overflow-x-auto border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50 [&>[data-slot=tabs-trigger]]:flex-none">
              <TabsTrigger value="details" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800">
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm">{t('recurringInvoices.details', 'Details')}</span>
              </TabsTrigger>
              <TabsTrigger value="lines" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800">
                <Package className="h-4 w-4" />
                <span className="text-sm">{t('recurringInvoices.lineItems', 'Line Items')}</span>
              </TabsTrigger>
              <TabsTrigger value="runs" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800">
                <Repeat className="h-4 w-4" />
                <span className="text-sm">{t('recurringInvoices.runHistory', 'Run History')} ({runs.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="space-y-6 lg:col-span-2">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        {t('recurringInvoices.templateInfo', 'Template Information')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.client', 'Client')}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{recurringInvoice.client?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.frequency', 'Frequency')}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{getFrequencyLabel(recurringInvoice.schedule)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.startDate', 'Start Date')}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(recurringInvoice.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.endDate', 'End Date')}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{recurringInvoice.endDate ? formatDate(recurringInvoice.endDate) : t('common.noEndDate', 'No end date')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.nextRun', 'Next Run Date')}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(recurringInvoice.nextRunDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.lastRun', 'Last Run')}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{recurringInvoice.lastRunAt ? formatDate(recurringInvoice.lastRunAt) : '-'}</p>
                      </div>
                      {recurringInvoice.notes && (
                        <div className="sm:col-span-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.notes', 'Notes')}</p>
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{recurringInvoice.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        {t('recurringInvoices.summary', 'Summary')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">{t('recurringInvoices.subtotal', 'Subtotal')}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(subtotal, recurringInvoice.currencyCode)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">{t('recurringInvoices.tax', 'Tax')}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(taxAmount, recurringInvoice.currencyCode)}</span>
                      </div>
                      <Separator className="dark:bg-slate-800" />
                      <div className="flex items-center justify-between text-lg font-bold text-slate-900 dark:text-white">
                        <span>{t('recurringInvoices.total', 'Total')}</span>
                        <span>{formatCurrency(totalAmount, recurringInvoice.currencyCode)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        {t('recurringInvoices.createdBy', 'Created By')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">{t('common.user', 'User')}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{recurringInvoice.createdBy?.name || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">{t('common.date', 'Date')}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatDate(recurringInvoice.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lines">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    {t('recurringInvoices.lineItems', 'Line Items')}
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    {t('recurringInvoices.lineItemsDescription', 'Products that will be included in each generated invoice')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {recurringInvoice.lines.length === 0 ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center p-8">
                      <Package className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('recurringInvoices.noLineItems', 'No line items configured')}</p>
                    </div>
                  ) : (
                    <>
                    <div className="space-y-3 p-3 xl:hidden">
                      {recurringInvoice.lines.map((line) => <article key={line._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-medium text-slate-900 dark:text-white">{line.productName}</h3><p className="text-xs text-slate-500">{line.productCode}</p><dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><div><dt className="text-slate-500">Qty</dt><dd>{toNumber(line.qty || line.quantity)}</dd></div><div><dt className="text-slate-500">Unit price</dt><dd>{formatCurrency(line.unitPrice, recurringInvoice.currencyCode)}</dd></div><div><dt className="text-slate-500">Tax</dt><dd>{toNumber(line.taxRate)}%</dd></div><div><dt className="text-slate-500">Total</dt><dd className="font-semibold">{formatCurrency(line.lineTotal || (line.qty || line.quantity) * line.unitPrice * (1 + line.taxRate / 100), recurringInvoice.currencyCode)}</dd></div></dl></article>)}
                    </div>
                    <div className="hidden overflow-x-auto xl:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.product', 'Product')}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.quantity', 'Quantity')}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.unitPrice', 'Unit Price')}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.taxRate', 'Tax Rate')}</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.lineTotal', 'Total')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recurringInvoice.lines.map((line) => (
                            <TableRow key={line._id} className="transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                              <TableCell>
                                <div className="font-medium text-slate-900 dark:text-white">{line.productName}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{line.productCode}</div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-slate-700 dark:text-slate-300">{toNumber(line.qty || line.quantity)}</TableCell>
                              <TableCell className="text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(line.unitPrice, recurringInvoice.currencyCode)}</TableCell>
                              <TableCell className="text-right text-sm text-slate-700 dark:text-slate-300">{toNumber(line.taxRate)}%</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(line.lineTotal || (line.qty || line.quantity) * line.unitPrice * (1 + line.taxRate / 100), recurringInvoice.currencyCode)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="runs">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <Repeat className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    {t('recurringInvoices.runHistory', 'Run History')}
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    {t('recurringInvoices.runHistoryDescription', 'History of invoices generated from this template')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {runs.length === 0 ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center p-8">
                      <Repeat className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('recurringInvoices.noRuns', 'No invoices generated yet')}</p>
                    </div>
                  ) : (
                    <>
                    <div className="space-y-3 p-3 xl:hidden">
                      {runs.map((run) => <article key={run._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><p className="text-sm text-slate-600 dark:text-slate-300">{formatDate(run.runDate)}</p>{run.status === 'success' ? <Badge variant="outline" className="text-emerald-700">Success</Badge> : run.status === 'processing' ? <Badge variant="outline" className="text-blue-700">Processing</Badge> : <Badge variant="outline" className="text-red-700">Failed</Badge>}</div><div className="mt-2 flex items-center justify-between gap-2">{run.invoice ? <Button variant="link" className="h-auto p-0" onClick={() => navigate(`/invoices/${run.invoice?._id}`)}>{run.invoice.referenceNo}</Button> : <span className="text-xs text-slate-500">No invoice</span>}<strong>{run.invoice ? formatCurrency(run.invoice.totalAmount, recurringInvoice.currencyCode) : '-'}</strong></div>{run.errorMessage && <p className="mt-2 break-words text-xs text-red-600">{run.errorMessage}</p>}</article>)}
                    </div>
                    <div className="hidden overflow-x-auto xl:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.runDate', 'Run Date')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.filterStatus', 'Status')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.invoice', 'Generated Invoice')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.amount', 'Amount')}</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('recurringInvoices.error', 'Error')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {runs.map((run) => (
                            <TableRow key={run._id} className="transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatDate(run.runDate)}</TableCell>
                              <TableCell>
                                {run.status === 'success' ? (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-xs gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Success
                                  </Badge>
                                ) : run.status === 'processing' ? (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 text-xs gap-1">Processing</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 text-xs gap-1">
                                    <X className="h-3 w-3" />
                                    Failed
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {run.invoice ? (
                                  <Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate(`/invoices/${run.invoice?._id}`)}>
                                    {run.invoice.referenceNo}
                                  </Button>
                                ) : (
                                  <span className="text-sm text-slate-500 dark:text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                                {run.invoice ? formatCurrency(run.invoice.totalAmount, recurringInvoice.currencyCode) : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-red-600 dark:text-red-400">
                                {run.errorMessage || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Trigger Dialog */}
          <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
            <DialogContent className="dark:border-slate-700 dark:bg-slate-900">
              <DialogHeader>
                <DialogTitle className="dark:text-white">{t('recurringInvoices.triggerTitle', 'Trigger Invoice Generation')}</DialogTitle>
                <DialogDescription className="dark:text-slate-400">
                  {t('recurringInvoices.triggerDescription', 'This will immediately generate an invoice from this template. The template will still run on its next scheduled date.')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>Next scheduled run: {formatDate(recurringInvoice.nextRunDate)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTriggerDialog(false)} disabled={processing} className="dark:border-slate-700 dark:text-slate-200">
                  <X className="mr-2 h-4 w-4" />
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleTrigger} disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Zap className="mr-2 h-4 w-4" />
                  {t('recurringInvoices.triggerNow', 'Trigger Now')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
