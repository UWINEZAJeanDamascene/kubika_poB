import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { deliveryNotesApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Edit,
  Printer,
  Truck,
  Package,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  BarChart3,
  FileText,
  Tag,
  ArrowRight,
  RefreshCw,
  Send,
  ClipboardList,
  Hash,
  Building,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

// Helper to convert MongoDB Decimal128 to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

// Get qty from multiple possible fields on an item
const getQty = (item: any): number => {
  if (!item) return 0;
  const candidates = [
    'orderedQty',
    'qtyToDeliver',
    'pendingQty',
    'quantity',
    'qty',
    'requestedQty',
    'deliveredQty',
    'amount',
  ];
  for (const key of candidates) {
    if (item[key] !== undefined && item[key] !== null) {
      const n = toNumber(item[key]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
};

interface DeliveryNoteItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  description: string;
  quantity?: number;
  unit: string;
  orderedQty?: number;
  pendingQty?: number;
  deliveredQty?: number;
  [key: string]: any;
}

interface DeliveryNote {
  _id: string;
  referenceNo: string;
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  salesOrder?: {
    _id: string;
    referenceNo: string;
    quotation?: {
      _id: string;
      referenceNo: string;
    };
  };
  client: {
    _id: string;
    name: string;
    code?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
  };
  deliveryDate: string;
  status: 'draft' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  carrier?: string;
  trackingNumber?: string;
  deliveredBy?: string;
  vehicle?: string;
  deliveryAddress?: string;
  notes?: string;
  grandTotal: number;
  currencyCode: string;
  items?: DeliveryNoteItem[];
  lines?: DeliveryNoteItem[];
  invoice?: {
    _id: string;
    referenceNo?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DeliveryNoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    fetchDeliveryNote();
  }, [id]);

  const fetchDeliveryNote = async () => {
    try {
      setLoading(true);
      const response = await deliveryNotesApi.getById(id!);
      if (response.success) {
        console.log('Delivery Note Data:', response.data);
        console.log('Lines:', (response.data as any).lines);
        if ((response.data as any).lines?.length > 0) {
          console.log('First line:', (response.data as any).lines[0]);
          console.log('qtyToDeliver raw:', (response.data as any).lines[0].qtyToDeliver);
        }
        setDeliveryNote(response.data as DeliveryNote);
      } else {
        toast.error('Failed to load delivery note');
      }
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      toast.error('Failed to load delivery note');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      console.log('Starting confirm workflow for delivery note:', id);
      console.log('Current delivery note invoice:', deliveryNote?.invoice);

      let invoiceId =
        (deliveryNote?.invoice as any)?._id ||
        (typeof deliveryNote?.invoice === 'string' ? deliveryNote.invoice : null);

      // Create invoice if missing (idempotent if one already exists on the server)
      if (!invoiceId) {
        toast.info('Creating invoice from delivery note...');
        const createResponse = await deliveryNotesApi.createInvoice(id!, {
          confirmDelivery: true,
        });
        console.log('Create invoice response:', createResponse);

        if (!createResponse.success) {
          toast.error((createResponse as any).message || 'Failed to create invoice');
          return;
        }

        invoiceId = (createResponse.data as any)?._id;
        if (!invoiceId) {
          toast.error('Invoice created but no ID returned');
          return;
        }
      }

      // Confirm draft invoice
      const invoiceStatus = (deliveryNote?.invoice as any)?.status;
      if (!invoiceStatus || invoiceStatus === 'draft') {
        toast.info('Confirming invoice...');
        const confirmInvoiceResponse = await invoicesApi.confirm(invoiceId);
        console.log('Confirm invoice response:', confirmInvoiceResponse);

        if (!confirmInvoiceResponse.success) {
          const code = (confirmInvoiceResponse as any).code;
          if (code !== 'ERR_INVOICE_CONFIRMED') {
            toast.error((confirmInvoiceResponse as any).message || 'Failed to confirm invoice');
            return;
          }
        } else {
          toast.success('Invoice confirmed');
        }
      }

      // Confirm the delivery note itself
      toast.info('Confirming delivery note...');
      const response = await deliveryNotesApi.confirm(id!, { sendEmail });
      console.log('Confirm delivery note response:', response);

      if (response.success) {
        toast.success('Delivery note confirmed successfully');
        fetchDeliveryNote();
      } else {
        toast.error((response as any).message || 'Failed to confirm delivery note');
      }
    } catch (error: any) {
      console.error('Error in confirm workflow:', error);
      const code = error?.code || error?.data?.code;
      if (code === 'ERR_INVOICE_CONFIRMED' || error?.status === 409) {
        toast.success('Invoice already confirmed');
        fetchDeliveryNote();
        return;
      }
      toast.error(error?.message || 'Failed to complete confirmation workflow');
    }
  };

  const handleDispatch = async () => {
    try {
      const response = await deliveryNotesApi.dispatch(id!, {
        carrier: deliveryNote?.carrier,
        trackingNumber: deliveryNote?.trackingNumber
      });
      if (response.success) {
        toast.success('Delivery note dispatched');
        fetchDeliveryNote();
      } else {
        toast.error(response.message || 'Failed to dispatch');
      }
    } catch (error) {
      toast.error('Failed to dispatch delivery note');
    }
  };

  const handleMarkDelivered = async () => {
    try {
      const response = await deliveryNotesApi.markDelivered(id!);
      if (response.success) {
        toast.success('Marked as delivered');
        fetchDeliveryNote();
      } else {
        toast.error(response.message || 'Failed to mark delivered');
      }
    } catch (error) {
      toast.error('Failed to mark as delivered');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this delivery note?')) return;
    try {
      const response = await deliveryNotesApi.cancel(id!);
      if (response.success) {
        toast.success('Delivery note cancelled');
        fetchDeliveryNote();
      } else {
        toast.error(response.message || 'Failed to cancel');
      }
    } catch (error) {
      toast.error('Failed to cancel delivery note');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    dispatched: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  };

  const getStatusBadge = (status: string) => (
    <Badge variant="outline" className={`${STATUS_COLORS[status] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700'} capitalize text-xs`}>
      {status}
    </Badge>
  );

  const { formatCurrency } = useCurrency();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!deliveryNote) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] 2xl:max-w-[2200px] flex-col items-center justify-center py-24">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Delivery Note Not Found</h2>
            <Button onClick={() => navigate('/delivery-notes')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              Back to Delivery Notes
            </Button>
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate('/delivery-notes')}
                    className="h-9 w-9 flex-shrink-0 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        {deliveryNote.referenceNo}
                      </h1>
                      {getStatusBadge(deliveryNote.status)}
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      {formatDate(deliveryNote.deliveryDate)}
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <Building className="h-4 w-4" />
                      {deliveryNote.client?.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 dark:border-slate-700 dark:text-slate-200">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  {deliveryNote.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/delivery-notes/${id}/edit`)}
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Action Banner */}
              <div className="mt-5 flex flex-wrap gap-2">
                {deliveryNote.status === 'draft' && (
                  <>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950"
                      />
                      <Send className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Send Email</span>
                    </label>
                    <Button size="sm" onClick={handleConfirm} className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500">
                      <CheckCircle className="h-4 w-4" />
                      Confirm
                    </Button>
                  </>
                )}
                {deliveryNote.status === 'confirmed' && (
                  <Button size="sm" onClick={handleDispatch} className="gap-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500">
                    <Truck className="h-4 w-4" />
                    Dispatch
                  </Button>
                )}
                {deliveryNote.status === 'dispatched' && (
                  <Button size="sm" onClick={handleMarkDelivered} className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                    <CheckCircle className="h-4 w-4" />
                    Mark Delivered
                  </Button>
                )}
                {(deliveryNote.status === 'draft' || deliveryNote.status === 'confirmed') && (
                  <Button size="sm" variant="destructive" onClick={handleCancel} className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Status Workflow Timeline */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex min-w-[600px] items-center justify-between">
              {[
                { key: 'draft', label: 'Draft', icon: FileText },
                { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
                { key: 'dispatched', label: 'Dispatched', icon: Truck },
                { key: 'delivered', label: 'Delivered', icon: Package },
              ].map((step, i, arr) => {
                const isActive =
                  ['draft', 'confirmed', 'dispatched', 'delivered'].indexOf(deliveryNote.status) >=
                  i;
                const isCancelled = deliveryNote.status === 'cancelled';
                const isLast = i === arr.length - 1;
                return (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ring-2 ${
                          isCancelled
                            ? 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900'
                            : isActive
                            ? 'bg-indigo-600 text-white ring-indigo-200 dark:bg-indigo-500 dark:ring-indigo-900'
                            : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700'
                        }`}
                      >
                        <step.icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isActive && !isCancelled
                            ? 'text-indigo-700 dark:text-indigo-400'
                            : isCancelled
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <ArrowRight
                        className={`h-4 w-4 ${
                          isActive && !isCancelled
                            ? 'text-indigo-400 dark:text-indigo-600'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    )}
                  </>
                );
              })}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Items Table */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50/70 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Qty</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(deliveryNote.lines || [])?.map((item: DeliveryNoteItem) => (
                          <tr key={item._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="px-5 py-3">
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {item.product?.name || item.productName || item.description || '—'}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.product?.sku || item.productCode || ''}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                              {item.description || item.productName || '—'}
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">{getQty(item)}</td>
                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{item.unit || 'pcs'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {deliveryNote.notes && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{deliveryNote.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Client Info */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Client
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{deliveryNote.client?.name}</div>
                    {deliveryNote.client?.code && (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Code: {deliveryNote.client.code}</div>
                    )}
                  </div>
                  {deliveryNote.client?.contact && (
                    <>
                      <Separator className="dark:bg-slate-800" />
                      {deliveryNote.client.contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {deliveryNote.client.contact.phone}
                        </div>
                      )}
                      {deliveryNote.client.contact.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {deliveryNote.client.contact.email}
                        </div>
                      )}
                      {deliveryNote.client.contact.address && (
                        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                          {deliveryNote.client.contact.address}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Details */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">Date:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatDate(deliveryNote.deliveryDate)}</span>
                  </div>
                  {deliveryNote.carrier && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Truck className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400">Carrier:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{deliveryNote.carrier}</span>
                    </div>
                  )}
                  {deliveryNote.trackingNumber && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400">Tracking:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{deliveryNote.trackingNumber}</span>
                    </div>
                  )}
                  {deliveryNote.deliveredBy && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400">Delivered By:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{deliveryNote.deliveredBy}</span>
                    </div>
                  )}
                  {deliveryNote.vehicle && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Truck className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400">Vehicle:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{deliveryNote.vehicle}</span>
                    </div>
                  )}
                  {deliveryNote.deliveryAddress && (
                    <>
                      <Separator className="dark:bg-slate-800" />
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3" />
                          Delivery Address
                        </div>
                        <p className="leading-relaxed text-slate-800 dark:text-slate-200">{deliveryNote.deliveryAddress}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Summary Card */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  {(deliveryNote.quotation || deliveryNote.salesOrder?.quotation) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Quotation:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {deliveryNote.quotation?.referenceNo || deliveryNote.salesOrder?.quotation?.referenceNo}
                      </span>
                    </div>
                  )}
                  {deliveryNote.salesOrder && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Sales Order:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{deliveryNote.salesOrder.referenceNo}</span>
                    </div>
                  )}
                  <Separator className="dark:bg-slate-800" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Items:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{(deliveryNote.lines || []).length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xl font-bold text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span>{formatCurrency(toNumber(
                      deliveryNote.grandTotal
                      ?? deliveryNote.totalAmount
                      ?? (deliveryNote.lines || []).reduce((sum, l: any) => {
                        const qty = getQty(l);
                        return sum + (toNumber(l.lineTotal) || toNumber(l.unitPrice) * qty || toNumber(l.unitCost) * qty);
                      }, 0)
                    ))}</span>
                  </div>
                  <Separator className="dark:bg-slate-800" />
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div>Created: {formatDate(deliveryNote.createdAt)}</div>
                    <div>Updated: {formatDate(deliveryNote.updatedAt)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
