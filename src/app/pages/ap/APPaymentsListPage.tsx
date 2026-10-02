import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { apPaymentsApi, suppliersApi, apReconciliationApi } from '@/lib/api';
import { EmptyState } from '@/app/components/EmptyState';
import { Layout } from '../../layout/Layout';
import {
  Eye,
  Send,
  Undo2,
  Loader2,
  FileText,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity,
  Building2,
  TrendingUp,
  Clock,
  ChevronRight,
  Wallet
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface APPayment {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  paymentDate: string;
  paymentMethod: string;
  amountPaid: string;
  currencyCode: string;
  status: 'draft' | 'posted' | 'reversed';
  unallocatedAmount?: string;
  createdAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

interface APTransaction {
  _id: string;
  supplier: { _id: string; name: string; code?: string };
  transactionType: string;
  transactionDate: string;
  referenceNo: string;
  description: string;
  amount: number;
  direction: 'increase' | 'decrease';
  supplierBalanceAfter: number;
  reconciliationStatus: 'pending' | 'verified' | 'discrepancy' | 'corrected';
}

interface AgingData {
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  current: string;
  '1-30': string;
  '31-60': string;
  '61-90': string;
  '90+': string;
  totalBalance: string;
}

interface DashboardStats {
  totalTransactions: number;
  recentTransactions: number;
  pendingReconciliation: number;
  discrepancyCount: number;
}

export default function APPaymentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('payments');

  // Payments State
  const [loading, setLoading] = useState(true);
  const [paymentList, setPaymentList] = useState<APPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reconciliation State
  const [loadingRec, setLoadingRec] = useState({
    dashboard: false,
    transactions: false,
    payables: false,
    aging: false,
    verify: false,
    reconcile: false
  });
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats;
    typeBreakdown: any[];
    recentActivity: APTransaction[];
    integrity: { verified: boolean; discrepancyCount: number };
  } | null>(null);
  const [transactions, setTransactions] = useState<APTransaction[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    transactionType: '',
    reconciliationStatus: '',
    supplierId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({ total: 0, pages: 1, currentPage: 1 });
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);

  // Aging State
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [agingVerification, setAgingVerification] = useState<{ verified: boolean; discrepancyCount: number } | null>(null);

  const transactionTypes = [
    { value: 'grn_received', label: t('apReconciliation.types.grnReceived', 'GRN Received') },
    { value: 'payment_posted', label: t('apReconciliation.types.paymentPosted', 'Payment Posted') },
    { value: 'payment_allocation', label: t('apReconciliation.types.paymentAllocation', 'Payment Allocation') },
    { value: 'payment_reversed', label: t('apReconciliation.types.paymentReversed', 'Payment Reversed') },
    { value: 'adjustment', label: t('apReconciliation.types.adjustment', 'Adjustment') }
  ];

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
      };

      if (supplierFilter && supplierFilter !== 'all') params.supplier_id = supplierFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await apPaymentsApi.getAll(params);
      console.log('[APPaymentsListPage] API Response:', response);

      if (response.success) {
        setPaymentList(response.data as APPayment[]);
        // Calculate total pages from count
        const total = response.count || 0;
        setTotalPages(Math.ceil(total / 20));
      }
    } catch (error) {
      console.error('[APPaymentsListPage] Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  }, [page, supplierFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reconciliation Fetch Functions
  const fetchDashboard = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, dashboard: true }));
    try {
      const response = await apReconciliationApi.getDashboard();
      if (response && response.stats) {
        setDashboardData(response);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, dashboard: false }));
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, transactions: true }));
    try {
      const response = await apReconciliationApi.getTransactions({
        ...filters,
        page: filters.page,
        limit: filters.limit
      });
      if (response.success) {
        setTransactions(response.data || []);
        setPagination({
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1,
          currentPage: response.pagination?.page || 1
        });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, transactions: false }));
    }
  }, [filters]);

  const fetchPayables = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, payables: true }));
    try {
      const response = await apReconciliationApi.getCurrentPayables({ limit: 100 });
      if (response.success) {
        const grns = response.data?.grns;
        setPayables(Array.isArray(grns) ? grns : []);
      } else {
        setPayables([]);
      }
    } catch (error) {
      console.error('Failed to fetch payables:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, payables: false }));
    }
  }, []);

  const fetchAgingReport = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, aging: true }));
    try {
      const params: any = {};
      if (selectedSupplier && selectedSupplier !== 'all') params.supplierId = selectedSupplier;
      if (asOfDate) params.asOfDate = asOfDate;

      const response = await apReconciliationApi.getAgingWithVerification(params);
      if (response.success) {
        // API returns { success: true, data: [...], verification: {...} }
        const agingDataArray = Array.isArray(response.data) ? response.data : [];
        setAgingData(agingDataArray);
        setAgingVerification(response.verification || null);
      }
    } catch (error) {
      console.error('Failed to fetch aging report:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, aging: false }));
    }
  }, [selectedSupplier, asOfDate]);

  // Tab effect - load data when switching tabs
  useEffect(() => {
    if (activeTab === 'reconciliation') {
      fetchDashboard();
      fetchPayables();
    }
    if (activeTab === 'reconciliation-transactions') fetchTransactions();
    if (activeTab === 'aging') fetchAgingReport();
  }, [activeTab, fetchDashboard, fetchPayables, fetchTransactions, fetchAgingReport]);

  const handlePost = async (id: string) => {
    try {
      await apPaymentsApi.post(id);
      fetchPayments();
    } catch (error) {
      console.error('Failed to post payment:', error);
    }
  };

  const handleReverse = async (id: string) => {
    const reason = window.prompt('Enter reversal reason:');
    if (!reason) return;
    try {
      await apPaymentsApi.reverse(id, reason);
      fetchPayments();
    } catch (error) {
      console.error('Failed to reverse payment:', error);
    }
  };

  // Reconciliation Actions
  const handleVerify = async () => {
    setLoadingRec(prev => ({ ...prev, verify: true }));
    try {
      const response = await apReconciliationApi.verifyIntegrity({
        supplierId: filters.supplierId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      setVerificationResult(response.data);
      setIsVerifyDialogOpen(true);
    } catch (error) {
      toast({ title: t('common.error'), description: t('apReconciliation.verifyFailed', 'Verification failed'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, verify: false }));
    }
  };

  const handleReconcile = async () => {
    setLoadingRec(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await apReconciliationApi.reconcileAndCorrect({
        supplierId: filters.supplierId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
    } catch (error) {
      toast({ title: t('common.error'), description: t('apReconciliation.reconcileFailed', 'Reconciliation failed'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, reconcile: false }));
    }
  };

  const handleVerifyAll = async () => {
    setLoadingRec(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await apReconciliationApi.verifyAllPending();
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
    } catch (error) {
      toast({ title: t('common.error'), description: t('apReconciliation.verifyAllFailed', 'Failed to verify all'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, reconcile: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('apPayment.status.draft', 'Draft') },
      posted: { variant: 'default', label: t('apPayment.status.posted', 'Posted') },
      reversed: { variant: 'destructive', label: t('apPayment.status.reversed', 'Reversed') },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: t('apPayment.paymentMethods.bankTransfer', 'Bank Transfer'),
      cash: t('apPayment.paymentMethods.cash', 'Cash'),
      cheque: t('apPayment.paymentMethods.cheque', 'Cheque'),
      card: t('apPayment.paymentMethods.card', 'Card'),
      other: t('apPayment.paymentMethods.other', 'Other'),
    };
    return labels[method] || method;
  };

  const formatCurrency = (amount: string | number | any, currency: string = 'USD') => {
    // Handle MongoDB Decimal128 format: { $numberDecimal: "1000000" }
    if (amount && typeof amount === 'object' && '$numberDecimal' in amount) {
      amount = amount.$numberDecimal;
    }
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return `${currency} 0.00`;
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      grn_received: { variant: 'default', label: 'GRN' },
      payment_posted: { variant: 'secondary', label: 'Payment' },
      payment_allocation: { variant: 'outline', label: 'Allocation' },
      payment_reversed: { variant: 'destructive', label: 'Reversed' },
      adjustment: { variant: 'secondary', label: 'Adjustment' }
    };
    const c = config[type] || config.adjustment;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getReconciliationStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: t('apReconciliation.pending', 'Pending') },
      verified: { variant: 'default', label: t('apReconciliation.verified', 'Verified') },
      discrepancy: { variant: 'destructive', label: t('apReconciliation.discrepancy', 'Discrepancy') },
      corrected: { variant: 'outline', label: t('apReconciliation.corrected', 'Corrected') }
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getAgingBadge = (amount: number) => {
    if (amount === 0) return <Badge variant="outline">{formatCurrency(0)}</Badge>;
    if (amount > 10000) return <Badge variant="destructive">{formatCurrency(amount)}</Badge>;
    if (amount > 5000) return <Badge variant="secondary">{formatCurrency(amount)}</Badge>;
    return <Badge variant="default">{formatCurrency(amount)}</Badge>;
  };

  const calculateAgingTotals = () => {
    return agingData.reduce(
      (acc, row) => ({
        notYetDue: acc.notYetDue + parseFloat(row.current || '0'),
        days1_30: acc.days1_30 + parseFloat(row['1-30'] || '0'),
        days31_60: acc.days31_60 + parseFloat(row['31-60'] || '0'),
        days61_90: acc.days61_90 + parseFloat(row['61-90'] || '0'),
        days90Plus: acc.days90Plus + parseFloat(row['90+'] || '0'),
        total: acc.total + parseFloat(row.totalBalance || '0')
      }),
      { notYetDue: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0 }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">{t('apPayment.title', 'Supplier Payments')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('apPayment.description', 'Manage supplier payments and reconciliation')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto dark:bg-slate-800">
            <TabsTrigger value="payments" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              <Wallet className="w-4 h-4 mr-2" />
              {t('apPayment.payments', 'Payments')}
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              <Activity className="w-4 h-4 mr-2" />
              {t('apReconciliation.dashboard', 'Dashboard')}
            </TabsTrigger>
            <TabsTrigger value="payables" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('apReconciliation.payables', 'Payables')}
            </TabsTrigger>
            <TabsTrigger value="aging" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              <Clock className="w-4 h-4 mr-2" />
              {t('apReconciliation.aging', 'Aging')}
            </TabsTrigger>
            <TabsTrigger value="reconciliation-transactions" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              <FileText className="w-4 h-4 mr-2" />
              {t('apReconciliation.transactions', 'Transactions')}
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6 dark:bg-slate-800 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apPayment.search', 'Search')}</label>
              <Input
                placeholder={t('apPayment.searchPlaceholder', 'Search by reference...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apPayment.supplier', 'Supplier')}</label>
              <Select value={supplierFilter || 'all'} onValueChange={(value) => setSupplierFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder={t('apPayment.allSuppliers', 'All Suppliers')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">{t('apPayment.allSuppliers', 'All Suppliers')}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id} className="dark:text-slate-200">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apPayment.statusLabel', 'Status')}</label>
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder={t('apPayment.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">{t('apPayment.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft" className="dark:text-slate-200">{t('apPayment.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="posted" className="dark:text-slate-200">{t('apPayment.status.posted', 'Posted')}</SelectItem>
                  <SelectItem value="reversed" className="dark:text-slate-200">{t('apPayment.status.reversed', 'Reversed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apPayment.dateFrom', 'Date From')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apPayment.dateTo', 'Date To')}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border dark:bg-slate-800 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin dark:text-slate-400" />
            </div>
          ) : (
            <>
            <div className="space-y-3 p-3 xl:hidden">{paymentList.length === 0 ? <div className="py-6"><EmptyState compact icon={Wallet} title={t('apPayment.noPayments', 'No payments yet')} description={t('apPayment.noPaymentsHint', 'Supplier payment records will appear here once payments are made against purchase orders.')}/></div> : paymentList.map((payment) => <article key={payment._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-mono text-sm font-semibold">{payment.referenceNo || 'N/A'}</p><p className="mt-1 break-words text-sm">{payment.supplier?.name || '-'}</p></div>{getStatusBadge(payment.status)}</div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs dark:border-slate-700"><div className="text-muted-foreground">Date<p className="mt-1 text-sm text-foreground">{formatDate(payment.paymentDate)}</p></div><div className="text-muted-foreground">Method<p className="mt-1 text-sm text-foreground">{getPaymentMethodLabel(payment.paymentMethod)}</p></div><div className="col-span-2 text-muted-foreground">Amount<p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(payment.amountPaid, payment.currencyCode)}</p></div></div><div className="mt-3 flex flex-wrap gap-2 border-t pt-3 dark:border-slate-700"><Button size="sm" variant="outline" onClick={() => navigate(`/ap-payments/${payment._id}`)}><Eye className="mr-1.5 h-4 w-4"/>View</Button>{payment.status === 'draft' && <><Button size="sm" variant="outline" onClick={() => navigate(`/ap-payments/${payment._id}/edit`)}><Send className="mr-1.5 h-4 w-4"/>Edit</Button><Button size="sm" onClick={() => handlePost(payment._id)}><Send className="mr-1.5 h-4 w-4"/>Post</Button></>}{payment.status === 'posted' && <Button size="sm" variant="outline" onClick={() => handleReverse(payment._id)}><Undo2 className="mr-1.5 h-4 w-4"/>Reverse</Button>}</div></article>)}</div>
            <div className="hidden overflow-x-auto xl:block"><Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700/50">
                  <TableHead className="dark:text-slate-200">{t('apPayment.reference', 'Reference')}</TableHead>
                  <TableHead className="dark:text-slate-200">{t('apPayment.supplier', 'Supplier')}</TableHead>
                  <TableHead className="dark:text-slate-200">{t('apPayment.date', 'Date')}</TableHead>
                  <TableHead className="dark:text-slate-200">{t('apPayment.paymentMethod', 'Payment Method')}</TableHead>
                  <TableHead className="dark:text-slate-200">{t('apPayment.amount', 'Amount')}</TableHead>
                  <TableHead className="dark:text-slate-200">{t('apPayment.statusLabel', 'Status')}</TableHead>
                  <TableHead className="text-right dark:text-slate-200">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:bg-slate-800">
                {paymentList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="border-0 py-2">
                      <EmptyState
                        compact
                        icon={Wallet}
                        title={t('apPayment.noPayments', 'No payments yet')}
                        description={t('apPayment.noPaymentsHint', 'Supplier payment records will appear here once payments are made against purchase orders.')}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentList.map((payment) => (
                    <TableRow key={payment._id} className="dark:hover:bg-slate-700/30">
                      <TableCell className="font-medium dark:text-slate-200">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {payment.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{payment.supplier?.name || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell className="dark:text-slate-300">{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                      <TableCell className="font-medium dark:text-slate-200">
                        {formatCurrency(payment.amountPaid, payment.currencyCode)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/ap-payments/${payment._id}`)}
                            className="dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/ap-payments/${payment._id}/edit`)}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Send className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(payment._id)}
                                className="dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {payment.status === 'posted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReverse(payment._id)}
                              className="dark:hover:bg-slate-700"
                            >
                              <Undo2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table></div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={page === p}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </TabsContent>

      {/* Reconciliation Dashboard Tab */}
      <TabsContent value="reconciliation" className="space-y-6">
        <div className="flex justify-end gap-2">
          <Button onClick={handleVerify} disabled={loadingRec.verify} variant="outline" className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            {loadingRec.verify ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {t('apReconciliation.verifyIntegrity', 'Verify Integrity')}
          </Button>
          <Button onClick={handleReconcile} disabled={loadingRec.reconcile}>
            {loadingRec.reconcile ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t('apReconciliation.reconcile', 'Reconcile & Correct')}
          </Button>
          <Button onClick={handleVerifyAll} disabled={loadingRec.reconcile} variant="outline" className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('apReconciliation.verifyAll', 'Verify All Pending')}
          </Button>
        </div>

        {loadingRec.dashboard ? (
          <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : !dashboardData ? (
          <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
            <p>{t('apReconciliation.noData', 'No dashboard data available')}</p>
            <Button onClick={fetchDashboard} variant="outline" className="mt-4 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="dark:text-slate-400">{t('apReconciliation.totalTransactions', 'Total Transactions')}</CardDescription>
                  <CardTitle className="text-3xl dark:text-white">{((dashboardData.stats?.totalTransactions) || 0).toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="dark:text-slate-400">{t('apReconciliation.recentTransactions', 'Recent (30 Days)')}</CardDescription>
                  <CardTitle className="text-3xl dark:text-white">{((dashboardData.stats?.recentTransactions) || 0).toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="dark:text-slate-400">{t('apReconciliation.pendingReconciliation', 'Pending Reconciliation')}</CardDescription>
                  <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">{((dashboardData.stats?.pendingReconciliation) || 0).toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription className="dark:text-slate-400">{t('apReconciliation.discrepancies', 'Discrepancies')}</CardDescription>
                  <CardTitle className={`text-3xl ${(dashboardData.stats?.discrepancyCount || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {((dashboardData.stats?.discrepancyCount) || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('apReconciliation.recentActivity', 'Recent Activity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50">
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.type', 'Type')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.supplier', 'Supplier')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.description', 'Description')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apReconciliation.amount', 'Amount')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentActivity?.slice(0, 5).map((tx: APTransaction) => (
                      <TableRow key={tx._id} className="dark:hover:bg-slate-700/30">
                        <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                        <TableCell className="dark:text-slate-300">{tx.supplier?.name || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate dark:text-slate-300">{tx.description}</TableCell>
                        <TableCell className="text-right">
                          <span className={tx.direction === 'increase' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                            {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* Payables Tab */}
      <TabsContent value="payables" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="dark:text-white">{t('apReconciliation.outstandingPayables', 'Outstanding Payables')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRec.payables ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="dark:bg-slate-700/50">
                    <TableHead className="dark:text-slate-200">{t('apReconciliation.grnNumber', 'GRN #')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('apReconciliation.supplier', 'Supplier')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('apReconciliation.date', 'Date')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('apReconciliation.total', 'Total')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('apReconciliation.paid', 'Paid')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('apReconciliation.balance', 'Balance')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('apReconciliation.status', 'Status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 dark:text-slate-400">{t('apReconciliation.noPayables', 'No outstanding payables')}</TableCell></TableRow>
                  ) : (
                    payables.map((grn) => (
                      <TableRow key={grn._id} className="cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700/30" onClick={() => navigate(`/grns/${grn._id}`)}>
                        <TableCell className="dark:text-slate-300">{grn.referenceNo || grn.grnNumber || '-'}</TableCell>
                        <TableCell className="dark:text-slate-300">{grn.supplier?.name || '-'}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatDate(grn.receivedDate)}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(grn.totalAmount)}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(grn.amountPaid)}</TableCell>
                        <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{formatCurrency(grn.balance)}</TableCell>
                        <TableCell>
                          <Badge variant={grn.paymentStatus === 'paid' ? 'default' : grn.paymentStatus === 'partially_paid' ? 'secondary' : 'outline'}>
                            {grn.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Aging Tab */}
      <TabsContent value="aging" className="space-y-6">
        {agingVerification && (
          <Card className={agingVerification.verified ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'}>
            <CardContent className="flex items-center gap-4 py-4">
              {agingVerification.verified ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              )}
              <div>
                <p className="font-medium dark:text-white">
                  {agingVerification.verified ? t('apAging.dataVerified', 'Data Verified') : t('apAging.discrepanciesFound', 'Discrepancies Found')}
                </p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  {agingVerification.verified
                    ? t('apAging.allBalancesMatch', 'All balances match between ledger and actual documents')
                    : t('apAging.discrepancyCount', '{{count}} discrepancies require attention', { count: agingVerification.discrepancyCount })}
                </p>
              </div>
              {!agingVerification.verified && (
                <Button variant="outline" className="ml-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" onClick={handleReconcile}>
                  {t('apAging.reconcileNow', 'Reconcile Now')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apAging.supplier', 'Supplier')}</label>
                <Select value={selectedSupplier || 'all'} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600"><SelectValue placeholder={t('apAging.allSuppliers', 'All Suppliers')} /></SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="all" className="dark:text-slate-200">{t('apAging.allSuppliers', 'All Suppliers')}</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier._id} value={supplier._id} className="dark:text-slate-200">{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('apAging.asOfDate', 'As of Date')}</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                  <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchAgingReport} disabled={loadingRec.aging} className="w-full">
                  {loadingRec.aging ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  {t('apAging.generateReport', 'Generate Report')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(() => {
          const totals = calculateAgingTotals();
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="dark:bg-slate-800 dark:border-slate-700"><CardHeader className="pb-2"><CardDescription className="dark:text-slate-400">{t('apAging.notYetDue', 'Not Yet Due')}</CardDescription><CardTitle className="text-xl text-green-600 dark:text-green-400">{formatCurrency(totals.notYetDue)}</CardTitle></CardHeader></Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700"><CardHeader className="pb-2"><CardDescription className="dark:text-slate-400">{t('apAging.days1_30', '1-30 Days')}</CardDescription><CardTitle className="text-xl dark:text-white">{formatCurrency(totals.days1_30)}</CardTitle></CardHeader></Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700"><CardHeader className="pb-2"><CardDescription className="dark:text-slate-400">{t('apAging.days31_60', '31-60 Days')}</CardDescription><CardTitle className="text-xl text-yellow-600 dark:text-yellow-400">{formatCurrency(totals.days31_60)}</CardTitle></CardHeader></Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700"><CardHeader className="pb-2"><CardDescription className="dark:text-slate-400">{t('apAging.days61_90', '61-90 Days')}</CardDescription><CardTitle className="text-xl text-orange-600 dark:text-orange-400">{formatCurrency(totals.days61_90)}</CardTitle></CardHeader></Card>
              <Card className="dark:bg-slate-800 dark:border-slate-700"><CardHeader className="pb-2"><CardDescription className="dark:text-slate-400">{t('apAging.days90Plus', '90+ Days')}</CardDescription><CardTitle className="text-xl text-red-600 dark:text-red-400">{formatCurrency(totals.days90Plus)}</CardTitle></CardHeader></Card>
              <Card className="bg-muted dark:bg-slate-700"><CardHeader className="pb-2"><CardDescription className="dark:text-slate-300">{t('apAging.totalOutstanding', 'Total Outstanding')}</CardDescription><CardTitle className="text-xl font-bold dark:text-white">{formatCurrency(totals.total)}</CardTitle></CardHeader></Card>
            </div>
          );
        })()}

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-white">{t('apAging.detailedBreakdown', 'Detailed Breakdown')}</CardTitle></CardHeader>
          <CardContent>
            {loadingRec.aging ? (
              <div className="flex items-center justify-center py-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : agingData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('apAging.noData', 'No aging data available')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50">
                      <TableHead className="dark:text-slate-200">{t('apAging.supplier', 'Supplier')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apAging.notYetDue', 'Not Yet Due')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apAging.days1_30', '1-30 Days')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apAging.days31_60', '31-60 Days')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apAging.days61_90', '61-90 Days')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apAging.days90Plus', '90+ Days')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apAging.total', 'Total')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingData.map((row) => (
                      <TableRow key={row.supplier._id} className="dark:hover:bg-slate-700/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium dark:text-slate-200">{row.supplier.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right dark:text-slate-300">{getAgingBadge(parseFloat(row.current || '0'))}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{getAgingBadge(parseFloat(row['1-30'] || '0'))}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{getAgingBadge(parseFloat(row['31-60'] || '0'))}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{getAgingBadge(parseFloat(row['61-90'] || '0'))}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{getAgingBadge(parseFloat(row['90+'] || '0'))}</TableCell>
                        <TableCell className="text-right font-bold dark:text-white">{formatCurrency(row.totalBalance)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/ap-reconciliation/suppliers/${row.supplier._id}/statement`)} className="dark:text-slate-300 dark:hover:bg-slate-700">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(() => {
                      const totals = calculateAgingTotals();
                      return (
                        <TableRow className="bg-muted font-bold dark:bg-slate-700">
                          <TableCell className="dark:text-white">{t('apAging.total', 'Total')}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(totals.notYetDue)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(totals.days1_30)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(totals.days31_60)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(totals.days61_90)}</TableCell>
                          <TableCell className="text-right dark:text-slate-200">{formatCurrency(totals.days90Plus)}</TableCell>
                          <TableCell className="text-right dark:text-white">{formatCurrency(totals.total)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Reconciliation Transactions Tab */}
      <TabsContent value="reconciliation-transactions" className="space-y-6">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filters.transactionType || 'all'} onValueChange={(v) => setFilters(p => ({ ...p, transactionType: v === 'all' ? '' : v, page: 1 }))}>
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600"><SelectValue placeholder={t('apReconciliation.allTypes', 'All Types')} /></SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">{t('apReconciliation.allTypes', 'All Types')}</SelectItem>
                  {transactionTypes.map(t => <SelectItem key={t.value} value={t.value} className="dark:text-slate-200">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.reconciliationStatus || 'all'} onValueChange={(v) => setFilters(p => ({ ...p, reconciliationStatus: v === 'all' ? '' : v, page: 1 }))}>
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600"><SelectValue placeholder={t('apReconciliation.allStatuses', 'All Statuses')} /></SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">{t('apReconciliation.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="pending" className="dark:text-slate-200">{t('apReconciliation.pending', 'Pending')}</SelectItem>
                  <SelectItem value="verified" className="dark:text-slate-200">{t('apReconciliation.verified', 'Verified')}</SelectItem>
                  <SelectItem value="discrepancy" className="dark:text-slate-200">{t('apReconciliation.discrepancy', 'Discrepancy')}</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.startDate} onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))} placeholder={t('apReconciliation.startDate', 'Start Date')} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              <Input type="date" value={filters.endDate} onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))} placeholder={t('apReconciliation.endDate', 'End Date')} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-white">{t('apReconciliation.transactions', 'Transactions')} ({pagination.total} total)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRec.transactions ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50">
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.type', 'Type')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.reference', 'Reference')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.supplier', 'Supplier')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apReconciliation.amount', 'Amount')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('apReconciliation.balance', 'Balance')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('apReconciliation.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 dark:text-slate-400">{t('apReconciliation.noTransactions', 'No transactions found')}</TableCell></TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx._id} className="dark:hover:bg-slate-700/30">
                          <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                          <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                          <TableCell className="dark:text-slate-300">{tx.referenceNo || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{tx.supplier?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className={tx.direction === 'increase' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                              {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground dark:text-slate-400">{formatCurrency(tx.supplierBalanceAfter)}</TableCell>
                          <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {pagination.pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <Button variant="outline" size="sm" disabled={filters.page === 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.previous', 'Previous')}</Button>
                    <span className="text-sm text-muted-foreground dark:text-slate-400">{t('common.pageOf', 'Page {{page}} of {{pages}}', { page: pagination.currentPage, pages: pagination.pages })}</span>
                    <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.next', 'Next')}</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Verification Dialog */}
    <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('apReconciliation.integrityCheck', 'Data Integrity Check')}</DialogTitle>
        </DialogHeader>
        {verificationResult && (
          <div className="space-y-4">
            {verificationResult.verified ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertTitle className="text-green-800">{t('apReconciliation.dataVerified', 'Data Verified')}</AlertTitle>
                <AlertDescription className="text-green-700">{t('apReconciliation.noDiscrepancies', 'No discrepancies found.')}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>{t('apReconciliation.discrepanciesFound', 'Discrepancies Found')}</AlertTitle>
                <AlertDescription>{t('apReconciliation.discrepancyCount', '{{count}} discrepancies found.', { count: verificationResult.discrepancies?.length || 0 })}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              {!verificationResult.verified && <Button onClick={() => { setIsVerifyDialogOpen(false); handleReconcile(); }}>{t('apReconciliation.reconcileNow', 'Reconcile Now')}</Button>}
              <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>{t('common.close', 'Close')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </div>
</Layout>
  );
}
