import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { salesOrdersApi, clientsApi, productsApi, quotationsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import DocumentCurrencySelect from '@/app/components/DocumentCurrencySelect';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Package,
  DollarSign,
  Calculator,
  Tag,
  Layers,
  Receipt,
  Calendar,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { formatDocumentCurrency } from '@/lib/currencyUtils';

// Helper to safely convert values to numbers
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  return 0;
};

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  unit: string;
}

interface Quotation {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
  };
}

interface LineItem {
  id: string;
  product: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

export default function SalesOrderCreatePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  
  const [formData, setFormData] = useState({
    client: '',
    quotation: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    currencyCode: 'RWF',
    exchangeRate: 1,
    terms: '',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { id: '1', product: '', description: '', qty: 1, unitPrice: 0, discountPct: 0, taxRate: 0, lineTotal: 0 }
  ]);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchQuotations();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll({ limit: 1000, isActive: true });
      if (response.success) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsApi.getAll({ limit: 1000 });
      if (response.success) {
        setProducts((response.data as Product[]) || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await quotationsApi.getAll({ status: 'accepted', limit: 100 });
      if (response.success) {
        setQuotations((response.data as Quotation[]) || []);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const addLine = () => {
    const newLine: LineItem = {
      id: Date.now().toString(),
      product: '',
      description: '',
      qty: 1,
      unitPrice: 0,
      discountPct: 0,
      taxRate: 0,
      lineTotal: 0,
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      
      const updated = { ...line, [field]: value };
      
      if (field === 'product') {
        const product = products.find(p => p._id === value);
        if (product) {
          updated.description = product.name;
          updated.unitPrice = product.sellingPrice || 0;
        }
      }
      
      // Ensure all numeric values are actually numbers
      const qty = Number(updated.qty) || 0;
      const unitPrice = Number(updated.unitPrice) || 0;
      const discount = Number(updated.discountPct) || 0;
      const taxRate = Number(updated.taxRate) || 0;
      
      const subtotal = qty * unitPrice;
      const discountAmount = subtotal * (discount / 100);
      const netAmount = subtotal - discountAmount;
      const taxAmount = netAmount * (taxRate / 100);
      updated.lineTotal = netAmount + taxAmount;
      
      return updated;
    }));
  };

  const handleQuotationChange = async (quotationId: string) => {
    const actualValue = quotationId === '_none' ? '' : quotationId;
    setFormData(prev => ({ ...prev, quotation: actualValue }));
    
    if (!actualValue) return;
    
    try {
      const response = await quotationsApi.getById(quotationId);
      if (response.success) {
        const quotation = response.data as any;
        if (quotation.client?._id) {
          setFormData(prev => ({ ...prev, client: quotation.client._id }));
        }
        if (quotation.lines) {
          setLines(quotation.lines.map((line: any, index: number) => ({
            id: (index + 1).toString(),
            product: line.product?._id || line.product,
            description: line.description || line.product?.name || '',
            qty: line.qty || line.quantity || 1,
            unitPrice: line.unitPrice || 0,
            discountPct: line.discountPct || 0,
            taxRate: line.taxRate || 0,
            lineTotal: (line.qty || 1) * (line.unitPrice || 0),
          })));
        }
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
    }
  };

  const calculateTotals = () => {
    console.log('[calculateTotals] Lines:', lines);
    const subtotal = lines.reduce((sum, line) => {
      const qty = toNumber(line.qty);
      const unitPrice = toNumber(line.unitPrice);
      const discount = toNumber(line.discountPct);
      const lineSum = (qty * unitPrice) * (1 - discount / 100);
      return sum + lineSum;
    }, 0);
    const taxTotal = lines.reduce((sum, line) => {
      const qty = toNumber(line.qty);
      const unitPrice = toNumber(line.unitPrice);
      const discount = toNumber(line.discountPct);
      const taxRate = toNumber(line.taxRate);
      const netAmount = (qty * unitPrice) * (1 - discount / 100);
      const taxAmount = netAmount * (taxRate / 100);
      return sum + taxAmount;
    }, 0);
    const grandTotal = Number(subtotal) + Number(taxTotal);
    return { subtotal, taxTotal, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client) {
      toast.error('Please select a client');
      return;
    }

    if (lines.some(line => !line.product)) {
      toast.error('Please select a product for all lines');
      return;
    }

    try {
      setLoading(true);
      
      const { subtotal, taxTotal, grandTotal } = calculateTotals();
      
      const payload = {
        ...formData,
        lines: lines.map(line => ({
          product: line.product,
          description: line.description,
          qty: line.qty,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          taxRate: line.taxRate,
          lineTotal: line.lineTotal,
        })),
        subtotal,
        taxTotal,
        grandTotal,
      };

      const response = await salesOrdersApi.create(payload, sendEmail);
      
      if (response.success) {
        toast.success('Sales order created successfully');
        navigate('/sales-orders');
      }
    } catch (error: any) {
      console.error('Error creating sales order:', error);
      toast.error(error.message || 'Failed to create sales order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxTotal, grandTotal } = calculateTotals();
  const selectedClient = clients.find((c) => c._id === formData.client);

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
                    <Receipt className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Create Sales Order
                  </h1>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Draft a new sales order, add line items, and confirm to begin fulfillment.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedClient && (
                    <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                      <Layers className="mr-1 h-3 w-3" />
                      {selectedClient.name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <Calculator className="mr-1 h-3 w-3" />
                    {lines.length} line{lines.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <DollarSign className="mr-1 h-3 w-3" />
                    {formData.currencyCode}
                  </Badge>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/sales-orders')}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                    {formatDocumentCurrency(Number(subtotal) || 0, formData.currencyCode)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tax</p>
                  <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatDocumentCurrency(Number(taxTotal) || 0, formData.currencyCode)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Grand Total</p>
                  <p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatDocumentCurrency(Number(grandTotal) || 0, formData.currencyCode)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lines</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{lines.length}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Order Details */}
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-950 dark:text-white">
                      <Receipt className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      Order Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Convert from Quotation</Label>
                        <Select value={formData.quotation || '_none'} onValueChange={handleQuotationChange}>
                          <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                            <SelectValue placeholder="Select quotation (optional)" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                            <SelectItem value="_none" className="dark:focus:bg-slate-800 dark:focus:text-white">None</SelectItem>
                            {quotations.map((quotation) => (
                              <SelectItem key={quotation._id} value={quotation._id} className="dark:focus:bg-slate-800 dark:focus:text-white">
                                {quotation.referenceNo} — {quotation.client?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Client <span className="text-red-500">*</span>
                        </Label>
                        <Select value={formData.client} onValueChange={(value) => setFormData({ ...formData, client: value })}>
                          <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                            {clients.map((client) => (
                              <SelectItem key={client._id} value={client._id} className="dark:focus:bg-slate-800 dark:focus:text-white">
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Order Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={formData.orderDate}
                          onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                          required
                          className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Expected Date</Label>
                        <Input
                          type="date"
                          value={formData.expectedDate}
                          onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                          className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Currency</Label>
                        <DocumentCurrencySelect
                          value={formData.currencyCode}
                          date={formData.orderDate}
                          onChange={(currency, rateToBase) =>
                            setFormData(prev => ({ ...prev, currencyCode: currency, exchangeRate: rateToBase ?? 1 }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Terms & Conditions</Label>
                      <Textarea
                        value={formData.terms}
                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                        rows={3}
                        className="bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        className="bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-950 dark:text-white">
                      <Layers className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      Line Items
                    </CardTitle>
                    <Button type="button" onClick={addLine} variant="outline" size="sm" className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
                      <Plus className="h-4 w-4" />
                      Add Line
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Header row for desktop */}
                      <div className="hidden grid-cols-12 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400 sm:grid">
                        <div className="col-span-4">Product</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-center">Unit Price</div>
                        <div className="col-span-2 text-center">Disc %</div>
                        <div className="col-span-1 text-center">Tax %</div>
                        <div className="col-span-1 text-right">Del</div>
                      </div>

                      {lines.map((line) => (
                        <div
                          key={line.id}
                          className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-700 dark:bg-slate-900/30 sm:border-0 sm:bg-transparent sm:p-0 sm:dark:bg-transparent"
                        >
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end sm:gap-2">
                            <div className="sm:col-span-4">
                              <Label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400 sm:hidden">Product</Label>
                              <Select value={line.product} onValueChange={(value) => updateLine(line.id, 'product', value)}>
                                <SelectTrigger className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                                  {products.map((product) => (
                                    <SelectItem key={product._id} value={product._id} className="dark:focus:bg-slate-800 dark:focus:text-white">
                                      {product.name} ({product.sku})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400 sm:hidden">Qty</Label>
                              <Input
                                type="number"
                                min="1"
                                value={line.qty}
                                onChange={(e) => updateLine(line.id, 'qty', parseFloat(e.target.value) || 0)}
                                className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400 sm:hidden">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400 sm:hidden">Discount %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={line.discountPct}
                                onChange={(e) => updateLine(line.id, 'discountPct', parseFloat(e.target.value) || 0)}
                                className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                              />
                            </div>

                            <div className="sm:col-span-1">
                              <Label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400 sm:hidden">Tax %</Label>
                              <Input
                                type="number"
                                min="0"
                                value={line.taxRate}
                                onChange={(e) => updateLine(line.id, 'taxRate', parseFloat(e.target.value) || 0)}
                                className="h-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                              />
                            </div>

                            <div className="flex items-end justify-end sm:col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLine(line.id)}
                                disabled={lines.length === 1}
                                className="h-10 w-10 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                            Line Total: {' '}
                            <span className="font-bold text-slate-950 dark:text-white">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode }).format(toNumber(line.lineTotal) || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Summary */}
              <div className="space-y-6">
                <Card className="overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-950 dark:text-white">
                      <Calculator className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                      <span className="font-medium text-slate-950 dark:text-white">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode || 'USD' }).format(Number(subtotal) || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Tax</span>
                      <span className="font-medium text-slate-950 dark:text-white">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode || 'USD' }).format(Number(taxTotal) || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                      <span className="text-base font-bold text-slate-950 dark:text-white">Grand Total</span>
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode || 'USD' }).format(Number(grandTotal) || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-3">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <Label htmlFor="sendEmail" className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                        Send email notification
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="mt-3 h-11 w-full bg-indigo-600 text-base font-semibold hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Package className="mr-2 h-4 w-4" />
                          Create Sales Order
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Preview */}
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-950 dark:text-white">Order Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Lines</p>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{lines.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Currency</p>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{formData.currencyCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Order Date</p>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{formData.orderDate || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
