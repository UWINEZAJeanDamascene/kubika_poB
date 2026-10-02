import { useState, useEffect, useCallback } from 'react';
import { prepaidExpenseApi } from '@/lib/api';
import type { PrepaidExpense } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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
  Plus, Loader2, Calendar, Wallet, TrendingDown, CheckCircle2,
  Clock, AlertCircle, Search, RefreshCcw, Receipt, Trash2, FileCheck,
  ArrowRight, Banknote, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface AmortizationEntry {
  _id: string;
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'posted' | 'reversed';
  journalEntryId?: { _id: string; entryNumber: string; date: string; status: string } | null;
}

const EXPENSE_ACCOUNTS = [
  { code: '5400', name: 'Salaries & Wages' },
  { code: '5500', name: 'Rent' },
  { code: '5600', name: 'Utilities' },
  { code: '5650', name: 'Travel & Local Transport' },
  { code: '5700', name: 'Transport' },
  { code: '5710', name: 'Repairs & Maintenance' },
  { code: '5800', name: 'Depreciation' },
  { code: '5850', name: 'Marketing' },
  { code: '5910', name: 'Miscellaneous Expenses' },
  { code: '5930', name: 'Staff Welfare & Entertainment' },
  { code: '6000', name: 'Interest Expense' },
  { code: '6100', name: 'Other Expenses' },
  { code: '6200', name: 'Bank Charges' },
  { code: '5610', name: 'Office Supplies' },
  { code: '5550', name: 'Communication' },
];

