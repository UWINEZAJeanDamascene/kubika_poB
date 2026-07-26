import { useState, useEffect, useCallback } from 'react';
import { apReconciliationApi, apPaymentsApi, suppliersApi } from '@/lib/api';
import { useLiveRefresh } from '@/lib/hooks/useLiveRefresh';
import { Layout } from '../../layout/Layout';
import {
  FileText,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Building2,
  User,
  Wallet,
  Landmark,
  Receipt,
  Scale,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from 'lucide-react';
import { useFormatCurrency } from '@/lib/currencyUtils';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AgingBucket {
  supplier: { _id: string; name: string; code: string };
  totalBalance: number;
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

interface APTransaction {
  _id: string;
  transactionType: string;
  transactionDate: string;
  referenceNo: string;
  description: string;
  amount: number;
  direction: 'increase' | 'decrease';
  supplier: { _id: string; name: string };
  reconciliationStatus: string;
}

export default function APDashboardPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Overview / Aging
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [agingSummary, setAgingSummary] = useState({
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
    total: 0
  });
  const [agingSupplierFilter, setAgingSupplierFilter] = useState<string>('all');
  const [agingAsOfDate, setAgingAsOfDate] = useState<string>('');
  const [loadingAging, setLoadingAging] = useState(false);

  // Outstanding payables (GRNs)
  const [outstandingPayables, setOutstandingPayables] = useState<any[]>([]);
  const [payablePage, setPayablePage] = useState(1);
  const [payableTotalPages, setPayableTotalPages] = useState(1);
  const [loadingPayables, setLoadingPayables] = useState(false);

  // Transactions / Ledger
  const [transactions, setTransactions] = useState<APTransaction[]>([]);
  const [transPage, setTransPage] = useState(1);
  const [transTotalPages, setTransTotalPages] = useState(1);
  const [loadingTrans, setLoadingTrans] = useState(false);

  // Supplier Statement Dialog
  const [selectedSupplier, setSelectedSupplier] = useState<{ _id: string; name: string; code?: string } | null>(null);
  const [supplierStatement, setSupplierStatement] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  const [suppliers, setSuppliers] = useState<{ _id: string; name: string; code?: string }[]>([]);

  const loadAging = useCallback(async () => {
    setLoadingAging(true);
    try {
      const params: any = {};
      if (agingSupplierFilter && agingSupplierFilter !== 'all') params.supplier_id = agingSupplierFilter;
      if (agingAsOfDate) params.as_of_date = agingAsOfDate;
      const res: any = await apPaymentsApi.getAgingReport(params);
      if (res) {
        const buckets = res.data || res || [];
        setAgingData(buckets);
        const summary = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
        buckets.forEach((b: AgingBucket) => {
          summary.current += b.current || 0;
          summary['1-30'] += b['1-30'] || 0;
          summary['31-60'] += b['31-60'] || 0;
          summary['61-90'] += b['61-90'] || 0;
          summary['90+'] += b['90+'] || 0;
          summary.total += b.totalBalance || 0;
        });
        setAgingSummary(summary);
      }
    } catch (e) {
      console.error('Failed to load AP aging report', e);
    } finally {
      setLoadingAging(false);
    }
  }, [agingSupplierFilter, agingAsOfDate]);

  const loadOutstandingPayables = useCallback(async (page = 1) => {
    setLoadingPayables(true);
    try {
      const res: any = await apReconciliationApi.getCurrentPayables({ page, limit: 20 });
      if (res?.data) {
        setOutstandingPayables(res.data.grns || []);
        setPayableTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load outstanding payables', e);
    } finally {
      setLoadingPayables(false);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setLoadingTrans(true);
    try {
      const res: any = await apReconciliationApi.getTransactions({ page, limit: 20 });
      if (res?.success !== false) {
        setTransactions(Array.isArray(res.data) ? res.data : []);
        setTransTotalPages(res.pagination?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to load AP transactions', e);
    } finally {
      setLoadingTrans(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res: any = await suppliersApi.getAll({ limit: 1000 });
      if (res?.data) {
        setSuppliers(res.data.data || res.data || []);
      }
    } catch (e) {
      console.error('Failed to load suppliers', e);
    }
  }, []);

  const openSupplierStatement = async (supplier: { _id: string; name: string; code?: string }) => {
    setSelectedSupplier(supplier);
    setIsStatementOpen(true);
    setLoadingStatement(true);
    try {
      const res: any = await apPaymentsApi.getSupplierStatement(supplier._id);
      setSupplierStatement(res?.data || null);
    } catch (e) {
      console.error('Failed to load supplier statement', e);
      toast({ title: 'Error', description: 'Failed to load supplier statement', variant: 'destructive' });
    } finally {
      setLoadingStatement(false);
    }
  };

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      loadSuppliers(),
      loadAging(),
      loadOutstandingPayables(payablePage),
      loadTransactions(transPage),
    ]);
  }, [loadSuppliers, loadAging, loadOutstandingPayables, loadTransactions, payablePage, transPage]);

  useEffect(() => {
    loadSuppliers();
    loadAging();
    loadOutstandingPayables(1);
    loadTransactions(1);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAging();
  }, [agingSupplierFilter, agingAsOfDate]);

  useLiveRefresh(refreshDashboard);

  const formatMoney = useFormatCurrency();

  const getStatusStyle = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
      partially_paid: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
      fully_paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'Confirmed', partially_paid: 'Partially Paid', fully_paid: 'Paid', cancelled: 'Cancelled',
    };
    return map[status] || status;
  };

  const getTransactionStyle = (type: string) => {
    const map: Record<string, string> = {
      grn_received: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
      payment_posted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
      payment_allocation: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60',
      write_off: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    };
    return map[type] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getTransactionLabel = (type: string) => {
    const map: Record<string, string> = {
      grn_received: 'GRN', payment_posted: 'Payment', payment_allocation: 'Allocation', write_off: 'Write-off',
    };
    return map[type] || type;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">Accounts Payable</h1>
                    <Badge className="mt-2 w-fit bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200">
                      Live data
                    </Badge>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Read-only ledger showing what you owe suppliers</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { loadAging(); loadOutstandingPayables(1); loadTransactions(1); }} className="gap-1.5 dark:border-slate-700 dark:text-slate-200">
                  <RotateCcw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white p-1 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-4">
                <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-950/40 dark:data-[state=active]:text-indigo-300">Overview</TabsTrigger>
                <TabsTrigger value="aging" className="gap-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-950/40 dark:data-[state=active]:text-indigo-300">Aging Report</TabsTrigger>
                <TabsTrigger value="outstanding" className="gap-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-950/40 dark:data-[state=active]:text-indigo-300">Outstanding</TabsTrigger>
                <TabsTrigger value="ledger" className="gap-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-950/40 dark:data-[state=active]:text-indigo-300">Supplier Ledger</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Total Outstanding</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(agingSummary.total)}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Across all suppliers</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Current (Not Due)</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(agingSummary.current)}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Within terms</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Overdue (1-30 Days)</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatMoney(agingSummary['1-30'])}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Slightly overdue</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Seriously Overdue (31+)</p>
                          <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{formatMoney((agingSummary['31-60'] || 0) + (agingSummary['61-90'] || 0) + (agingSummary['90+'] || 0))}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Requires attention</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Aging Report Tab */}
              <TabsContent value="aging" className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={agingSupplierFilter} onValueChange={setAgingSupplierFilter}>
                        <SelectTrigger className="w-[200px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                          <SelectValue placeholder="All Suppliers" />
                        </SelectTrigger>
                        <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                          <SelectItem value="all" className="dark:text-slate-200">All Suppliers</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s._id} value={s._id} className="dark:text-slate-200">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="date" value={agingAsOfDate} onChange={(e) => setAgingAsOfDate(e.target.value)} className="w-[160px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                    </div>
                    {loadingAging && <span className="text-sm text-slate-500 dark:text-slate-400">Loading...</span>}
                  </div>
                </div>

                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <Scale className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-slate-900 dark:text-white">AP Aging Report</CardTitle>
                        <CardDescription className="text-xs dark:text-slate-400">Outstanding balances grouped by age</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                            <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Supplier</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Current</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">1-30 Days</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">31-60 Days</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">61-90 Days</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">90+ Days</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total</TableHead>
                            <TableHead className="w-24"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agingData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex flex-col items-center">
                                  <Scale className="mb-2 h-8 w-8 opacity-40" />
                                  No outstanding payables
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            agingData.map((bucket) => (
                              <TableRow key={bucket.supplier?._id || Math.random()} className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <Building2 className="h-4 w-4" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{bucket.supplier?.name || 'Unknown'}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(bucket.current)}</TableCell>
                                <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(bucket['1-30'])}</TableCell>
                                <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(bucket['31-60'])}</TableCell>
                                <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(bucket['61-90'])}</TableCell>
                                <TableCell className="text-right text-sm font-medium text-rose-600 dark:text-rose-400">{formatMoney(bucket['90+'])}</TableCell>
                                <TableCell className="text-right text-sm font-bold text-slate-900 dark:text-white">{formatMoney(bucket.totalBalance)}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => openSupplierStatement(bucket.supplier)} className="h-8 w-8 p-0 dark:text-slate-300">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Outstanding Payables Tab */}
              <TabsContent value="outstanding" className="space-y-4">
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-slate-900 dark:text-white">Outstanding Payables</CardTitle>
                        <CardDescription className="text-xs dark:text-slate-400">Unpaid and partially paid GRNs / purchase invoices</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingPayables ? (
                      <div className="space-y-3 p-4">
                        <Skeleton className="h-10 w-full" />
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : outstandingPayables.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                        <Receipt className="mb-2 h-8 w-8 opacity-40" />
                        <p className="text-sm">No outstanding payables</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Supplier</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Paid</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Balance</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {outstandingPayables.map((grn: any) => (
                                <TableRow key={grn._id} className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50">
                                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{grn.reference || grn.referenceNo || grn.grnNumber}</TableCell>
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{grn.supplier?.name || 'Unknown'}</TableCell>
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : '-'}</TableCell>
                                  <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(grn.totalAmount)}</TableCell>
                                  <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(grn.amountPaid)}</TableCell>
                                  <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(grn.balance)}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusStyle(grn.paymentStatus || grn.status)}`}>{getStatusLabel(grn.paymentStatus || grn.status)}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-center p-4">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious onClick={() => { if (payablePage > 1) { setPayablePage(payablePage - 1); loadOutstandingPayables(payablePage - 1); } }} className={payablePage <= 1 ? 'pointer-events-none opacity-50' : ''} />
                              </PaginationItem>
                              {Array.from({ length: payableTotalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationItem key={page}>
                                  <PaginationLink isActive={page === payablePage} onClick={() => { setPayablePage(page); loadOutstandingPayables(page); }}>{page}</PaginationLink>
                                </PaginationItem>
                              ))}
                              <PaginationItem>
                                <PaginationNext onClick={() => { if (payablePage < payableTotalPages) { setPayablePage(payablePage + 1); loadOutstandingPayables(payablePage + 1); } }} className={payablePage >= payableTotalPages ? 'pointer-events-none opacity-50' : ''} />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Supplier Ledger Tab */}
              <TabsContent value="ledger" className="space-y-4">
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <PiggyBank className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-slate-900 dark:text-white">Supplier Ledger</CardTitle>
                        <CardDescription className="text-xs dark:text-slate-400">Transaction history for all suppliers</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingTrans ? (
                      <div className="space-y-3 p-4">
                        <Skeleton className="h-10 w-full" />
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                        <PiggyBank className="mb-2 h-8 w-8 opacity-40" />
                        <p className="text-sm">No transactions found</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Supplier</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Type</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Direction</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.map((tx) => (
                                <TableRow key={tx._id} className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50">
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : '-'}</TableCell>
                                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{tx.supplier?.name || 'Unknown'}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getTransactionStyle(tx.transactionType)}`}>{getTransactionLabel(tx.transactionType)}</span>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">{tx.referenceNo || '-'}</TableCell>
                                  <TableCell className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-300">{tx.description}</TableCell>
                                  <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(tx.amount)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tx.direction === 'increase' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'}`}>
                                      {tx.direction === 'increase' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                      {tx.direction === 'increase' ? 'Increases AP' : 'Reduces AP'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-center p-4">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious onClick={() => { if (transPage > 1) { setTransPage(transPage - 1); loadTransactions(transPage - 1); } }} className={transPage <= 1 ? 'pointer-events-none opacity-50' : ''} />
                              </PaginationItem>
                              {Array.from({ length: transTotalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationItem key={page}>
                                  <PaginationLink isActive={page === transPage} onClick={() => { setTransPage(page); loadTransactions(page); }}>{page}</PaginationLink>
                                </PaginationItem>
                              ))}
                              <PaginationItem>
                                <PaginationNext onClick={() => { if (transPage < transTotalPages) { setTransPage(transPage + 1); loadTransactions(transPage + 1); } }} className={transPage >= transTotalPages ? 'pointer-events-none opacity-50' : ''} />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Supplier Statement Dialog */}
          <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <User className="h-4 w-4" />
                  </div>
                  Supplier Statement: {selectedSupplier?.name}
                </DialogTitle>
              </DialogHeader>
              {loadingStatement ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  </div>
                  <Skeleton className="h-64 rounded-lg" />
                </div>
              ) : supplierStatement ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total GRNs</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(supplierStatement.summary?.totalGRNs || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Paid</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">{formatMoney(supplierStatement.summary?.totalPaid || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Balance</p>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-300">{formatMoney(supplierStatement.summary?.totalOutstanding || 0)}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                          <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Paid</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(supplierStatement.grns || []).map((grn: any, idx: number) => (
                          <TableRow key={idx} className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50">
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{grn.date ? new Date(grn.date).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{grn.reference || '-'}</TableCell>
                            <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(grn.total)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-900 dark:text-white">{formatMoney(grn.paid)}</TableCell>
                            <TableCell className="text-right text-sm font-bold text-slate-900 dark:text-white">{formatMoney(grn.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                  <FileText className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">No statement data available</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
