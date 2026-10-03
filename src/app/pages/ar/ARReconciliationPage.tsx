import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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
import { Input } from '@/app/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { 
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { arReconciliationApi, ARTransaction, ARDashboardData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/app/layout/Layout';
import { formatDate, formatCurrency } from '@/lib/utils';

interface TransactionTypeOption {
  value: string;
  label: string;
  color: string;
}

const transactionTypes: TransactionTypeOption[] = [
  { value: 'invoice_created', label: 'Invoice Created', color: 'bg-blue-100 text-blue-800' },
  { value: 'invoice_cancelled', label: 'Invoice Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'receipt_posted', label: 'Receipt Posted', color: 'bg-green-100 text-green-800' },
  { value: 'receipt_reversed', label: 'Receipt Reversed', color: 'bg-orange-100 text-orange-800' },
  { value: 'credit_note_applied', label: 'Credit Note Applied', color: 'bg-purple-100 text-purple-800' },
  { value: 'bad_debt_writeoff', label: 'Bad Debt Write-off', color: 'bg-gray-100 text-gray-800' },
  { value: 'payment_recorded', label: 'Payment Recorded', color: 'bg-green-100 text-green-800' },
  { value: 'manual_adjustment', label: 'Manual Adjustment', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'system_correction', label: 'System Correction', color: 'bg-indigo-100 text-indigo-800' },
];

const ARReconciliationPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<ARDashboardData | null>(null);
  const [transactions, setTransactions] = useState<ARTransaction[]>([]);
  const [currentReceivables, setCurrentReceivables] = useState<any[]>([]);
  const [receivablesSummary, setReceivablesSummary] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<ARTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    transactionType: '',
    startDate: '',
    endDate: '',
    reconciliationStatus: '',
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
  });

  const [loading, setLoading] = useState({
    dashboard: false,
    transactions: false,
    receivables: false,
    verify: false,
  });

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const response = await arReconciliationApi.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('arReconciliation.fetchDashboardError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  }, [toast, t]);

  // Fetch transactions - inlined to avoid dependency loop
  const fetchTransactions = useCallback(async (currentFilters: typeof filters) => {
    setLoading(prev => ({ ...prev, transactions: true }));
    try {
      const response = await arReconciliationApi.getTransactions({
        page: currentFilters.page,
        limit: currentFilters.limit,
        transactionType: currentFilters.transactionType || undefined,
        startDate: currentFilters.startDate || undefined,
        endDate: currentFilters.endDate || undefined,
        reconciliationStatus: currentFilters.reconciliationStatus || undefined,
      });
      setTransactions(response.data);
      setPagination({
        total: response.total,
        pages: response.pages,
        currentPage: response.currentPage,
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('arReconciliation.fetchTransactionsError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  }, [toast, t]);

  // Fetch current receivables (outstanding invoices)
  const fetchCurrentReceivables = useCallback(async () => {
    setLoading(prev => ({ ...prev, receivables: true }));
    try {
      const response = await arReconciliationApi.getCurrentReceivables();
      setCurrentReceivables(response.data.invoices);
      setReceivablesSummary(response.data.summary);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('arReconciliation.fetchReceivablesError', 'Failed to fetch current receivables'),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, receivables: false }));
    }
  }, [toast, t]);
  const handleVerify = async () => {
    setLoading(prev => ({ ...prev, verify: true }));
    try {
      const response = await arReconciliationApi.verifyIntegrity({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setVerificationResult(response.data);
      setIsVerifyDialogOpen(true);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('arReconciliation.verifyError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, verify: false }));
    }
  };

  // Reconcile and correct
  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const response = await arReconciliationApi.reconcileAndCorrect({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      toast({
        title: t('arReconciliation.reconcileSuccess', 'Reconciliation completed'),
        description: response.message,
      });
      // Refresh data
      fetchDashboard();
      if (activeTab === 'transactions') {
        fetchTransactions(filters);
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('arReconciliation.reconcileError', 'Failed to reconcile'),
        variant: 'destructive',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Verify all pending transactions
  const handleVerifyAll = async () => {
    setIsReconciling(true);
    try {
      const response = await arReconciliationApi.verifyAllPending();
      toast({
        title: 'Transactions Verified',
        description: response.message || `${response.count} transactions verified`,
      });
      // Refresh data
      fetchDashboard();
      if (activeTab === 'transactions') {
        fetchTransactions(filters);
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('arReconciliation.verifyAllError', 'Failed to verify transactions'),
        variant: 'destructive',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch transactions when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters.page, filters.limit, filters.transactionType, filters.startDate, filters.endDate, filters.reconciliationStatus]);

  // Fetch current receivables when tab changes
  useEffect(() => {
    if (activeTab === 'receivables') {
      fetchCurrentReceivables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getTransactionTypeBadge = (type: string) => {
    const typeConfig = transactionTypes.find(t => t.value === type);
    return (
      <Badge className={typeConfig?.color || 'bg-gray-100'}>
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'increase' ? (
      <TrendingUp className="w-4 h-4 text-red-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-green-500" />
    );
  };

  const getReconciliationStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      discrepancy: 'bg-red-100 text-red-800',
      corrected: 'bg-blue-100 text-blue-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('arReconciliation.title', 'AR Reconciliation')}</h1>
            <p className="text-muted-foreground">
              {t('arReconciliation.subtitle', 'Track and reconcile accounts receivable transactions')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={loading.verify}
            >
              {loading.verify ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t('arReconciliation.verifyIntegrity', 'Verify Integrity')}
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t('arReconciliation.reconcile', 'Reconcile & Correct')}
            </Button>
            <Button
              variant="outline"
              onClick={handleVerifyAll}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t('arReconciliation.verifyAll', 'Verify All Pending')}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="dashboard">
              <Activity className="w-4 h-4 mr-2" />
              {t('arReconciliation.dashboard', 'Dashboard')}
            </TabsTrigger>
            <TabsTrigger value="receivables">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('arReconciliation.currentReceivables', 'Current Receivables')}
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <FileText className="w-4 h-4 mr-2" />
              {t('arReconciliation.transactions', 'Transactions')}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            {dashboardData && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.totalTransactions', 'Total Transactions')}</CardDescription>
                      <CardTitle className="text-3xl">
                        {dashboardData.stats.totalTransactions.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.recentTransactions', 'Recent (30 Days)')}</CardDescription>
                      <CardTitle className="text-3xl">
                        {dashboardData.stats.recentTransactions.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.pendingReconciliation', 'Pending Reconciliation')}</CardDescription>
                      <CardTitle className="text-3xl text-yellow-600">
                        {dashboardData.stats.pendingReconciliation.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.discrepancies', 'Discrepancies')}</CardDescription>
                      <CardTitle className={`text-3xl ${dashboardData.stats.discrepancyCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {dashboardData.stats.discrepancyCount.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Transaction Type Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('arReconciliation.typeBreakdown', 'Transaction Type Breakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {dashboardData.typeBreakdown.map((type) => (
                        <div key={type._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {transactionTypes.find(t => t.value === type._id)?.label || type._id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {type.count} transactions
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {formatCurrency(type.totalAmount)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('arReconciliation.recentActivity', 'Recent Activity')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 xl:hidden">
                      {dashboardData.recentActivity.map((transaction) => <button key={transaction._id} type="button" className="w-full rounded-xl border p-3 text-left" onClick={() => { setSelectedTransaction(transaction); setIsDetailOpen(true); }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{transaction.client?.name || '-'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(transaction.transactionDate)} · {transaction.transactionType}</p></div><span className="shrink-0 text-sm font-semibold">{formatCurrency(transaction.amount)}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="min-w-0 break-words text-xs text-muted-foreground">{transaction.description || '-'}</span>{getReconciliationStatusBadge(transaction.reconciliationStatus)}</div></button>)}
                    </div>
                    <div className="hidden overflow-x-auto xl:block"><Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('arReconciliation.date', 'Date')}</TableHead>
                          <TableHead>{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('arReconciliation.client', 'Client')}</TableHead>
                          <TableHead>{t('arReconciliation.description', 'Description')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead>{t('arReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.recentActivity.map((transaction) => (
                          <TableRow 
                            key={transaction._id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setIsDetailOpen(true);
                            }}
                          >
                            <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                            <TableCell>{getTransactionTypeBadge(transaction.transactionType)}</TableCell>
                            <TableCell>{transaction.client?.name || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {getDirectionIcon(transaction.direction)}
                                {formatCurrency(transaction.amount)}
                              </div>
                            </TableCell>
                            <TableCell>{getReconciliationStatusBadge(transaction.reconciliationStatus)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table></div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Current Receivables Tab */}
          <TabsContent value="receivables" className="space-y-6">
            {/* Summary Cards */}
            {receivablesSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('arReconciliation.totalOutstanding', 'Total Outstanding')}</CardDescription>
                    <CardTitle className="text-2xl text-blue-600">
                      {formatCurrency(receivablesSummary.totalOutstanding)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('arReconciliation.totalInvoices', 'Total Invoices')}</CardDescription>
                    <CardTitle className="text-2xl">
                      {receivablesSummary.totalInvoices.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('arReconciliation.overdueAmount', 'Overdue Amount')}</CardDescription>
                    <CardTitle className={`text-2xl ${receivablesSummary.overdueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(receivablesSummary.overdueAmount)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('arReconciliation.overdueCount', 'Overdue Invoices')}</CardDescription>
                    <CardTitle className={`text-2xl ${receivablesSummary.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {receivablesSummary.overdueCount.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Outstanding Invoices Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('arReconciliation.outstandingInvoices', 'Outstanding Invoices')}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({currentReceivables.length} loaded)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.receivables ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                  <div className="space-y-3 xl:hidden">
                    {currentReceivables.map((invoice) => (
                      <button key={invoice._id} type="button" className="w-full rounded-xl border p-3 text-left" onClick={() => navigate(`/invoices/${invoice._id}`)}>
                        <div className="flex items-start justify-between gap-3"><span className="break-all font-medium">{invoice.invoiceNumber || invoice.referenceNo || '-'}</span><Badge className={invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}>{invoice.status === 'partially_paid' ? 'Partially Paid' : 'Confirmed'}</Badge></div>
                        <p className="mt-1 break-words text-sm text-muted-foreground">{invoice.client?.name || '-'}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">{t('arReconciliation.invoiceDate', 'Date')}<b className="mt-1 block text-sm text-foreground">{formatDate(invoice.invoiceDate)}</b></span><span className="text-muted-foreground">{t('arReconciliation.dueDate', 'Due Date')}<b className={`mt-1 block text-sm ${invoice.dueDate && new Date(invoice.dueDate) < new Date() ? 'text-red-600' : 'text-foreground'}`}>{formatDate(invoice.dueDate)}</b></span><span className="text-muted-foreground">{t('arReconciliation.totalAmount', 'Total')}<b className="mt-1 block text-sm text-foreground">{formatCurrency(invoice.totalAmount)}</b></span><span className="text-muted-foreground">{t('arReconciliation.outstanding', 'Outstanding')}<b className="mt-1 block text-sm font-semibold text-blue-600">{formatCurrency(invoice.amountOutstanding)}</b></span></div>
                      </button>
                    ))}
                    {currentReceivables.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('arReconciliation.noOutstandingInvoices', 'No outstanding invoices found')}</p>}
                  </div>
                  <div className="hidden overflow-x-auto xl:block"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('arReconciliation.invoiceNumber', 'Invoice #')}</TableHead>
                        <TableHead>{t('arReconciliation.client', 'Client')}</TableHead>
                        <TableHead>{t('arReconciliation.invoiceDate', 'Date')}</TableHead>
                        <TableHead>{t('arReconciliation.dueDate', 'Due Date')}</TableHead>
                        <TableHead className="text-right">{t('arReconciliation.totalAmount', 'Total')}</TableHead>
                        <TableHead className="text-right">{t('arReconciliation.outstanding', 'Outstanding')}</TableHead>
                        <TableHead>{t('arReconciliation.status', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReceivables.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            {t('arReconciliation.noOutstandingInvoices', 'No outstanding invoices found')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentReceivables.map((invoice) => (
                          <TableRow 
                            key={invoice._id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/invoices/${invoice._id}`)}
                          >
                            <TableCell>{invoice.invoiceNumber || invoice.referenceNo || '-'}</TableCell>
                            <TableCell>{invoice.client?.name || '-'}</TableCell>
                            <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                            <TableCell>
                              {invoice.dueDate && new Date(invoice.dueDate) < new Date() ? (
                                <span className="text-red-600 font-medium">{formatDate(invoice.dueDate)} (Overdue)</span>
                              ) : (
                                formatDate(invoice.dueDate)
                              )}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600">
                              {formatCurrency(invoice.amountOutstanding)}
                            </TableCell>
                            <TableCell>
                              <Badge className={invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}>
                                {invoice.status === 'partially_paid' ? 'Partially Paid' : 'Confirmed'}
                              </Badge>
                            </TableCell>
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

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('arReconciliation.transactionType', 'Transaction Type')}
                    </label>
                    <Select
                      value={filters.transactionType || 'all'}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value === 'all' ? '' : value, page: 1 }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('arReconciliation.allTypes', 'All Types')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('arReconciliation.allTypes', 'All Types')}</SelectItem>
                        {transactionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('arReconciliation.startDate', 'Start Date')}
                    </label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('arReconciliation.endDate', 'End Date')}
                    </label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('arReconciliation.status', 'Status')}
                    </label>
                    <Select
                      value={filters.reconciliationStatus || 'all'}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, reconciliationStatus: value === 'all' ? '' : value, page: 1 }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('arReconciliation.allStatuses', 'All Statuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('arReconciliation.allStatuses', 'All Statuses')}</SelectItem>
                        <SelectItem value="pending">{t('arReconciliation.pending', 'Pending')}</SelectItem>
                        <SelectItem value="verified">{t('arReconciliation.verified', 'Verified')}</SelectItem>
                        <SelectItem value="discrepancy">{t('arReconciliation.discrepancy', 'Discrepancy')}</SelectItem>
                        <SelectItem value="corrected">{t('arReconciliation.corrected', 'Corrected')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('arReconciliation.transactions', 'Transactions')}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({pagination.total} total)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.transactions ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 xl:hidden">
                      {transactions.map((transaction) => <button key={transaction._id} type="button" className="w-full rounded-xl border p-3 text-left" onClick={() => { setSelectedTransaction(transaction); setIsDetailOpen(true); }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{transaction.client?.name || '-'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(transaction.transactionDate)} · {transaction.transactionType}</p></div><span className="flex shrink-0 items-center gap-1 text-sm font-semibold">{getDirectionIcon(transaction.direction)}{formatCurrency(transaction.amount)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">Reference<b className="mt-1 block break-all text-sm text-foreground">{transaction.referenceNo || '-'}</b></span><span className="text-muted-foreground">Balance<b className="mt-1 block text-sm text-foreground">{transaction.clientBalanceAfter !== undefined ? formatCurrency(transaction.clientBalanceAfter) : '-'}</b></span><span className="col-span-2 break-words text-muted-foreground">{transaction.description || '-'}</span><span className="col-span-2">{getReconciliationStatusBadge(transaction.reconciliationStatus)}</span></div></button>)}
                      {transactions.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('arReconciliation.noTransactions', 'No transactions found')}</p>}
                    </div>
                    <div className="hidden overflow-x-auto xl:block"><Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('arReconciliation.date', 'Date')}</TableHead>
                          <TableHead>{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('arReconciliation.reference', 'Reference')}</TableHead>
                          <TableHead>{t('arReconciliation.client', 'Client')}</TableHead>
                          <TableHead>{t('arReconciliation.description', 'Description')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.balance', 'Balance')}</TableHead>
                          <TableHead>{t('arReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              {t('arReconciliation.noTransactions', 'No transactions found')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactions.map((transaction) => (
                            <TableRow 
                              key={transaction._id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setIsDetailOpen(true);
                              }}
                            >
                              <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                              <TableCell>{getTransactionTypeBadge(transaction.transactionType)}</TableCell>
                              <TableCell>{transaction.referenceNo || '-'}</TableCell>
                              <TableCell>{transaction.client?.name || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {transaction.description}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {getDirectionIcon(transaction.direction)}
                                  {formatCurrency(transaction.amount)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.clientBalanceAfter !== undefined && (
                                  <span className="text-sm text-muted-foreground">
                                    {formatCurrency(transaction.clientBalanceAfter)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{getReconciliationStatusBadge(transaction.reconciliationStatus)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table></div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={filters.page === 1}
                          onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                          {t('common.previous', 'Previous')}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t('common.pageOf', 'Page {{page}} of {{pages}}', { 
                            page: pagination.currentPage, 
                            pages: pagination.pages 
                          })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={filters.page >= pagination.pages}
                          onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                          {t('common.next', 'Next')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transaction Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('arReconciliation.transactionDetails', 'Transaction Details')}</DialogTitle>
              <DialogDescription>
                {selectedTransaction && (
                  <div className="flex items-center gap-2 mt-2">
                    {getTransactionTypeBadge(selectedTransaction.transactionType)}
                    <span className="text-muted-foreground">{selectedTransaction._id}</span>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t('arReconciliation.date', 'Date')}</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedTransaction.transactionDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('arReconciliation.reference', 'Reference')}</label>
                    <p>{selectedTransaction.referenceNo || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('arReconciliation.client', 'Client')}</label>
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {selectedTransaction.client?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('arReconciliation.status', 'Status')}</label>
                    <p>{getReconciliationStatusBadge(selectedTransaction.reconciliationStatus)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('arReconciliation.description', 'Description')}</label>
                  <p className="text-sm p-3 bg-muted rounded-md mt-1">
                    {selectedTransaction.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('arReconciliation.amount', 'Amount')}</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      {getDirectionIcon(selectedTransaction.direction)}
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTransaction.direction === 'increase' ? 'Increases AR' : 'Decreases AR'}
                    </p>
                  </div>
                  {selectedTransaction.invoiceBalanceAfter !== undefined && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('arReconciliation.invoiceBalance', 'Invoice Balance After')}</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedTransaction.invoiceBalanceAfter)}
                      </p>
                    </div>
                  )}
                  {selectedTransaction.clientBalanceAfter !== undefined && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('arReconciliation.clientBalance', 'Client Balance After')}</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedTransaction.clientBalanceAfter)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedTransaction.invoice?._id) {
                        navigate(`/invoices/${selectedTransaction.invoice._id}`);
                      } else if (selectedTransaction.receipt?._id) {
                        navigate(`/ar/receipts/${selectedTransaction.receipt._id}`);
                      }
                    }}
                    disabled={!selectedTransaction.invoice?._id && !selectedTransaction.receipt?._id}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {t('arReconciliation.viewSource', 'View Source Document')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Verification Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('arReconciliation.integrityCheck', 'Data Integrity Check')}</DialogTitle>
            </DialogHeader>
            {verificationResult && (
              <div className="space-y-4">
                {verificationResult.verified ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertTitle className="text-green-800">{t('arReconciliation.dataVerified', 'Data Verified')}</AlertTitle>
                    <AlertDescription className="text-green-700">
                      {t('arReconciliation.noDiscrepancies', 'No discrepancies found. All balances match between the ledger and actual documents.')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>{t('arReconciliation.discrepanciesFound', 'Discrepancies Found')}</AlertTitle>
                    <AlertDescription>
                      {t('arReconciliation.discrepancyCount', '{{count}} discrepancies found between ledger and actual balances.', { count: verificationResult.discrepancies?.length || 0 })}
                    </AlertDescription>
                  </Alert>
                )}

                {!verificationResult.verified && verificationResult.discrepancies?.length > 0 && (
                  <>
                  <div className="max-h-96 space-y-3 overflow-auto xl:hidden">
                    {verificationResult.discrepancies.map((disc: any) => <article key={disc.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><span className="font-medium capitalize">{disc.type}</span><span className={`text-sm font-semibold ${disc.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>{disc.difference > 0 ? '+' : ''}{formatCurrency(disc.difference)}</span></div><p className="mt-1 break-all text-sm text-muted-foreground">{disc.reference || disc.name || disc.id}</p><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs"><span>Ledger<b className="mt-1 block text-sm">{formatCurrency(disc.ledgerBalance)}</b></span><span>Actual<b className="mt-1 block text-sm">{formatCurrency(disc.actualBalance)}</b></span></div></article>)}
                  </div>
                  <div className="hidden max-h-96 overflow-auto xl:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('arReconciliation.reference', 'Reference')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.ledgerBalance', 'Ledger')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.actualBalance', 'Actual')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.difference', 'Difference')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationResult.discrepancies.map((disc: any) => (
                          <TableRow key={disc.id}>
                            <TableCell className="capitalize">{disc.type}</TableCell>
                            <TableCell>{disc.reference || disc.name || disc.id}</TableCell>
                            <TableCell className="text-right">{formatCurrency(disc.ledgerBalance)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(disc.actualBalance)}</TableCell>
                            <TableCell className={`text-right ${disc.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {disc.difference > 0 ? '+' : ''}{formatCurrency(disc.difference)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  </>
                )}

                <div className="flex justify-end gap-2">
                  {!verificationResult.verified && (
                    <Button onClick={() => { setIsVerifyDialogOpen(false); handleReconcile(); }}>
                      {t('arReconciliation.reconcileNow', 'Reconcile Now')}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
                    {t('common.close', 'Close')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ARReconciliationPage;
