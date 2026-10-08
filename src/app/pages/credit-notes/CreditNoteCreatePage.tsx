import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { creditNotesApi, invoicesApi, warehousesApi, serialNumberApi, stockBatchApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Receipt,
  FileText,
  Package,
  Wallet,
  DollarSign,
} from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useTranslation } from 'react-i18next';

interface CreditNoteLine {
  _id?: string;
  invoiceLineId: string;
  product: {
    _id: string;
    name: string;
    code?: string;
    trackingType?: 'none' | 'batch' | 'serial';
    isStockable?: boolean;
  };
  productName: string;
  productCode: string;
  originalQty: number; // ADDED: Original invoice quantity
  quantity: number; // Qty to credit (user enters this)
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  returnToWarehouse?: string;
  batchId?: string;
  serialNumbers?: string[];
}

interface CreditNote {
  _id: string;
  referenceNo: string;
  creditDate: string;
  type: 'goods_return' | 'price_adjustment' | 'cancelled_order';
  status: string;
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  grandTotal?: number;
  invoice?: {
    _id: string;
    referenceNo: string;
  };
  client?: {
    _id: string;
    name: string;
  };
  reason: string;
  lines: CreditNoteLine[];
  notes?: string;
}

interface Invoice {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
  };
  lines: any[];
  currencyCode: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

const TYPE_OPTIONS = [
  { value: 'goods_return', label: 'Goods Return' },
  { value: 'price_adjustment', label: 'Price Adjustment' },
  { value: 'cancelled_order', label: 'Cancelled Order' },
];

