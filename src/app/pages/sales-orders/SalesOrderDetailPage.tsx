import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { salesOrdersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  Package,
  FileText,
  Calendar,
  User,
  Clock,
  AlertCircle,
  RefreshCw,
  Layers,
  Receipt,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Label } from '@/app/components/ui/label';
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

// Helper to convert MongoDB Decimal128 to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

interface SalesOrderLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  description: string;
  qty: number;
  qtyReserved: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

interface SalesOrder {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  orderDate: string;
  expectedDate?: string;
  status: 'draft' | 'confirmed' | 'picking' | 'packed' | 'delivered' | 'invoiced' | 'closed' | 'cancelled';
  fulfillmentStatus?: string;
  lines: SalesOrderLine[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  currencyCode: string;
  isBackorder: boolean;
  terms?: string;
  notes?: string;
  deliveryNotes?: string[];
  invoices?: string[];
  pickPacks?: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  picking: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  packed: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  invoiced: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
  closed: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700',
  cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
};

const WORKFLOW_STEPS = ['draft', 'confirmed', 'picking', 'packed', 'delivered', 'invoiced', 'closed'] as const;

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSalesOrder();
    }
  }, [id]);

  const fetchSalesOrder = async () => {
    try {
      setLoading(true);
      const [orderResponse, workflowResponse] = await Promise.all([
        salesOrdersApi.getById(id as string),
        salesOrdersApi.getWorkflow(id!).catch((e) => {
          console.error('Error fetching workflow:', e);
          return null;
        }),
      ]);
      if (orderResponse.success) {
        setOrder(orderResponse.data as SalesOrder);
      }
      if (workflowResponse?.success) {
        setWorkflow(workflowResponse.data);
      }
    } catch (error) {
      console.error('Error fetching sales order:', error);
      toast.error('Failed to fetch sales order details');
    } finally {
      setLoading(false);
    }
  };

  const doConfirm = async () => {
    setConfirming(true);
    try {
      const response = await salesOrdersApi.confirm(id!, sendEmail);
      if (response.success) {
        toast.success('Sales order confirmed successfully');
        fetchSalesOrder();
      }
    } catch (error: any) {
      console.error('Error confirming sales order:', error);
      toast.error(error.message || 'Failed to confirm sales order');
    } finally {
      setConfirming(false);
      setConfirmDialogOpen(false);
    }
  };

  const doCancel = async () => {
    setCancelling(true);
    try {
      const response = await salesOrdersApi.cancel(id!, 'Cancelled by user', sendEmail);
      if (response.success) {
        toast.success('Sales order cancelled successfully');
        fetchSalesOrder();
      }
    } catch (error: any) {
      console.error('Error cancelling sales order:', error);
      toast.error(error.message || 'Failed to cancel sales order');
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleCreatePickPack = () => {
    navigate(`/pick-packs/create?salesOrderId=${id}`);
  };

  const formatCurrency = (amount: any, currency: string) => {
    const value = toNumber(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                      <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-4 space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] 2xl:max-w-[2200px] flex-col items-center justify-center py-20">
            <div className="rounded-full bg-red-50 p-4 ring-1 ring-red-100 dark:bg-red-950/40 dark:ring-red-900/60">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Sales Order Not Found</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The sales order you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/sales-orders')} className="mt-6 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              Back to Sales Orders
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentStepIndex = WORKFLOW_STEPS.indexOf(order.status as any);
  const fulfillmentPercent = order.lines.length > 0
    ? Math.round((order.lines.reduce((s, l) => s + toNumber(l.qtyReserved), 0) / order.lines.reduce((s, l) => s + toNumber(l.qty), 0)) * 100)
    : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/sales-orders')}
                    className="h-9 gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {order.referenceNo}
                  </h1>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${STATUS_COLORS[order.status]} capitalize`}>
                    {order.status}
                  </Badge>
                  {order.isBackorder && (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                      Backorder
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    Created {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {order.status === 'draft' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/sales-orders/${id}/edit`)}
                        className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700">
                        <input
                          type="checkbox"
                          id="sendEmailSO"
                          checked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900"
                        />
                        <Label htmlFor="sendEmailSO" className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                          Email
                        </Label>
                      </div>
                      <Button onClick={() => setConfirmDialogOpen(true)} className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                        <CheckCircle className="h-4 w-4" />
                        Confirm
                      </Button>
                      <Button variant="outline" onClick={() => setCancelDialogOpen(true)} className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30">
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <Button onClick={handleCreatePickPack} className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                      <Package className="h-4 w-4" />
                      Create Pick & Pack
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchSalesOrder}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(order.subtotal ?? (order as any).subtotal, order.currencyCode)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tax</p>
                  <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(order.taxTotal ?? (order as any).taxAmount, order.currencyCode)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Grand Total</p>
                  <p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(order.grandTotal ?? (order as any).totalAmount, order.currencyCode)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lines</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{order.lines.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Fulfillment Pipeline</p>
            <div className="flex min-w-[700px] items-center">
              {WORKFLOW_STEPS.map((step, i) => {
                const stepIndex = i;
                const isActive = stepIndex <= currentStepIndex && order.status !== 'cancelled';
                const isCurrent = step === order.status;
                const isLast = i === WORKFLOW_STEPS.length - 1;
                return (
                  <>
                    <div key={step} className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ring-2 transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500'
                          : isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800'
                            : 'bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-900 dark:text-slate-600 dark:ring-slate-700'
                      }`}>
                        {isActive && !isCurrent ? <CheckCircle className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className={`mt-2 text-[10px] font-semibold uppercase tracking-wide ${
                        isCurrent ? 'text-indigo-600 dark:text-indigo-400' : isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {step}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`mx-2 h-0.5 flex-1 rounded-full ${
                        stepIndex < currentStepIndex && order.status !== 'cancelled'
                          ? 'bg-emerald-300 dark:bg-emerald-800'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </>
                );
              })}
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Grand Total</p>
                    <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(order.grandTotal ?? (order as any).totalAmount, order.currencyCode)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Order value in {order.currencyCode}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Line Items</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{order.lines.length}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Layers className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Products in this order</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Qty Reserved</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {order.lines.reduce((s, l) => s + toNumber(l.qtyReserved), 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Items allocated from stock</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fulfillment</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{fulfillmentPercent}%</p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-violet-500 transition-all dark:bg-violet-400" style={{ width: `${fulfillmentPercent}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="lines">
                <TabsList className="dark:border-slate-700 dark:bg-slate-900">
                  <TabsTrigger value="lines" className="data-[state=active]:bg-white data-[state=active]:text-slate-950 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
                    <Layers className="mr-2 h-4 w-4" />
                    Line Items
                  </TabsTrigger>
                  <TabsTrigger value="workflow" className="data-[state=active]:bg-white data-[state=active]:text-slate-950 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Workflow
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-4">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-950 dark:text-white">Order Lines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                              <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product</th>
                              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Qty</th>
                              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reserved</th>
                              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Unit Price</th>
                              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.lines.map((line) => (
                              <tr key={line._id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                                <td className="py-3">
                                  <div className="text-sm font-medium text-slate-950 dark:text-white">{line.description}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{line.product?.sku}</div>
                                </td>
                                <td className="py-3 text-right text-sm text-slate-700 dark:text-slate-300">{toNumber(line.qty)}</td>
                                <td className="py-3 text-right text-sm text-slate-700 dark:text-slate-300">{toNumber(line.qtyReserved)}</td>
                                <td className="py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                                  {formatCurrency(toNumber(line.unitPrice), order.currencyCode)}
                                </td>
                                <td className="py-3 text-right text-sm font-semibold text-slate-950 dark:text-white">
                                  {formatCurrency(toNumber(line.lineTotal), order.currencyCode)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="workflow" className="mt-4">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-950 dark:text-white">Workflow Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {workflow ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Status</span>
                            <Badge variant="outline" className={`${STATUS_COLORS[workflow.currentStatus]} capitalize`}>
                              {workflow.currentStatus}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Can Edit</span>
                            <Badge variant={workflow.canEdit ? 'default' : 'secondary'} className={workflow.canEdit ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600' : ''}>
                              {workflow.canEdit ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Can Cancel</span>
                            <Badge variant={workflow.canCancel ? 'destructive' : 'secondary'}>
                              {workflow.canCancel ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                          Workflow information not available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {(order.terms || order.notes) && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-950 dark:text-white">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.terms && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Terms & Conditions</h4>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{order.terms}</p>
                      </div>
                    )}
                    {order.notes && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</h4>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{order.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950 dark:text-white">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">{order.client?.name}</p>
                      {order.client?.code && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Code: {order.client.code}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950 dark:text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Order Date</span>
                    <span className="font-medium text-slate-950 dark:text-white">{formatDate(order.orderDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Expected Date</span>
                    <span className="font-medium text-slate-950 dark:text-white">{order.expectedDate ? formatDate(order.expectedDate) : '—'}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                      <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(order.subtotal ?? (order as any).subtotal, order.currencyCode)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Tax</span>
                      <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(order.taxTotal ?? (order as any).taxAmount, order.currencyCode)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                      <span className="text-base font-bold text-slate-950 dark:text-white">Grand Total</span>
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(order.grandTotal ?? (order as any).totalAmount, order.currencyCode)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {order.quotation && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-950 dark:text-white">Linked Quotation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">{order.quotation.referenceNo}</p>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          onClick={() => navigate(`/quotations/${order.quotation?._id}`)}
                        >
                          View Quotation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950 dark:text-white">Order Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{order.lines.length} line items</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">Updated {formatDate(order.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">Created {formatDate(order.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Confirm Sales Order</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              Are you sure you want to confirm this sales order? Once confirmed, it will move to the confirmed status and can be processed for picking & packing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doConfirm} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-700">
              {confirming ? 'Confirming...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Cancel Sales Order</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              Are you sure you want to cancel this sales order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Keep Order</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel} disabled={cancelling} className="bg-red-600 hover:bg-red-700">
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
