import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { employeeAdvanceApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../../components/ui/table';
import {
  Plus, Eye, RefreshCcw, Wallet, ArrowRight, Loader2,
  CheckCircle2, XCircle, AlertCircle, Clock, User, FileCheck,
  Banknote, Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeAdvance {
  _id: string;
  employee: { _id: string; firstName: string; lastName: string; employeeId: string };
  referenceNo: string;
  description: string;
  amount: number;
  amountRepaid: number;
  balance: number;
  issueDate: string;
  dueDate?: string;
  status: 'issued' | 'partially_repaid' | 'fully_repaid' | 'written_off';
  paymentMethod: string;
  repayments: Array<{
    amount: number;
    date: string;
    paymentMethod: string;
    notes: string;
  }>;
  notes: string;
  createdAt: string;
}

export default function EmployeeAdvancesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Settlement dialog state
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleAdvance, setSettleAdvance] = useState<EmployeeAdvance | null>(null);
  const [settleExpenseAmount, setSettleExpenseAmount] = useState('');
  const [settleExpenseAccount, setSettleExpenseAccount] = useState('5650');
  const [settleExpenseDesc, setSettleExpenseDesc] = useState('');
  const [settleRefundAmount, setSettleRefundAmount] = useState('');
  const [settleRefundMethod, setSettleRefundMethod] = useState('cash');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response: any = await employeeAdvanceApi.getAll(params);
      if (response.success) {
        setAdvances(response.data || []);
      }
    } catch (error) {
      console.error('[EmployeeAdvancesListPage] Failed to fetch advances:', error);
      toast.error(t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; className: string; label: string }> = {
      issued: { icon: Clock, className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60', label: 'Issued' },
      partially_repaid: { icon: ArrowRight, className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60', label: 'Partially Repaid' },
      fully_repaid: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60', label: 'Fully Repaid' },
      written_off: { icon: XCircle, className: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60', label: 'Written Off' },
    };
    const cfg = config[status] || config.issued;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 font-medium border-0 ${cfg.className}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {cfg.label}
      </Badge>
    );
  };

  const filteredAdvances = advances.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.referenceNo.toLowerCase().includes(term) ||
      a.employee?.firstName?.toLowerCase().includes(term) ||
      a.employee?.lastName?.toLowerCase().includes(term) ||
      a.description?.toLowerCase().includes(term)
    );
  });

  const totalOutstanding = advances
    .filter((a) => a.status === 'issued' || a.status === 'partially_repaid')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalIssued = advances.reduce((sum, a) => sum + a.amount, 0);
  const totalRepaid = advances.reduce((sum, a) => sum + a.amountRepaid, 0);

  const openSettleDialog = (advance: EmployeeAdvance) => {
    setSettleAdvance(advance);
    setSettleExpenseAmount('');
    setSettleExpenseAccount('5650');
    setSettleExpenseDesc('');
    setSettleRefundAmount(advance.balance.toString());
    setSettleRefundMethod('cash');
    setSettleNotes('');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setShowSettleDialog(true);
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleAdvance) return;

    const expAmt = parseFloat(settleExpenseAmount) || 0;
    const refAmt = parseFloat(settleRefundAmount) || 0;
    const total = expAmt + refAmt;

    if (Math.abs(total - settleAdvance.balance) > 0.01) {
      toast.error(`Expense (${expAmt}) + Refund (${refAmt}) must equal balance (${settleAdvance.balance})`);
      return;
    }

    setSettleSubmitting(true);
    try {
      const response: any = await employeeAdvanceApi.settle(settleAdvance._id, {
        expenseAmount: expAmt,
        expenseAccountCode: settleExpenseAccount,
        expenseDescription: settleExpenseDesc,
        refundAmount: refAmt,
        refundMethod: settleRefundMethod,
        notes: settleNotes,
        date: settleDate,
      });
      if (response.success) {
        toast.success(response.message || 'Advance settled successfully');
        setShowSettleDialog(false);
        fetchAdvances();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Settlement failed');
    } finally {
      setSettleSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6 text-indigo-500" />
              Employee Advances
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track and manage employee advance payments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAdvances} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/employee-advances/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New Advance
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background border-indigo-100 dark:border-indigo-900/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Issued</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {totalIssued.toLocaleString()}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-indigo-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Repaid</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {totalRepaid.toLocaleString()}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background border-amber-100 dark:border-amber-900/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {['all', 'issued', 'partially_repaid', 'fully_repaid'].map((status) => (
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
          <Input
            placeholder="Search by employee or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advances List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading advances...</span>
              </div>
            ) : filteredAdvances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wallet className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No employee advances found</p>
                <p className="text-xs mt-1">Create a new advance to get started</p>
              </div>
            ) : (
              <>
              <div className="space-y-3 p-3 xl:hidden">{filteredAdvances.map((advance) => <article key={advance._id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-mono text-sm font-semibold">{advance.referenceNo}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5 shrink-0"/>{advance.employee?.firstName} {advance.employee?.lastName}</p></div>{getStatusBadge(advance.status)}</div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs"><div className="text-muted-foreground">Amount<p className="mt-1 text-sm text-foreground">{advance.amount.toLocaleString()}</p></div><div className="text-muted-foreground">Issue date<p className="mt-1 text-sm text-foreground">{new Date(advance.issueDate).toLocaleDateString()}</p></div><div className="text-muted-foreground">Repaid<p className="mt-1 text-sm font-medium text-emerald-600">{advance.amountRepaid.toLocaleString()}</p></div><div className="text-muted-foreground">Balance<p className="mt-1 text-sm font-semibold text-amber-600">{advance.balance.toLocaleString()}</p></div></div><div className="mt-3 flex flex-wrap gap-2 border-t pt-3"><Button variant="outline" size="sm" onClick={() => navigate(`/employee-advances/${advance._id}`)}><Eye className="mr-1.5 h-4 w-4"/>View</Button>{(advance.status === 'issued' || advance.status === 'partially_repaid') && <><Button variant="outline" size="sm" onClick={() => navigate(`/employee-advances/${advance._id}/repayment`)}><ArrowRight className="mr-1.5 h-4 w-4"/>Repay</Button><Button variant="outline" size="sm" onClick={() => openSettleDialog(advance)}><FileCheck className="mr-1.5 h-4 w-4"/>Settle</Button></>}</div></article>)}</div>
              <div className="hidden overflow-x-auto xl:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold">Reference</TableHead>
                      <TableHead className="text-xs font-semibold">Employee</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Repaid</TableHead>
                      <TableHead className="text-xs font-semibold">Balance</TableHead>
                      <TableHead className="text-xs font-semibold">Issue Date</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdvances.map((advance) => (
                      <TableRow key={advance._id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{advance.referenceNo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {advance.employee?.firstName} {advance.employee?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{advance.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-emerald-600">{advance.amountRepaid.toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-semibold text-amber-600">{advance.balance.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(advance.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(advance.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/employee-advances/${advance._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(advance.status === 'issued' || advance.status === 'partially_repaid') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/employee-advances/${advance._id}/repayment`)}
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Repay
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  onClick={() => openSettleDialog(advance)}
                                >
                                  <FileCheck className="h-3 w-3 mr-1" />
                                  Settle
                                </Button>
                              </>
                            )}
                          </div>
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

        {/* Settlement Dialog */}
        <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-500" />
                Settle Advance — {settleAdvance?.referenceNo}
              </DialogTitle>
              <DialogDescription>
                Balance to clear: <strong>{settleAdvance?.balance.toLocaleString()}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expenseAmount">
                    <Receipt className="h-3 w-3 inline mr-1" />
                    Expense Claim
                  </Label>
                  <Input
                    id="expenseAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={settleExpenseAmount}
                    onChange={(e) => setSettleExpenseAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">
                    <Banknote className="h-3 w-3 inline mr-1" />
                    Cash Refund
                  </Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={settleRefundAmount}
                    onChange={(e) => setSettleRefundAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Validation hint */}
              <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                Expense ({parseFloat(settleExpenseAmount) || 0}) + Refund ({parseFloat(settleRefundAmount) || 0}) ={' '}
                <span className={Math.abs((parseFloat(settleExpenseAmount) || 0) + (parseFloat(settleRefundAmount) || 0) - (settleAdvance?.balance || 0)) > 0.01 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                  {(parseFloat(settleExpenseAmount) || 0) + (parseFloat(settleRefundAmount) || 0)}
                </span>{' '}
                (must equal {settleAdvance?.balance})
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseAccount">Expense Account</Label>
                <Select value={settleExpenseAccount} onValueChange={setSettleExpenseAccount}>
                  <SelectTrigger id="expenseAccount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5650">5650 Travel & Local Transport</SelectItem>
                    <SelectItem value="5600">5600 Fuel & Vehicle</SelectItem>
                    <SelectItem value="5450">5450 Meals & Entertainment</SelectItem>
                    <SelectItem value="5500">5500 Office Supplies</SelectItem>
                    <SelectItem value="5550">5550 Communication</SelectItem>
                    <SelectItem value="5700">5700 Miscellaneous Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDesc">Expense Description</Label>
                <Input
                  id="expenseDesc"
                  placeholder="e.g. Travel to Kigali for client meeting"
                  value={settleExpenseDesc}
                  onChange={(e) => setSettleExpenseDesc(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refundMethod">Refund Method</Label>
                <Select value={settleRefundMethod} onValueChange={setSettleRefundMethod}>
                  <SelectTrigger id="refundMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money (MoMo)</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settleDate">Settlement Date</Label>
                <Input
                  id="settleDate"
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settleNotes">Notes</Label>
                <Textarea
                  id="settleNotes"
                  placeholder="Optional notes..."
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowSettleDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={settleSubmitting}>
                  {settleSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm Settlement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