// Helper to convert Decimal values
const toNumber = (val: any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

function CreditNoteSerialSelector({
  productId,
  selectedSerials,
  quantity,
  onChange,
}: {
  productId: string;
  selectedSerials: string[];
  quantity: number;
  onChange: (serialIds: string[]) => void;
}) {
  const [serials, setSerials] = useState<Array<{ _id: string; serialNo: string; status: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    serialNumberApi.getDispatchedForReturn(productId)
      .then((response) => {
        if (!response.success) throw new Error('Could not load dispatched serial numbers.');
        if (active) {
          setSerials(response.data.map((serial) => ({
            _id: serial._id,
            serialNo: serial.serialNo || serial.serialNumber,
            status: serial.status,
          })));
        }
      })
      .catch((error) => {
        console.error('Failed to load dispatched serial numbers:', error);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [productId]);

  const selectedSerialLabels = selectedSerials.map((serialId) =>
    serials.find((serial) => serial._id === serialId)?.serialNo || serialId,
  );
  const selectableSerials = serials.filter((serial) =>
    serial.status === 'sold' || serial.status === 'dispatched' || selectedSerials.includes(serial._id),
  );

  return (
    <div className="mt-2 space-y-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
        Returned serials ({selectedSerials.length}/{quantity})
      </label>
      {selectedSerialLabels.length > 0 && (
        <p className="text-xs text-slate-700 dark:text-slate-200">
          Selected: {selectedSerialLabels.join(', ')}
        </p>
      )}
      <select
        multiple
        size={Math.min(Math.max(quantity, 3), 6)}
        value={selectedSerials}
        onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value).slice(0, quantity))}
        disabled={loading || (quantity <= 0 && selectedSerials.length === 0)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        aria-label={`Select ${quantity} returned serial number(s)`}
      >
        {selectableSerials.map((serial) => (
          <option key={serial._id} value={serial._id} disabled={serial.status !== 'sold' && serial.status !== 'dispatched'}>
            {serial.serialNo}{serial.status === 'sold' || serial.status === 'dispatched' ? '' : ' (already returned)'}
          </option>
        ))}
      </select>
      {loading && <p className="text-xs text-slate-500">Loading dispatched serial numbers...</p>}
      {loadError && <p role="alert" className="text-xs text-rose-600">Could not load dispatched serial numbers. Reopen the credit note and retry.</p>}
      {!loading && !loadError && selectableSerials.filter((serial) => serial.status === 'sold' || serial.status === 'dispatched').length === 0 && (
        <p className="text-xs text-amber-700">
          {serials.length === 0
            ? 'No serial records were found for this product. Verify the delivery note recorded its serials.'
            : 'No dispatched serial numbers are available. Verify the delivery note was confirmed.'}
        </p>
      )}
    </div>
  );
}

function CreditNoteBatchSelector({
  productId,
  selectedBatchId,
  quantity,
  onChange,
}: {
  productId: string;
  selectedBatchId?: string;
  quantity: number;
  onChange: (batchId: string) => void;
}) {
  const [batches, setBatches] = useState<Array<{ _id: string; batchNo: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    stockBatchApi.getAll({ product: productId, limit: 500 })
      .then((response) => {
        if (!response.success) throw new Error('Could not load batches for return.');
        if (active) {
          setBatches(response.data.map((batch) => ({
            _id: batch._id,
            batchNo: batch.batchNo,
          })));
        }
      })
      .catch((error) => {
        console.error('Failed to load batches for credit note:', error);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [productId]);

  const selectedBatchNo = batches.find((batch) => batch._id === selectedBatchId)?.batchNo;
  const selectedBatchUnavailable = Boolean(selectedBatchId && !selectedBatchNo);

  return (
    <div className="mt-2 space-y-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
        Returned batch{selectedBatchNo ? `: ${selectedBatchNo}` : selectedBatchId ? `: ${selectedBatchId}` : ''}
      </label>
      <select
        value={selectedBatchId || ''}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={loading || (quantity <= 0 && !selectedBatchId)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        aria-label="Select returned batch"
      >
        <option value="">Select returned batch</option>
        {selectedBatchUnavailable && (
          <option value={selectedBatchId} disabled>{selectedBatchId} (saved selection)</option>
        )}
        {batches.map((batch) => (
          <option key={batch._id} value={batch._id}>{batch.batchNo}</option>
        ))}
      </select>
      {loading && <p className="text-xs text-slate-500">Loading batches...</p>}
      {loadError && <p role="alert" className="text-xs text-rose-600">Could not load batches. Reopen the credit note and retry.</p>}
      {!loading && !loadError && batches.length === 0 && !selectedBatchId && (
        <p className="text-xs text-amber-700">No batches were found for this product.</p>
      )}
    </div>
  );
}

export default function CreditNoteCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoice') || '';
  const preselectedReason = searchParams.get('reason') || '';
  const isEdit = !!id;
  const { currency: companyCurrency } = useCompany();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Form fields
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'goods_return' | 'price_adjustment' | 'cancelled_order'>('goods_return');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<CreditNoteLine[]>([]);
  const [sendEmail, setSendEmail] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await invoicesApi.getAll({ 
        status: 'confirmed,partially_paid,fully_paid,posted', 
        limit: 200 
      });
      console.log('[CreditNoteCreate] Invoices API response:', response);
      
      if (response.success && response.data) {
        const data = response.data as any;
        // Handle various response structures
        let invoiceData = [];
        if (Array.isArray(data)) {
          invoiceData = data;
        } else if (data.data && Array.isArray(data.data)) {
          invoiceData = data.data;
        } else if (data.invoices && Array.isArray(data.invoices)) {
          invoiceData = data.invoices;
        } else if (data.results && Array.isArray(data.results)) {
          invoiceData = data.results;
        }
        
        console.log('[CreditNoteCreate] Extracted invoices:', invoiceData.length);
        setInvoices(invoiceData as Invoice[]);
      }
    } catch (error) {
      console.error('[CreditNoteCreate] Error fetching invoices:', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const data = response.data as any;
        const warehouseData = Array.isArray(data) ? data : (data.warehouses || []);
        setWarehouses(warehouseData as Warehouse[]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  }, []);

  const fetchCreditNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await creditNotesApi.getById(id);
      if (response.success && response.data) {
        const cn = response.data as CreditNote;
        setCreditNote(cn);
        setSelectedInvoice(cn.invoice?._id || '');
        setCreditDate(cn.creditDate ? new Date(cn.creditDate).toISOString().split('T')[0] : '');
        setType(cn.type);
        setReason(cn.reason || '');
        setNotes(cn.notes || '');
        
        // If credit note has lines, use them; otherwise populate from invoice
        if (cn.lines && cn.lines.length > 0) {
          // Normalize product field to ensure it's an object with _id
          const normalizedLines = cn.lines.map((line: any) => ({
            ...line,
            product: typeof line.product === 'string'
              ? { _id: line.product, name: line.productName || '', code: line.productCode || '' }
              : line.product || { _id: '', name: '', code: '' },
          }));
          setLines(normalizedLines);
        } else if (cn.invoice?._id) {
          // Auto-populate lines from invoice
          const invoice = invoices.find(inv => inv._id === cn.invoice?._id);
          if (invoice && invoice.lines) {
            const creditNoteLines: CreditNoteLine[] = invoice.lines.map((line: any) => ({
              invoiceLineId: line._id || line.lineId,
              product: typeof line.product === 'string'
                ? { _id: line.product, name: line.productName || '', code: line.productCode || '' }
                : line.product || { _id: '', name: '', code: '' },
              productName: line.productName || line.product?.name || '',
              productCode: line.productCode || line.product?.code || '',
              originalQty: line.quantity || 0,
              quantity: 0,
              unitPrice: toNumber(line.unitPrice) || 0,
              unitCost: toNumber(line.unitCost) || toNumber(line.product?.averageCost) || 0,
              taxRate: toNumber(line.taxRate) || 0,
              lineSubtotal: 0,
              lineTax: 0,
              lineTotal: 0,
              batchId: line.batchId || undefined,
              serialNumbers: line.serialNumbers || [],
            }));
            setLines(creditNoteLines);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit note:', error);
    } finally {
      setLoading(false);
    }
  }, [id, invoices]);

  useEffect(() => {
    fetchInvoices();
    fetchWarehouses();
  }, [fetchInvoices, fetchWarehouses]);

  useEffect(() => {
    if (id) {
      fetchCreditNote();
    }
  }, [id, fetchCreditNote]);

  const mapInvoiceLines = (invoice: Invoice): CreditNoteLine[] => invoice.lines.map((line: any) => ({
    invoiceLineId: line._id || line.lineId,
    product: typeof line.product === 'string'
      ? { _id: line.product, name: line.productName || '', code: line.productCode || '' }
      : line.product || { _id: '', name: '', code: '' },
    productName: line.productName || line.product?.name || '',
    productCode: line.productCode || line.product?.code || '',
    originalQty: line.quantity || line.qty || 0,
    quantity: 0,
    unitPrice: toNumber(line.unitPrice) || 0,
    unitCost: toNumber(line.unitCost) || toNumber(line.product?.averageCost) || 0,
    taxRate: toNumber(line.taxRate) || 0,
    lineSubtotal: 0,
    lineTax: 0,
    lineTotal: 0,
    batchId: line.batchId || undefined,
    serialNumbers: line.serialNumbers || [],
  }));

  const handleInvoiceSelect = useCallback(async (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    if (!invoiceId) {
      setLines([]);
      return;
    }

    const invoice = invoices.find(inv => inv._id === invoiceId);
    if (invoice?.lines?.length) {
      setLines(mapInvoiceLines(invoice));
      return;
    }

    try {
      const response = await invoicesApi.getById(invoiceId, { refresh: true });
      const invoiceData = response.data as Invoice | undefined;
      if (!response.success || !invoiceData || !Array.isArray(invoiceData.lines)) {
        throw new Error('The selected invoice could not be loaded with its line items.');
      }
      setLines(mapInvoiceLines(invoiceData));
    } catch (error) {
      console.error('[CreditNoteCreate] Failed to load selected invoice lines:', error);
      setLines([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load selected invoice lines.');
    }
  }, [invoices]);

  useEffect(() => {
    if (isEdit || !preselectedInvoiceId) return;
    setReason(preselectedReason);
    void handleInvoiceSelect(preselectedInvoiceId);
  }, [handleInvoiceSelect, invoices, isEdit, preselectedInvoiceId, preselectedReason]);

  const handleLineChange = (index: number, field: string, value: any) => {
    const updatedLines = [...lines];
    const line = { ...updatedLines[index] };
    
    if (field === 'quantity') {
      const enteredQty = Math.max(0, parseFloat(value) || 0);
      // Validate: credited qty cannot exceed original invoice qty
      const maxQty = toNumber(line.originalQty);
      line.quantity = Math.min(enteredQty, maxQty);
      line.serialNumbers = (line.serialNumbers || []).slice(0, line.quantity);
    } else if (field === 'returnToWarehouse') {
      line.returnToWarehouse = value;
    } else if (field === 'batchId') {
      line.batchId = value;
    } else if (field === 'serialNumbers') {
      line.serialNumbers = value;
    }
    
    // Recalculate totals using toNumber for Decimal handling
    const quantity = toNumber(line.quantity);
    const unitPrice = toNumber(line.unitPrice);
    const taxRate = toNumber(line.taxRate);
    
    line.lineSubtotal = quantity * unitPrice;
    line.lineTax = line.lineSubtotal * (taxRate / 100);
    line.lineTotal = line.lineSubtotal + line.lineTax;
    
    updatedLines[index] = line;
    setLines(updatedLines);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + toNumber(line.lineSubtotal), 0);
    const taxAmount = lines.reduce((sum, line) => sum + toNumber(line.lineTax), 0);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || companyCurrency || 'RWF';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount || 0);
  };

  const handleSave = async () => {
    if (!reason) {
      alert(t('creditNotes.reasonRequired', 'Reason is required'));
      return;
    }
    const creditLines = lines.filter((line) => toNumber(line.quantity) > 0);
    if (creditLines.length === 0) {
      alert('Add at least one invoice line and enter the quantity to credit.');
      return;
    }
    if (type === 'goods_return') {
      const missingSerials = creditLines.find((line) =>
        line.product?.trackingType === 'serial' &&
        (line.serialNumbers || []).length !== toNumber(line.quantity),
      );
      if (missingSerials) {
        toast.error(`Select exactly ${toNumber(missingSerials.quantity)} serial number(s) for ${missingSerials.productName}.`);
        return;
      }
      const missingBatch = creditLines.find((line) =>
        line.product?.trackingType === 'batch' && !line.batchId,
      );
      if (missingBatch) {
        toast.error(`Select the returned batch for ${missingBatch.productName}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        invoice: selectedInvoice,
        creditDate,
        type,
        reason,
        notes,
        currencyCode: companyCurrency || 'RWF',
        lines: creditLines.map(line => ({
          invoiceLineId: line.invoiceLineId,
          product: typeof line.product === 'string' ? line.product : line.product?._id,
          productName: line.productName,
          productCode: line.productCode,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
          lineSubtotal: line.lineSubtotal,
          lineTax: line.lineTax,
          lineTotal: line.lineTotal,
          returnToWarehouse: line.returnToWarehouse,
          batchId: line.batchId || null,
          serialNumbers: line.serialNumbers || [],
        })),
      };

      let response;
      if (isEdit) {
        response = await creditNotesApi.update(id!, payload);
      } else {
        response = await creditNotesApi.create(payload, sendEmail);
      }

      if (response.success && response.data) {
        const savedCN = response.data as CreditNote;
        navigate(`/credit-notes/${savedCN._id}`);
      }
    } catch (error) {
      console.error('Failed to save credit note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save credit note.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    if (!reason) {
      alert(t('creditNotes.reasonRequired', 'Reason is required'));
      return;
    }
    const missingSerials = type === 'goods_return' && lines.find((line) =>
      toNumber(line.quantity) > 0 &&
      line.product?.trackingType === 'serial' &&
      (line.serialNumbers || []).length !== toNumber(line.quantity),
    );
    if (missingSerials) {
      toast.error(`Select exactly ${toNumber(missingSerials.quantity)} serial number(s) for ${missingSerials.productName}, then save the credit note.`);
      return;
    }
    const missingBatch = type === 'goods_return' && lines.find((line) =>
      toNumber(line.quantity) > 0 &&
      line.product?.trackingType === 'batch' &&
      !line.batchId,
    );
    if (missingBatch) {
      toast.error(`Select the returned batch for ${missingBatch.productName}, then save the credit note.`);
      return;
    }

    setConfirming(true);
    try {
      const response = await creditNotesApi.confirm(id, sendEmail);
      if (response.success) {
        navigate(`/credit-notes/${id}`);
      }
    } catch (error) {
      console.error('Failed to confirm credit note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to confirm credit note.');
    } finally {
      setConfirming(false);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px] space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-80 w-full rounded-xl" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/credit-notes')} className="h-8 w-8 p-0 dark:text-slate-300">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                      {isEdit ? 'Edit Credit Note' : 'Create Credit Note'}
                    </h1>
                    {creditNote && <p className="text-sm text-slate-500 dark:text-slate-400">{creditNote.referenceNo}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !selectedInvoice} className="gap-1.5 dark:border-slate-700 dark:text-slate-200">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  {isEdit && creditNote?.status === 'draft' && (
                    <Button size="sm" onClick={handleConfirm} disabled={confirming || !reason || lines.every(l => l.quantity === 0)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="h-4 w-4" />
                      {confirming ? 'Confirming...' : 'Confirm'}
                    </Button>
                  )}
                </div>
              </div>
              {isEdit && creditNote?.status === 'draft' && (
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <input type="checkbox" id="sendEmailConfirm" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4" />
                  <Label htmlFor="sendEmailConfirm" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">Send Email to Customer</Label>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Main Form */}
            <div className="space-y-6 xl:col-span-2">
              {/* Basic Info */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-slate-50 p-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <FileText className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">Basic Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-slate-700 dark:text-slate-300">Invoice *</Label>
                      <Select value={selectedInvoice} onValueChange={handleInvoiceSelect} disabled={isEdit}>
                        <SelectTrigger className="bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                          <SelectValue placeholder="Select Invoice" />
                        </SelectTrigger>
                        <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                          {invoices.map(inv => (
                            <SelectItem key={inv._id} value={inv._id} className="dark:text-slate-200">{inv.referenceNo} - {inv.client?.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-slate-700 dark:text-slate-300">Type *</Label>
                      <Select value={type} onValueChange={(v) => setType(v as any)}>
                        <SelectTrigger className="bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                          {TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="dark:text-slate-200">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-slate-700 dark:text-slate-300">Credit Date</Label>
                      <Input type="date" value={creditDate} onChange={(e) => setCreditDate(e.target.value)} className="bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-slate-700 dark:text-slate-300">Reason *</Label>
                      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for credit note" className="bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-700 dark:text-slate-300">Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" className="resize-none bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              {type === 'goods_return' && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        <Package className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base text-slate-900 dark:text-white">Line Items</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {lines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                        <Package className="mb-2 h-8 w-8 opacity-40" />
                        <p className="text-sm">Select an invoice to see line items</p>
                      </div>
                    ) : (
                      <>
                      <div className="space-y-3 p-3 xl:hidden">
                        {lines.map((line, index) => <article key={line.invoiceLineId} className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900"><div><h3 className="font-medium text-slate-900 dark:text-white">{line.productName}</h3><p className="text-xs text-slate-500">{line.productCode}</p></div><dl className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><div><dt className="text-slate-500">Invoiced qty</dt><dd>{toNumber(line.originalQty)}</dd></div><div><dt className="text-slate-500">Unit price</dt><dd>{formatCurrency(line.unitPrice)}</dd></div><div><dt className="text-slate-500">Tax</dt><dd>{toNumber(line.taxRate)}%</dd></div></dl><label className="block space-y-1 text-xs text-slate-500">Quantity to credit<Input type="number" min="0" max={toNumber(line.originalQty)} value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', e.target.value)} /></label><div className="space-y-1 text-xs text-slate-500">Return to warehouse<Select value={line.returnToWarehouse || ''} onValueChange={(value) => handleLineChange(index, 'returnToWarehouse', value)}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map((wh) => <SelectItem key={wh._id} value={wh._id}>{wh.name}</SelectItem>)}</SelectContent></Select></div>{line.product?.trackingType === 'batch' && <CreditNoteBatchSelector productId={line.product._id} selectedBatchId={line.batchId} quantity={toNumber(line.quantity)} onChange={(batchId) => handleLineChange(index, 'batchId', batchId)} />}{line.product?.trackingType === 'serial' && <CreditNoteSerialSelector productId={line.product._id} selectedSerials={line.serialNumbers || []} quantity={toNumber(line.quantity)} onChange={(serials) => handleLineChange(index, 'serialNumbers', serials)} />}<p className="border-t border-slate-200 pt-2 text-right text-sm font-semibold dark:border-slate-700">{formatCurrency(line.lineTotal)}</p></article>)}
                      </div>
                      <div className="hidden overflow-x-auto xl:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                              <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Product</TableHead>
                              <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Invoiced</TableHead>
                              <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Price</TableHead>
                              <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Tax</TableHead>
                              <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Qty to Credit</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Return To</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Returned Batch</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Returned Serials</TableHead>
                              <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line, index) => (
                              <TableRow key={line.invoiceLineId} className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50">
                                <TableCell>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">{line.productName}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{line.productCode}</div>
                                </TableCell>
                                <TableCell className="text-right text-sm text-slate-500 dark:text-slate-400">{toNumber(line.originalQty)}</TableCell>
                                <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatCurrency(line.unitPrice)}</TableCell>
                                <TableCell className="text-right text-sm text-slate-900 dark:text-white">{toNumber(line.taxRate)}%</TableCell>
                                <TableCell>
                                  <Input type="number" min="0" max={toNumber(line.originalQty)} value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', e.target.value)} className="w-20 text-right bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder={`Max: ${toNumber(line.originalQty)}`} />
                                </TableCell>
                                <TableCell>
                                  <Select value={line.returnToWarehouse || ''} onValueChange={(v) => handleLineChange(index, 'returnToWarehouse', v)}>
                                    <SelectTrigger className="w-[130px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                                      {warehouses.map(wh => (
                                        <SelectItem key={wh._id} value={wh._id} className="dark:text-slate-200">{wh.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  {line.product?.trackingType === 'batch' && (
                                    <CreditNoteBatchSelector
                                      productId={line.product._id}
                                      selectedBatchId={line.batchId}
                                      quantity={toNumber(line.quantity)}
                                      onChange={(batchId) => handleLineChange(index, 'batchId', batchId)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {line.product?.trackingType === 'serial' && (
                                    <CreditNoteSerialSelector
                                      productId={line.product._id}
                                      selectedSerials={line.serialNumbers || []}
                                      quantity={toNumber(line.quantity)}
                                      onChange={(serials) => handleLineChange(index, 'serialNumbers', serials)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(line.lineTotal)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {type === 'price_adjustment' && (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-cyan-50 p-1.5 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base text-slate-900 dark:text-white">Price Adjustments</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                      <DollarSign className="mb-2 h-8 w-8 opacity-40" />
                      <p className="text-sm">Price adjustments can be added after selecting an invoice</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">Summary</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tax</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalAmount)}</span>
                  </div>
                  {creditNote && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                      <Badge variant={creditNote.status === 'draft' ? 'secondary' : 'default'} className="dark:border-slate-700">
                        {creditNote.status}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="space-y-3 p-4">
                  <Button onClick={handleSave} disabled={saving || !selectedInvoice} variant="outline" className="w-full gap-1.5 dark:border-slate-700 dark:text-slate-200">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  {isEdit && creditNote?.status === 'draft' && (
                    <Button onClick={handleConfirm} disabled={confirming || !reason || lines.every(l => l.quantity === 0)} className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="h-4 w-4" />
                      {confirming ? 'Confirming...' : 'Confirm & Post'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
