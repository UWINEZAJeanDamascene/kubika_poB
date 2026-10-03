import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { apReconciliationApi, suppliersApi } from '@/lib/api';
import { Layout } from '@/app/layout/Layout';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity,
  Building2,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currencyUtils';

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

export default function APReconciliationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState({
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
  const [suppliers, setSuppliers] = useState<Array<{ _id: string; name: string }>>([]);
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
  const [selectedTransaction, setSelectedTransaction] = useState<APTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Aging Report State
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
        setSuppliers(response.data);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const response = await apReconciliationApi.getDashboard();
      console.log('Dashboard response:', response);
      if (response && response.stats) {
        setDashboardData(response);
      } else {
        console.error('Invalid dashboard response:', response);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = useCallback(async (currentFilters = filters) => {
    setLoading(prev => ({ ...prev, transactions: true }));
    try {
      const response = await apReconciliationApi.getTransactions(currentFilters);
      if (response.success) {
        setTransactions(response.data);
        setPagination({
          total: response.pagination.total,
          pages: response.pagination.pages,
          currentPage: response.pagination.page
        });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  }, [filters]);

  const fetchPayables = useCallback(async () => {
    setLoading(prev => ({ ...prev, payables: true }));
    try {
      const response = await apReconciliationApi.getCurrentPayables({ limit: 100 });
      console.log('Payables response:', JSON.stringify(response, null, 2));
      if (response.success) {
        const grns = response.data?.grns;
        setPayables(Array.isArray(grns) ? grns : []);
      } else {
        setPayables([]);
      }
    } catch (error) {
      console.error('Failed to fetch payables:', error);
    } finally {
      setLoading(prev => ({ ...prev, payables: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchDashboard();
    fetchPayables();
  }, [fetchSuppliers, fetchDashboard, fetchPayables]);

  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions();
    if (activeTab === 'aging') fetchAgingReport();
  }, [activeTab, fetchTransactions]);

  const fetchAgingReport = useCallback(async () => {
    setLoading(prev => ({ ...prev, aging: true }));
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
      setLoading(prev => ({ ...prev, aging: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplier, asOfDate]);

  const handleVerify = async () => {
    setLoading(prev => ({ ...prev, verify: true }));
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
      setLoading(prev => ({ ...prev, verify: false }));
    }
  };

  const handleReconcile = async () => {
    setLoading(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await apReconciliationApi.reconcileAndCorrect({
        supplierId: filters.supplierId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
      if (activeTab === 'transactions') fetchTransactions();
    } catch (error) {
      toast({ title: t('common.error'), description: t('apReconciliation.reconcileFailed', 'Reconciliation failed'), variant: 'destructive' });
    } finally {
      setLoading(prev => ({ ...prev, reconcile: false }));
    }
  };

  const handleVerifyAll = async () => {
    setLoading(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await apReconciliationApi.verifyAllPending();
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
      if (activeTab === 'transactions') fetchTransactions();
    } catch (error) {
      toast({ title: t('common.error'), description: t('apReconciliation.verifyAllFailed', 'Failed to verify all'), variant: 'destructive' });
    } finally {
      setLoading(prev => ({ ...prev, reconcile: false }));
    }
  };

  // use shared currency formatter (defaults to company/display currency)
  // `formatCurrency` imported from lib/currencyUtils

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

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('apReconciliation.title', 'AP Reconciliation')}</h1>
            <p className="text-muted-foreground">{t('apReconciliation.description', 'Verify and reconcile Accounts Payable data')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleVerify} disabled={loading.verify} variant="outline">
              {loading.verify ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              {t('apReconciliation.verifyIntegrity', 'Verify Integrity')}
            </Button>
            <Button onClick={handleReconcile} disabled={loading.reconcile}>
              {loading.reconcile ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t('apReconciliation.reconcile', 'Reconcile & Correct')}
            </Button>
            <Button onClick={handleVerifyAll} disabled={loading.reconcile} variant="outline">
              {t('apReconciliation.verifyAll', 'Verify All Pending')}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="dashboard"><Activity className="w-4 h-4 mr-2" />{t('apReconciliation.dashboard', 'Dashboard')}</TabsTrigger>
            <TabsTrigger value="payables"><TrendingUp className="w-4 h-4 mr-2" />{t('apReconciliation.payables', 'Payables')}</TabsTrigger>
            <TabsTrigger value="aging"><Clock className="w-4 h-4 mr-2" />{t('apReconciliation.aging', 'Aging')}</TabsTrigger>
            <TabsTrigger value="transactions"><FileText className="w-4 h-4 mr-2" />{t('apReconciliation.transactions', 'Transactions')}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {loading.dashboard ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : !dashboardData ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('apReconciliation.noData', 'No dashboard data available')}</p>
                <Button onClick={fetchDashboard} variant="outline" className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apReconciliation.totalTransactions', 'Total Transactions')}</CardDescription>
                      <CardTitle className="text-3xl">{((dashboardData.stats?.totalTransactions) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apReconciliation.recentTransactions', 'Recent (30 Days)')}</CardDescription>
                      <CardTitle className="text-3xl">{((dashboardData.stats?.recentTransactions) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apReconciliation.pendingReconciliation', 'Pending Reconciliation')}</CardDescription>
                      <CardTitle className="text-3xl text-yellow-600">{((dashboardData.stats?.pendingReconciliation) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apReconciliation.discrepancies', 'Discrepancies')}</CardDescription>
                      <CardTitle className={`text-3xl ${(dashboardData.stats?.discrepancyCount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {((dashboardData.stats?.discrepancyCount) || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('apReconciliation.recentActivity', 'Recent Activity')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 xl:hidden">
                      {dashboardData.recentActivity?.slice(0, 5).map((tx: APTransaction) => <button key={tx._id} type="button" className="w-full rounded-xl border p-3 text-left" onClick={() => { setSelectedTransaction(tx); setIsDetailOpen(true); }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{tx.supplier?.name || '-'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(tx.transactionDate)} · {tx.transactionType}</p></div><span className={`shrink-0 text-sm font-semibold ${tx.direction === 'increase' ? 'text-red-600' : 'text-green-600'}`}>{tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="min-w-0 break-words text-xs text-muted-foreground">{tx.description || '-'}</span>{getReconciliationStatusBadge(tx.reconciliationStatus)}</div></button>)}
                    </div>
                    <div className="hidden overflow-x-auto xl:block"><Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('apReconciliation.date', 'Date')}</TableHead>
                          <TableHead>{t('apReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('apReconciliation.supplier', 'Supplier')}</TableHead>
                          <TableHead>{t('apReconciliation.description', 'Description')}</TableHead>
                          <TableHead className="text-right">{t('apReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead>{t('apReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.recentActivity?.slice(0, 5).map((tx: APTransaction) => (
                          <TableRow key={tx._id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedTransaction(tx); setIsDetailOpen(true); }}>
                            <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                            <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                            <TableCell>{tx.supplier?.name || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                            <TableCell className="text-right">
                              <span className={tx.direction === 'increase' ? 'text-red-600' : 'text-green-600'}>
                                {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </TableCell>
                            <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table></div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Payables Tab */}
          <TabsContent value="payables" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('apReconciliation.outstandingPayables', 'Outstanding Payables')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading.payables ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                  <div className="space-y-3 xl:hidden">
                    {payables.map((grn) => <button key={grn._id} type="button" className="w-full rounded-xl border p-3 text-left" onClick={() => navigate(`/grns/${grn._id}`)}><div className="flex items-start justify-between gap-3"><span className="break-all font-medium">{grn.referenceNo || grn.grnNumber || '-'}</span><Badge variant={grn.paymentStatus === 'paid' ? 'default' : grn.paymentStatus === 'partially_paid' ? 'secondary' : 'outline'}>{grn.paymentStatus}</Badge></div><p className="mt-1 break-words text-sm text-muted-foreground">{grn.supplier?.name || '-'}</p><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">{t('apReconciliation.date', 'Date')}<b className="mt-1 block text-sm text-foreground">{formatDate(grn.receivedDate)}</b></span><span className="text-muted-foreground">{t('apReconciliation.total', 'Total')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(grn.totalAmount)}</b></span><span className="text-muted-foreground">{t('apReconciliation.paid', 'Paid')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(grn.amountPaid)}</b></span><span className="text-muted-foreground">{t('apReconciliation.balance', 'Balance')}<b className="mt-1 block text-sm font-semibold text-blue-600">{formatCurrency(grn.balance)}</b></span></div></button>)}
                    {payables.length === 0 && !loading.payables && <p className="py-6 text-center text-sm text-muted-foreground">{t('apReconciliation.noPayables', 'No outstanding payables')}</p>}
                  </div>
                  <div className="hidden overflow-x-auto xl:block"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('apReconciliation.grnNumber', 'GRN #')}</TableHead>
                        <TableHead>{t('apReconciliation.supplier', 'Supplier')}</TableHead>
                        <TableHead>{t('apReconciliation.date', 'Date')}</TableHead>
                        <TableHead className="text-right">{t('apReconciliation.total', 'Total')}</TableHead>
                        <TableHead className="text-right">{t('apReconciliation.paid', 'Paid')}</TableHead>
                        <TableHead className="text-right">{t('apReconciliation.balance', 'Balance')}</TableHead>
                        <TableHead>{t('apReconciliation.status', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payables.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">{t('apReconciliation.noPayables', 'No outstanding payables')}</TableCell></TableRow>
                      ) : (
                        payables.map((grn) => (
                          <TableRow key={grn._id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/grns/${grn._id}`)}>
                            <TableCell>{grn.referenceNo || grn.grnNumber || '-'}</TableCell>
                            <TableCell>{grn.supplier?.name || '-'}</TableCell>
                            <TableCell>{formatDate(grn.receivedDate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(grn.totalAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(grn.amountPaid)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600">{formatCurrency(grn.balance)}</TableCell>
                            <TableCell><Badge variant={grn.paymentStatus === 'paid' ? 'default' : grn.paymentStatus === 'partially_paid' ? 'secondary' : 'outline'}>{grn.paymentStatus}</Badge></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table></div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aging Tab */}
          <TabsContent value="aging" className="space-y-6">
            {agingVerification && (
              <Card className={agingVerification.verified ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                <CardContent className="flex items-center gap-4 py-4">
                  {agingVerification.verified ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {agingVerification.verified
                        ? t('apAging.dataVerified', 'Data Verified')
                        : t('apAging.discrepanciesFound', 'Discrepancies Found')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {agingVerification.verified
                        ? t('apAging.allBalancesMatch', 'All balances match between ledger and actual documents')
                        : t('apAging.discrepancyCount', '{{count}} discrepancies require attention', { count: agingVerification.discrepancyCount })}
                    </p>
                  </div>
                  {!agingVerification.verified && (
                    <Button variant="outline" className="ml-auto" onClick={handleReconcile}>
                      {t('apAging.reconcileNow', 'Reconcile Now')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('apAging.supplier', 'Supplier')}</label>
                    <Select value={selectedSupplier || 'all'} onValueChange={setSelectedSupplier}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('apAging.allSuppliers', 'All Suppliers')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('apAging.allSuppliers', 'All Suppliers')}</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('apAging.asOfDate', 'As of Date')}</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={fetchAgingReport} disabled={loading.aging} className="w-full">
                      {loading.aging ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      {t('apAging.generateReport', 'Generate Report')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {(() => {
              const totals = calculateAgingTotals();
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apAging.notYetDue', 'Not Yet Due')}</CardDescription>
                      <CardTitle className="text-xl text-green-600">{formatCurrency(totals.notYetDue)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apAging.days1_30', '1-30 Days')}</CardDescription>
                      <CardTitle className="text-xl">{formatCurrency(totals.days1_30)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apAging.days31_60', '31-60 Days')}</CardDescription>
                      <CardTitle className="text-xl text-yellow-600">{formatCurrency(totals.days31_60)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apAging.days61_90', '61-90 Days')}</CardDescription>
                      <CardTitle className="text-xl text-orange-600">{formatCurrency(totals.days61_90)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apAging.days90Plus', '90+ Days')}</CardDescription>
                      <CardTitle className="text-xl text-red-600">{formatCurrency(totals.days90Plus)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-muted">
                    <CardHeader className="pb-2">
                      <CardDescription>{t('apAging.totalOutstanding', 'Total Outstanding')}</CardDescription>
                      <CardTitle className="text-xl font-bold">{formatCurrency(totals.total)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              );
            })()}

            {/* Aging Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('apAging.detailedBreakdown', 'Detailed Breakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading.aging ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : agingData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('apAging.noData', 'No aging data available')}</p>
                    <p className="text-sm mt-2">{t('apAging.selectFilters', 'Select filters and generate the report')}</p>
                  </div>
                ) : (
                  <>
                  <div className="space-y-3 xl:hidden">
                    {agingData.map((row) => <article key={row.supplier._id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><span className="break-words font-semibold">{row.supplier.name}</span><Button variant="outline" size="sm" className="min-h-10 shrink-0" onClick={() => navigate(`/ap-reconciliation/suppliers/${row.supplier._id}/statement`)}>Statement<ChevronRight className="ml-1 h-4 w-4" /></Button></div><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs sm:grid-cols-3"><span className="text-muted-foreground">{t('apAging.notYetDue', 'Not Yet Due')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row.current || '0'))}</b></span><span className="text-muted-foreground">{t('apAging.days1_30', '1-30 Days')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row['1-30'] || '0'))}</b></span><span className="text-muted-foreground">{t('apAging.days31_60', '31-60 Days')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row['31-60'] || '0'))}</b></span><span className="text-muted-foreground">{t('apAging.days61_90', '61-90 Days')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row['61-90'] || '0'))}</b></span><span className="text-muted-foreground">{t('apAging.days90Plus', '90+ Days')}<b className="mt-1 block text-sm text-red-600">{formatCurrency(parseFloat(row['90+'] || '0'))}</b></span><span className="text-muted-foreground">{t('apAging.total', 'Total')}<b className="mt-1 block text-sm font-semibold text-foreground">{formatCurrency(row.totalBalance)}</b></span></div></article>)}
                    {(() => { const totals = calculateAgingTotals(); return <article className="rounded-xl bg-muted/40 p-3"><b>{t('apAging.total', 'Total')}</b><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3"><span>Not yet due<b className="mt-1 block">{formatCurrency(totals.notYetDue)}</b></span><span>1-30 days<b className="mt-1 block">{formatCurrency(totals.days1_30)}</b></span><span>31-60 days<b className="mt-1 block">{formatCurrency(totals.days31_60)}</b></span><span>61-90 days<b className="mt-1 block">{formatCurrency(totals.days61_90)}</b></span><span>90+ days<b className="mt-1 block">{formatCurrency(totals.days90Plus)}</b></span><span>Total<b className="mt-1 block">{formatCurrency(totals.total)}</b></span></div></article>; })()}
                  </div>
                  <div className="hidden overflow-x-auto xl:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('apAging.supplier', 'Supplier')}</TableHead>
                          <TableHead className="text-right">{t('apAging.notYetDue', 'Not Yet Due')}</TableHead>
                          <TableHead className="text-right">{t('apAging.days1_30', '1-30 Days')}</TableHead>
                          <TableHead className="text-right">{t('apAging.days31_60', '31-60 Days')}</TableHead>
                          <TableHead className="text-right">{t('apAging.days61_90', '61-90 Days')}</TableHead>
                          <TableHead className="text-right">{t('apAging.days90Plus', '90+ Days')}</TableHead>
                          <TableHead className="text-right">{t('apAging.total', 'Total')}</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingData.map((row) => (
                          <TableRow key={row.supplier._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{row.supplier.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{getAgingBadge(parseFloat(row.current || '0'))}</TableCell>
                            <TableCell className="text-right">{getAgingBadge(parseFloat(row['1-30'] || '0'))}</TableCell>
                            <TableCell className="text-right">{getAgingBadge(parseFloat(row['31-60'] || '0'))}</TableCell>
                            <TableCell className="text-right">{getAgingBadge(parseFloat(row['61-90'] || '0'))}</TableCell>
                            <TableCell className="text-right">{getAgingBadge(parseFloat(row['90+'] || '0'))}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(row.totalBalance)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/ap-reconciliation/suppliers/${row.supplier._id}/statement`)}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(() => {
                          const totals = calculateAgingTotals();
                          return (
                            <TableRow className="bg-muted font-bold">
                              <TableCell>{t('apAging.total', 'Total')}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.notYetDue)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.days1_30)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.days31_60)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.days61_90)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.days90Plus)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
                  <Select value={filters.transactionType || 'all'} onValueChange={(v) => setFilters(p => ({ ...p, transactionType: v === 'all' ? '' : v, page: 1 }))}>
                    <SelectTrigger><SelectValue placeholder={t('apReconciliation.allTypes', 'All Types')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('apReconciliation.allTypes', 'All Types')}</SelectItem>
                      {transactionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.reconciliationStatus || 'all'} onValueChange={(v) => setFilters(p => ({ ...p, reconciliationStatus: v === 'all' ? '' : v, page: 1 }))}>
                    <SelectTrigger><SelectValue placeholder={t('apReconciliation.allStatuses', 'All Statuses')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('apReconciliation.allStatuses', 'All Statuses')}</SelectItem>
                      <SelectItem value="pending">{t('apReconciliation.pending', 'Pending')}</SelectItem>
                      <SelectItem value="verified">{t('apReconciliation.verified', 'Verified')}</SelectItem>
                      <SelectItem value="discrepancy">{t('apReconciliation.discrepancy', 'Discrepancy')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={filters.startDate} onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))} placeholder={t('apReconciliation.startDate', 'Start Date')} />
                  <Input type="date" value={filters.endDate} onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))} placeholder={t('apReconciliation.endDate', 'End Date')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('apReconciliation.transactions', 'Transactions')} ({pagination.total} total)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading.transactions ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <div className="space-y-3 xl:hidden">
                      {transactions.map((tx) => <button key={tx._id} type="button" className="w-full rounded-xl border p-3 text-left" onClick={() => { setSelectedTransaction(tx); setIsDetailOpen(true); }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{tx.supplier?.name || '-'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(tx.transactionDate)} · {tx.transactionType}</p></div><span className={`shrink-0 text-sm font-semibold ${tx.direction === 'increase' ? 'text-red-600' : 'text-green-600'}`}>{tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">Reference<b className="mt-1 block break-all text-sm text-foreground">{tx.referenceNo || '-'}</b></span><span className="text-muted-foreground">Balance<b className="mt-1 block text-sm text-foreground">{formatCurrency(tx.supplierBalanceAfter)}</b></span><span className="col-span-2">{getReconciliationStatusBadge(tx.reconciliationStatus)}</span></div></button>)}
                      {transactions.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('apReconciliation.noTransactions', 'No transactions found')}</p>}
                    </div>
                    <div className="hidden overflow-x-auto xl:block"><Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('apReconciliation.date', 'Date')}</TableHead>
                          <TableHead>{t('apReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('apReconciliation.reference', 'Reference')}</TableHead>
                          <TableHead>{t('apReconciliation.supplier', 'Supplier')}</TableHead>
                          <TableHead className="text-right">{t('apReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead className="text-right">{t('apReconciliation.balance', 'Balance')}</TableHead>
                          <TableHead>{t('apReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8">{t('apReconciliation.noTransactions', 'No transactions found')}</TableCell></TableRow>
                        ) : (
                          transactions.map((tx) => (
                            <TableRow key={tx._id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedTransaction(tx); setIsDetailOpen(true); }}>
                              <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                              <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                              <TableCell>{tx.referenceNo || '-'}</TableCell>
                              <TableCell>{tx.supplier?.name || '-'}</TableCell>
                              <TableCell className="text-right">
                                <span className={tx.direction === 'increase' ? 'text-red-600' : 'text-green-600'}>
                                  {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(tx.supplierBalanceAfter)}</TableCell>
                              <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table></div>
                    {pagination.pages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button variant="outline" size="sm" disabled={filters.page === 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>{t('common.previous', 'Previous')}</Button>
                        <span className="text-sm text-muted-foreground">{t('common.pageOf', 'Page {{page}} of {{pages}}', { page: pagination.currentPage, pages: pagination.pages })}</span>
                        <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>{t('common.next', 'Next')}</Button>
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
