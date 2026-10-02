import { useState, useEffect, useCallback } from 'react';
import { deferredRevenueApi, type DeferredRevenue } from '@/lib/api';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/app/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/app/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/app/components/ui/select';
import {
  Plus, Loader2, Wallet, TrendingDown, CheckCircle2,
  Clock, AlertCircle, Search, RefreshCcw, Receipt, Trash2, FileCheck,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { bankAccountsApi, type BankAccount } from '@/lib/api';

interface RecognitionEntry {
  _id: string;
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'posted' | 'reversed';
  journalEntryId?: { _id: string; entryNumber: string; date: string; status: string } | null;
}

const REVENUE_ACCOUNTS = [
  { code: '4000', name: 'Sales Revenue' },
  { code: '4050', name: 'Service Revenue' },
  { code: '4100', name: 'Consulting Revenue' },
  { code: '4200', name: 'Other Income' },
  { code: '4300', name: 'Interest Income' },
];

export default function DeferredRevenueTab() {
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<DeferredRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer: '',
    description: '',
    totalAmount: '',
    revenueAccountCode: '4050',
    paymentMethod: 'cash',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    frequency: 'monthly',
    notes: '',
    bankAccountId: '',
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const response: any = await deferredRevenueApi.getAll(params);
      if (response.success) {
        setItems(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch deferred revenue:', error);
      toast.error('Failed to load deferred revenue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response: any = await bankAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.totalAmount || parseFloat(form.totalAmount) <= 0 || !form.endDate) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }
    const needsBankAccount = form.paymentMethod === 'bank_transfer' || form.paymentMethod === 'cheque' || form.paymentMethod === 'mobile_money';
    if (needsBankAccount && !form.bankAccountId) {
      toast.error('Please select a bank account for this payment method');
      return;
    }
    setSubmitting(true);
    try {
      const response: any = await deferredRevenueApi.create({
        customer: form.customer,
        description: form.description,
        totalAmount: parseFloat(form.totalAmount),
        revenueAccountCode: form.revenueAccountCode,
        paymentMethod: form.paymentMethod,
        bankAccountId: form.bankAccountId || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        frequency: form.frequency,
        notes: form.notes,
      });
      if (response.success) {
        toast.success(response.message || 'Deferred revenue recorded');
        setShowCreateDialog(false);
        setForm({
          customer: '',
          description: '',
          totalAmount: '',
          revenueAccountCode: '4050',
          paymentMethod: 'cash',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          frequency: 'monthly',
          notes: '',
          bankAccountId: '',
        });
        fetchItems();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record deferred revenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostRecognition = async (itemId: string, recognitionId: string) => {
    try {
      const response: any = await deferredRevenueApi.postRecognition(itemId, recognitionId);
      if (response.success) {
        toast.success('Revenue recognized successfully');
        fetchItems();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to recognize revenue');
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    try {
      const response: any = await deferredRevenueApi.delete(itemToDelete);
      if (response.success) {
        toast.success('Deleted successfully');
        fetchItems();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    } finally {
      setSubmitting(false);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      active: { variant: 'outline', label: 'Active' },
      fully_recognized: { variant: 'default', label: 'Fully Recognized' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const c = config[status] || { variant: 'outline', label: status };
    return <Badge variant={c.variant as any}>{c.label}</Badge>;
  };

  const totalDeferred = items.reduce((s, i) => s + i.totalAmount, 0);
  const totalRecognized = items.reduce((s, i) => s + i.totalRecognized, 0);
  const totalRemaining = items.reduce((s, i) => s + i.remainingBalance, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Items</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Deferred</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalDeferred)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recognized</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalRecognized)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalRemaining)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by customer, description, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 bg-white pl-9 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-40 bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                  <SelectItem value="all" className="dark:text-slate-200">All Status</SelectItem>
                  <SelectItem value="active" className="dark:text-slate-200">Active</SelectItem>
                  <SelectItem value="fully_recognized" className="dark:text-slate-200">Fully Recognized</SelectItem>
                  <SelectItem value="cancelled" className="dark:text-slate-200">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchItems} className="h-10 gap-1 dark:text-slate-200">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-10 gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Record Prepayment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg">
                  <div className="h-10 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-10 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="hidden h-10 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700 sm:block" />
                  <div className="ml-auto h-10 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                <Receipt className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No deferred revenue items</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record a customer prepayment to get started</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4 gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Record Prepayment
              </Button>
            </div>
          ) : (
            <>
            <div className="space-y-3 p-3 xl:hidden">
              {items.map((item) => <article key={item._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900 dark:text-white">{item.referenceNo}</h3><p className="text-sm text-slate-500">{item.customer || '-'}</p></div>{getStatusBadge(item.status)}</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.startDate)} – {formatDate(item.endDate)}</p><div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm dark:border-slate-700"><span>{formatCurrency(item.remainingBalance)} remaining</span><strong>{formatCurrency(item.totalAmount)}</strong></div><div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}>{expandedId === item._id ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}{expandedId === item._id ? 'Hide schedule' : 'Schedule'}</Button><Button size="sm" variant="outline" onClick={() => handleDeleteClick(item._id)}><Trash2 className="mr-1 h-4 w-4 text-rose-600" />Delete</Button></div>{expandedId === item._id && <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700"><h4 className="text-sm font-semibold">Recognition Schedule</h4>{item.recognitions?.length ? item.recognitions.map((rec: RecognitionEntry, idx: number) => <div key={rec._id} className="rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-950"><div className="flex justify-between gap-2"><span>Period {idx + 1} · {formatDate(rec.date)}</span><span>{getStatusBadge(rec.status)}</span></div><div className="mt-2 flex items-center justify-between gap-2"><span>{formatCurrency(rec.amount)}{rec.journalEntryId ? ` · ${rec.journalEntryId.entryNumber}` : ''}</span>{rec.status === 'pending' && item.status !== 'cancelled' && <Button size="sm" className="h-7" onClick={() => handlePostRecognition(item._id, rec._id)}><FileCheck className="mr-1 h-3 w-3" />Recognize</Button>}</div></div>) : <p className="text-xs text-slate-500">No recognition schedule generated.</p>}</div>}</article>)}
            </div>
            <div className="hidden overflow-x-auto xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ref</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</TableHead>
                    <TableHead className="hidden text-xs font-semibold text-slate-500 dark:text-slate-400 lg:table-cell">Period</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <>
                      <TableRow
                        key={item._id}
                        className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                      >
                        <TableCell className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {item.referenceNo}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{item.customer || '-'}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 max-w-xs truncate">{item.description}</TableCell>
                        <TableCell className="hidden text-slate-500 dark:text-slate-400 lg:table-cell">
                          {formatDate(item.startDate)} – {formatDate(item.endDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.remainingBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === item._id ? null : item._id); }}
                            >
                              {expandedId === item._id ? (
                                <ChevronUp className="h-4 w-4 text-slate-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(item._id); }}
                            >
                              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === item._id && (
                        <TableRow className="border-b-slate-100 dark:border-b-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
                          <TableCell colSpan={8} className="p-0">
                            <div className="p-4">
                              <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                                Recognition Schedule
                              </h4>
                              {item.recognitions && item.recognitions.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-slate-100 dark:bg-slate-800">
                                        <TableHead className="text-xs text-slate-500 dark:text-slate-400">Period</TableHead>
                                        <TableHead className="text-xs text-slate-500 dark:text-slate-400">Date</TableHead>
                                        <TableHead className="text-right text-xs text-slate-500 dark:text-slate-400">Amount</TableHead>
                                        <TableHead className="text-xs text-slate-500 dark:text-slate-400">Status</TableHead>
                                        <TableHead className="text-xs text-slate-500 dark:text-slate-400">Journal Entry</TableHead>
                                        <TableHead className="text-right text-xs text-slate-500 dark:text-slate-400">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.recognitions.map((rec: RecognitionEntry, idx: number) => (
                                        <TableRow key={rec._id} className="border-b-slate-100 dark:border-b-slate-700/50">
                                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{idx + 1}</TableCell>
                                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatDate(rec.date)}</TableCell>
                                          <TableCell className="text-right text-sm font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(rec.amount)}
                                          </TableCell>
                                          <TableCell>
                                            {rec.status === 'posted' ? (
                                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <CheckCircle2 className="h-3 w-3" /> Posted
                                              </span>
                                            ) : rec.status === 'pending' ? (
                                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                                                <Clock className="h-3 w-3" /> Pending
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {rec.status}
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                            {rec.journalEntryId ? (
                                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{rec.journalEntryId.entryNumber}</span>
                                            ) : (
                                              '-'
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {rec.status === 'pending' && item.status !== 'cancelled' && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                                                onClick={() => handlePostRecognition(item._id, rec._id)}
                                              >
                                                <FileCheck className="h-3 w-3" />
                                                Recognize
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No recognition schedule generated.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Record Deferred Revenue</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Record a customer prepayment that will be recognized over time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Customer</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Customer name"
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Total Amount *</Label>
                <Input
                  type="number"
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  placeholder="0.00"
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="dark:text-slate-200">Description *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., 6-month software subscription"
                className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Revenue Account *</Label>
                <Select value={form.revenueAccountCode} onValueChange={(v) => setForm({ ...form, revenueAccountCode: v })}>
                  <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                    {REVENUE_ACCOUNTS.map((acc) => (
                      <SelectItem key={acc.code} value={acc.code} className="dark:text-slate-200">
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v, bankAccountId: '' })}>
                  <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                    <SelectItem value="cash" className="dark:text-slate-200">Cash</SelectItem>
                    <SelectItem value="bank_transfer" className="dark:text-slate-200">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money" className="dark:text-slate-200">Mobile Money</SelectItem>
                    <SelectItem value="cheque" className="dark:text-slate-200">Cheque</SelectItem>
                    <SelectItem value="petty_cash" className="dark:text-slate-200">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(form.paymentMethod === 'bank_transfer' || form.paymentMethod === 'cheque' || form.paymentMethod === 'mobile_money') && (
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Bank Account *</Label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
                  <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id} className="dark:text-slate-200">
                        {account.name} {account.accountNumber ? `(${account.accountNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Start Date *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">End Date *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-slate-200">Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                    <SelectItem value="monthly" className="dark:text-slate-200">Monthly</SelectItem>
                    <SelectItem value="quarterly" className="dark:text-slate-200">Quarterly</SelectItem>
                    <SelectItem value="annually" className="dark:text-slate-200">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="dark:text-slate-200">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Record Prepayment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
              <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <DialogTitle className="text-center dark:text-white">Delete Deferred Revenue Item</DialogTitle>
            <DialogDescription className="text-center dark:text-slate-400">
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setItemToDelete(null); }} className="dark:border-slate-700 dark:text-slate-200">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