export default function PrepaidExpensesTab() {
  const [prepaids, setPrepaids] = useState<PrepaidExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vendor: '',
    description: '',
    totalAmount: '',
    expenseAccountCode: '5500',
    paymentMethod: 'cash',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    frequency: 'monthly',
    notes: '',
  });

  const fetchPrepaids = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const response: any = await prepaidExpenseApi.getAll(params);
      if (response.success) {
        setPrepaids(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch prepaid expenses:', error);
      toast.error('Failed to load prepaid expenses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchPrepaids();
  }, [fetchPrepaids]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.totalAmount || parseFloat(form.totalAmount) <= 0 || !form.endDate) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }
    setSubmitting(true);
    try {
      const response: any = await prepaidExpenseApi.create({
        vendor: form.vendor,
        description: form.description,
        totalAmount: parseFloat(form.totalAmount),
        expenseAccountCode: form.expenseAccountCode,
        paymentMethod: form.paymentMethod,
        startDate: form.startDate,
        endDate: form.endDate,
        frequency: form.frequency,
        notes: form.notes,
      });
      if (response.success) {
        toast.success(response.message || 'Prepaid expense recorded');
        setShowCreateDialog(false);
        setForm({
          vendor: '',
          description: '',
          totalAmount: '',
          expenseAccountCode: '5500',
          paymentMethod: 'cash',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          frequency: 'monthly',
          notes: '',
        });
        fetchPrepaids();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record prepaid expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostAmortization = async (prepaidId: string, amortizationId: string) => {
    try {
      const response: any = await prepaidExpenseApi.postAmortization(prepaidId, amortizationId);
      if (response.success) {
        toast.success('Amortization posted successfully');
        fetchPrepaids();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post amortization');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prepaid expense?')) return;
    try {
      const response: any = await prepaidExpenseApi.delete(id);
      if (response.success) {
        toast.success('Prepaid expense deleted');
        fetchPrepaids();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete');
    }
  };

  const totalActive = prepaids
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + p.remainingBalance, 0);
  const totalAmortized = prepaids.reduce((sum, p) => sum + p.totalAmortized, 0);
  const totalPrepaid = prepaids.reduce((sum, p) => sum + p.totalAmount, 0);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: any }> = {
      active: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', icon: Clock },
      fully_amortized: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', icon: CheckCircle2 },
      cancelled: { className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300', icon: AlertCircle },
    };
    const cfg = config[status] || config.active;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1 font-medium border-0 ${cfg.className}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatRWF = (amount: number) =>
    new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background border-indigo-100">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Prepaid</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">{formatRWF(totalPrepaid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Remaining Balance</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatRWF(totalActive)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background border-emerald-100">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Amortized</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatRWF(totalAmortized)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'fully_amortized'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <div className="mobile-action-row grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
          <div className="relative min-w-0 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchPrepaids} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Record Prepayment
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          ) : prepaids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No prepaid expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold w-8"></TableHead>
                    <TableHead className="text-xs font-semibold">Ref</TableHead>
                    <TableHead className="text-xs font-semibold">Vendor</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold">Amount</TableHead>
                    <TableHead className="text-xs font-semibold">Remaining</TableHead>
                    <TableHead className="text-xs font-semibold">Period</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prepaids.map((prepaid) => (
                    <>
                      <TableRow
                        key={prepaid._id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === prepaid._id ? null : prepaid._id)}
                      >
                        <TableCell>
                          {expandedId === prepaid._id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{prepaid.referenceNo}</TableCell>
                        <TableCell className="text-sm">{prepaid.vendor || '-'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{prepaid.description}</TableCell>
                        <TableCell className="text-sm font-medium">{formatRWF(prepaid.totalAmount)}</TableCell>
                        <TableCell className="text-sm font-semibold text-amber-600">{formatRWF(prepaid.remainingBalance)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(prepaid.startDate).toLocaleDateString()} → {new Date(prepaid.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(prepaid.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {prepaid.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(prepaid._id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === prepaid._id && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={9} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-indigo-500" />
                                  Amortization Schedule
                                </h4>
                                <div className="text-xs text-muted-foreground">
                                  {prepaid.frequency} · {EXPENSE_ACCOUNTS.find(a => a.code === prepaid.expenseAccountCode)?.name || prepaid.expenseAccountCode}
                                </div>
                              </div>
                              <div className="rounded-md border overflow-hidden">
                                <Table className="min-w-[760px]">
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs">#</TableHead>
                                      <TableHead className="text-xs">Date</TableHead>
                                      <TableHead className="text-xs">Description</TableHead>
                                      <TableHead className="text-xs">Amount</TableHead>
                                      <TableHead className="text-xs">Status</TableHead>
                                      <TableHead className="text-xs text-right">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {prepaid.amortizations.map((amort: AmortizationEntry, idx: number) => {
                                      const isDue = new Date(amort.date).getTime() <= Date.now();
                                      return (
                                      <TableRow key={amort._id} className="hover:bg-muted/30">
                                        <TableCell className="text-sm">{idx + 1}</TableCell>
                                        <TableCell className="text-sm">{new Date(amort.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-sm">{amort.description}</TableCell>
                                        <TableCell className="text-sm font-medium">{formatRWF(amort.amount)}</TableCell>
                                        <TableCell>
                                          {amort.status === 'posted' ? (
                                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-0 font-medium">
                                              <CheckCircle2 className="h-3 w-3 mr-1" /> Posted
                                            </Badge>
                                          ) : isDue ? (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-0 font-medium">
                                              <Clock className="h-3 w-3 mr-1" /> Due
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-0 font-medium">
                                              <Clock className="h-3 w-3 mr-1" /> Scheduled
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {amort.status === 'pending' && prepaid.status === 'active' && isDue && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handlePostAmortization(prepaid._id, amort._id)}
                                            >
                                              <FileCheck className="h-3 w-3 mr-1" />
                                              Post
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Record Prepaid Expense
            </DialogTitle>
            <DialogDescription>
              Record a payment made in advance for future expenses.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                placeholder="e.g. Kigali Office Park Ltd"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g. Annual office rent"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0"
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseAccountCode">Expense Account *</Label>
                <Select value={form.expenseAccountCode} onValueChange={(v) => setForm({ ...form, expenseAccountCode: v })}>
                  <SelectTrigger id="expenseAccountCode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_ACCOUNTS.map((a) => (
                      <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Record Prepayment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
