import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { arReceiptsApi, clientsApi, arReconciliationApi, ARTransaction, ARDashboardData } from '@/lib/api';
import { EmptyState } from '@/app/components/EmptyState';
import { Layout } from '../../layout/Layout';
import {
  Eye,
  Send,
  Undo2,
  Loader2,
  FileText,
  Download,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/app/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface ARReceipt {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  receiptDate: string;
  paymentMethod: string;
  amountReceived: string;
  currencyCode: string;
  status: 'draft' | 'posted' | 'reversed';
  unallocatedAmount?: string;
  createdAt: string;
}

interface AgingBucket {
  client: { _id: string; name: string; code: string };
  totalBalance: number;
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}


interface Client {
  _id: string;
  name: string;
  code?: string;
}

export default function ARReceiptsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [receiptList, setReceiptList] = useState<ARReceipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [clientFilter, setClientFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Aging report state - SEPARATE from receipts filters to avoid interference
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [agingSummary, setAgingSummary] = useState({
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
    total: 0
  });
  const [agingClientFilter, setAgingClientFilter] = useState<string>('');
  const [agingAsOfDate, setAgingAsOfDate] = useState<string>('');
  const [loadingAging, setLoadingAging] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ _id: string; name: string; code?: string } | null>(null);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeTab, setActiveTab] = useState('receipts');
  const { toast } = useToast();

  // AR Reconciliation State
  const [loadingRec, setLoadingRec] = useState({
    dashboard: false,
    transactions: false,
    receivables: false,
    verify: false,
    reconcile: false
  });
  const [dashboardData, setDashboardData] = useState<ARDashboardData | null>(null);
  const [transactions, setTransactions] = useState<ARTransaction[]>([]);
  const [currentReceivables, setCurrentReceivables] = useState<any[]>([]);
  const [recFilters, setRecFilters] = useState({
    transactionType: '',
    reconciliationStatus: '',
    clientId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [recPagination, setRecPagination] = useState({ total: 0, pages: 1, currentPage: 1 });
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);

  const transactionTypes = [
    { value: 'invoice_created', label: t('arReconciliation.types.invoiceCreated', 'Invoice Created') },
    { value: 'invoice_cancelled', label: t('arReconciliation.types.invoiceCancelled', 'Invoice Cancelled') },
    { value: 'receipt_posted', label: t('arReconciliation.types.receiptPosted', 'Receipt Posted') },
    { value: 'receipt_reversed', label: t('arReconciliation.types.receiptReversed', 'Receipt Reversed') },
    { value: 'credit_note_applied', label: t('arReconciliation.types.creditNoteApplied', 'Credit Note Applied') },
    { value: 'bad_debt_writeoff', label: t('arReconciliation.types.badDebtWriteoff', 'Bad Debt Write-off') },
    { value: 'payment_recorded', label: t('arReconciliation.types.paymentRecorded', 'Payment Recorded') },
    { value: 'manual_adjustment', label: t('arReconciliation.types.manualAdjustment', 'Manual Adjustment') },
    { value: 'system_correction', label: t('arReconciliation.types.systemCorrection', 'System Correction') }
  ];

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
      };

      if (clientFilter && clientFilter !== 'all') params.clientId = clientFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const response = await arReceiptsApi.getAll(params);
      console.log('[ARReceiptsListPage] API Response:', response);

      if (response.success) {
        setReceiptList(response.data as ARReceipt[]);
        // Calculate total pages from count
        const total = response.count || 0;
        setTotalPages(Math.ceil(total / 20));
      }
    } catch (error) {
      console.error('[ARReceiptsListPage] Failed to fetch receipts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, clientFilter, statusFilter, dateFrom, dateTo]);

  const fetchAgingReport = useCallback(async () => {
    setLoadingAging(true);
    try {
      const params: any = {};
      if (agingClientFilter && agingClientFilter !== 'all') params.client_id = agingClientFilter;
      if (agingAsOfDate) params.as_of_date = agingAsOfDate;

      const response = await arReceiptsApi.getAgingReport(params);
      console.log('[ARReceiptsListPage] Aging API Response:', response);

      // Handle response format: { success: true, data: [...] }
      const agingItems = response.data || response;
      
      if (Array.isArray(agingItems)) {
        setAgingData(agingItems as AgingBucket[]);
        const totals = agingItems.reduce(
          (acc, item) => ({
            current: acc.current + (parseFloat(item.current) || 0),
            '1-30': acc['1-30'] + (parseFloat(item['1-30']) || 0),
            '31-60': acc['31-60'] + (parseFloat(item['31-60']) || 0),
            '61-90': acc['61-90'] + (parseFloat(item['61-90']) || 0),
            '90+': acc['90+'] + (parseFloat(item['90+']) || 0),
            total: acc.total + (parseFloat(item.totalBalance) || 0),
          }),
          { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 }
        );
        setAgingSummary(totals);
      } else if (response.byClient) {
        setAgingData(response.byClient as AgingBucket[]);
        if (response.summary) {
          setAgingSummary(response.summary);
        }
      }
    } catch (error) {
      console.error('[ARReceiptsListPage] Failed to fetch aging report:', error);
    } finally {
      setLoadingAging(false);
    }
  }, [agingClientFilter, agingAsOfDate]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Load aging data when switching to aging tab
  useEffect(() => {
    if (activeTab === 'aging') {
      fetchAgingReport();
    }
  }, [activeTab, fetchAgingReport]);

  const handleClientClick = async (client: AgingBucket) => {
    setSelectedClient(client.client);
    setLoadingInvoices(true);
    try {
      const response = await arReceiptsApi.getClientStatement(client.client._id, {
        startDate: undefined,
        endDate: agingAsOfDate,
      });
      console.log('[ARReceiptsListPage] Client statement response:', response);

      if (response && response.invoices) {
        setClientInvoices(response.invoices);
      } else if (Array.isArray(response)) {
        setClientInvoices(response);
      } else {
        setClientInvoices([]);
      }
    } catch (error) {
      console.error('Failed to fetch client statement:', error);
      setClientInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handlePost = async (id: string) => {
    try {
      await arReceiptsApi.post(id);
      fetchReceipts();
    } catch (error) {
      console.error('Failed to post receipt:', error);
    }
  };

  const handleReverse = async (id: string) => {
    const reason = window.prompt('Enter reversal reason:');
    if (!reason) return;
    try {
      await arReceiptsApi.reverse(id, reason);
      fetchReceipts();
    } catch (error) {
      console.error('Failed to reverse receipt:', error);
    }
  };

  // AR Reconciliation Fetch Functions
  const fetchDashboard = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, dashboard: true }));
    try {
      const response = await arReconciliationApi.getDashboard();
      if (response && response.data) {
        setDashboardData(response.data);
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
      const response = await arReconciliationApi.getTransactions({
        ...recFilters,
        page: recFilters.page,
        limit: recFilters.limit
      });
      if (response.success) {
        setTransactions(response.data || []);
        setRecPagination({
          total: response.total || 0,
          pages: response.pages || 1,
          currentPage: response.currentPage || 1
        });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, transactions: false }));
    }
  }, [recFilters]);

  const fetchReceivables = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, receivables: true }));
    try {
      const response = await arReconciliationApi.getCurrentReceivables({ limit: 100 });
      if (response.success) {
        setCurrentReceivables(response.data?.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch receivables:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, receivables: false }));
    }
  }, []);

  // Tab effect - load data when switching tabs
  useEffect(() => {
    if (activeTab === 'reconciliation') {
      fetchDashboard();
      fetchReceivables();
    }
    if (activeTab === 'reconciliation-transactions') fetchTransactions();
  }, [activeTab, fetchDashboard, fetchReceivables, fetchTransactions]);

  // AR Reconciliation Actions
  const handleVerify = async () => {
    setLoadingRec(prev => ({ ...prev, verify: true }));
    try {
      const response = await arReconciliationApi.verifyIntegrity({
        clientId: recFilters.clientId || undefined,
        startDate: recFilters.startDate || undefined,
        endDate: recFilters.endDate || undefined
      });
      setVerificationResult(response.data);
      setIsVerifyDialogOpen(true);
    } catch (error) {
      toast({ title: t('common.error'), description: t('arReconciliation.verifyFailed', 'Verification failed'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, verify: false }));
    }
  };

  const handleReconcile = async () => {
    setLoadingRec(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await arReconciliationApi.reconcileAndCorrect({
        clientId: recFilters.clientId || undefined,
        startDate: recFilters.startDate || undefined,
        endDate: recFilters.endDate || undefined
      });
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
    } catch (error) {
      toast({ title: t('common.error'), description: t('arReconciliation.reconcileFailed', 'Reconciliation failed'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, reconcile: false }));
    }
  };

  const handleVerifyAll = async () => {
    setLoadingRec(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await arReconciliationApi.verifyAllPending();
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
    } catch (error) {
      toast({ title: t('common.error'), description: t('arReconciliation.verifyAllFailed', 'Failed to verify all'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, reconcile: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className: string }> = {
      draft: { variant: 'secondary', label: t('arReceipt.status.draft', 'Draft'), className: 'dark:bg-slate-600 dark:text-white' },
      posted: { variant: 'default', label: t('arReceipt.status.posted', 'Posted'), className: 'dark:bg-green-600' },
      reversed: { variant: 'destructive', label: t('arReceipt.status.reversed', 'Reversed'), className: '' },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status, className: '' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: t('arReceipt.paymentMethod.bankTransfer', 'Bank Transfer'),
      cash: t('arReceipt.paymentMethod.cash', 'Cash'),
      cheque: t('arReceipt.paymentMethod.cheque', 'Cheque'),
      card: t('arReceipt.paymentMethod.card', 'Card'),
      other: t('arReceipt.paymentMethod.other', 'Other'),
    };
    return labels[method] || method;
  };

  const formatCurrency = (amount: string | number | undefined, currency: string = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string; className: string }> = {
      invoice_created: { variant: 'default', label: 'Invoice', className: 'dark:bg-blue-600' },
      invoice_cancelled: { variant: 'destructive', label: 'Cancelled', className: '' },
      receipt_posted: { variant: 'secondary', label: 'Receipt', className: 'dark:bg-slate-600 dark:text-white' },
      receipt_reversed: { variant: 'destructive', label: 'Reversed', className: '' },
      credit_note_applied: { variant: 'outline', label: 'Credit Note', className: 'dark:bg-slate-700 dark:text-slate-300' },
      bad_debt_writeoff: { variant: 'destructive', label: 'Write-off', className: '' },
      payment_recorded: { variant: 'default', label: 'Payment', className: 'dark:bg-green-600' },
      manual_adjustment: { variant: 'secondary', label: 'Adjustment', className: 'dark:bg-slate-600 dark:text-white' },
      system_correction: { variant: 'outline', label: 'Correction', className: 'dark:bg-slate-700 dark:text-slate-300' }
    };
    const c = config[type] || { variant: 'secondary', label: type, className: '' };
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const getReconciliationStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string; className: string }> = {
      pending: { variant: 'secondary', label: t('arReconciliation.pending', 'Pending'), className: 'dark:bg-slate-600 dark:text-white' },
      verified: { variant: 'default', label: t('arReconciliation.verified', 'Verified'), className: 'dark:bg-green-600' },
      discrepancy: { variant: 'destructive', label: t('arReconciliation.discrepancy', 'Discrepancy'), className: '' },
      corrected: { variant: 'outline', label: t('arReconciliation.corrected', 'Corrected'), className: 'dark:bg-slate-700 dark:text-slate-300' }
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };


  const exportAgingToCSV = () => {
    const headers = ['Client', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
    const rows = agingData.map((item) => [
      item.client.name,
      item.current || 0,
      item['1-30'] || 0,
      item['31-60'] || 0,
      item['61-90'] || 0,
      item['90+'] || 0,
      item.totalBalance || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar_aging_${agingAsOfDate || new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className: string }> = {
      draft: { variant: 'secondary', label: 'Draft', className: 'dark:bg-slate-600 dark:text-white' },
      confirmed: { variant: 'default', label: 'Confirmed', className: 'dark:bg-blue-600' },
      partial: { variant: 'outline', label: 'Partial', className: 'dark:bg-slate-700 dark:text-slate-300' },
      paid: { variant: 'default', label: 'Paid', className: 'dark:bg-green-600' },
      cancelled: { variant: 'destructive', label: 'Cancelled', className: '' },
    };
    const config = statusConfig[status] || { variant: 'outline', label: status, className: '' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <TooltipProvider>
      <Layout>
        <div className="container mx-auto py-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">{t('arReceipt.title', 'Customer Payments')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('arReceipt.description', 'Manage customer receipts and aging')}</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'aging' && (
              <Button variant="outline" onClick={exportAgingToCSV} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <Download className="mr-2 h-4 w-4" />
                {t('common.export', 'Export CSV')}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex h-auto w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="receipts">{t('arReceipt.receipts', 'Receipts')}</TabsTrigger>
            <TabsTrigger value="aging">{t('arAging.title', 'Aging Report')}</TabsTrigger>
            <TabsTrigger value="reconciliation">
              <Activity className="w-4 h-4 mr-2" />
              {t('arReconciliation.dashboard', 'Dashboard')}
            </TabsTrigger>
            <TabsTrigger value="receivables">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('arReconciliation.receivables', 'Receivables')}
            </TabsTrigger>
            <TabsTrigger value="reconciliation-transactions">
              <FileText className="w-4 h-4 mr-2" />
              {t('arReconciliation.transactions', 'Transactions')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="space-y-6">
            {/* Filters */}
            <div className="bg-card rounded-lg border p-4 dark:bg-slate-800 dark:border-slate-700">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arReceipt.search', 'Search')}</label>
                  <Input
                    placeholder={t('arReceipt.searchPlaceholder', 'Search by reference...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arReceipt.client', 'Client')}</label>
                  <Select value={clientFilter || 'all'} onValueChange={(value) => setClientFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder={t('arReceipt.allClients', 'All Clients')} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="all" className="dark:text-white">{t('arReceipt.allClients', 'All Clients')}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client._id} value={client._id} className="dark:text-white">
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arReceipt.status', 'Status')}</label>
                  <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder={t('arReceipt.allStatuses', 'All Statuses')} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="all" className="dark:text-white">{t('arReceipt.allStatuses', 'All Statuses')}</SelectItem>
                      <SelectItem value="draft" className="dark:text-white">{t('arReceipt.status.draft', 'Draft')}</SelectItem>
                      <SelectItem value="posted" className="dark:text-white">{t('arReceipt.status.posted', 'Posted')}</SelectItem>
                      <SelectItem value="reversed" className="dark:text-white">{t('arReceipt.status.reversed', 'Reversed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arReceipt.dateFrom', 'Date From')}</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arReceipt.dateTo', 'Date To')}</label>
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
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                <div className="space-y-3 p-3 xl:hidden">{receiptList.length === 0 ? <div className="py-6"><EmptyState compact icon={Wallet} title={t('arReceipt.noReceipts', 'No receipts yet')} description={t('arReceipt.noReceiptsHint', 'Customer payments and receipt records will appear here once created.')}/></div> : receiptList.map((receipt) => <article key={receipt._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-mono text-sm font-semibold">{receipt.referenceNo || 'N/A'}</p><p className="mt-1 break-words text-sm">{receipt.client?.name || '-'}</p></div>{getStatusBadge(receipt.status)}</div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs dark:border-slate-700"><div className="text-muted-foreground">Date<p className="mt-1 text-sm text-foreground">{formatDate(receipt.receiptDate)}</p></div><div className="text-muted-foreground">Method<p className="mt-1 text-sm text-foreground">{getPaymentMethodLabel(receipt.paymentMethod)}</p></div><div className="col-span-2 text-muted-foreground">Amount<p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(receipt.amountReceived, receipt.currencyCode)}</p></div></div><div className="mt-3 flex flex-wrap gap-2 border-t pt-3 dark:border-slate-700"><Button size="sm" variant="outline" onClick={() => navigate(`/ar-receipts/${receipt._id}`)}><Eye className="mr-1.5 h-4 w-4"/>View</Button>{receipt.status === 'draft' && <><Button size="sm" variant="outline" onClick={() => navigate(`/ar-receipts/${receipt._id}/edit`)}><Send className="mr-1.5 h-4 w-4"/>Edit</Button><Button size="sm" onClick={() => handlePost(receipt._id)}><Send className="mr-1.5 h-4 w-4"/>Post</Button></>}{receipt.status === 'posted' && <Button size="sm" variant="outline" onClick={() => handleReverse(receipt._id)}><Undo2 className="mr-1.5 h-4 w-4"/>Reverse</Button>}</div></article>)}</div>
                <div className="hidden overflow-x-auto xl:block"><Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50">
                      <TableHead className="dark:text-slate-200">{t('arReceipt.reference', 'Reference')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('arReceipt.client', 'Client')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('arReceipt.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('arReceipt.paymentMethod', 'Payment Method')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('arReceipt.amount', 'Amount')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('arReceipt.status', 'Status')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="border-0 py-2">
                          <EmptyState
                            compact
                            icon={Wallet}
                            title={t('arReceipt.noReceipts', 'No receipts yet')}
                            description={t('arReceipt.noReceiptsHint', 'Customer payments and receipt records will appear here once created.')}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      receiptList.map((receipt) => (
                        <TableRow key={receipt._id} className="dark:border-slate-600">
                          <TableCell className="font-medium dark:text-white">
                            <FileText className="inline-block mr-2 h-4 w-4" />
                            {receipt.referenceNo || 'N/A'}
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{receipt.client?.name || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(receipt.receiptDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{getPaymentMethodLabel(receipt.paymentMethod)}</TableCell>
                          <TableCell className="font-medium dark:text-slate-200">
                            {formatCurrency(receipt.amountReceived, receipt.currencyCode)}
                          </TableCell>
                          <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/ar-receipts/${receipt._id}`)}
                                    className="dark:text-slate-300"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('arReceipt.viewReceipt', 'View Receipt')}</p>
                                </TooltipContent>
                              </Tooltip>
                              {receipt.status === 'draft' && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/ar-receipts/${receipt._id}/edit`)}
                                        className="dark:text-slate-300"
                                      >
                                        <Send className="h-4 w-4 text-green-500" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('arReceipt.editReceipt', 'Edit Receipt')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePost(receipt._id)}
                                        className="dark:text-slate-300"
                                      >
                                        <Send className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('arReceipt.postReceipt', 'Post Receipt')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {receipt.status === 'posted' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleReverse(receipt._id)}
                                      className="dark:text-slate-300"
                                    >
                                      <Undo2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('arReceipt.reverseReceipt', 'Reverse Receipt')}</p>
                                  </TooltipContent>
                                </Tooltip>
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
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50 dark:text-slate-400' : 'dark:text-slate-200 dark:hover:bg-slate-700'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          onClick={() => setPage(p)}
                          isActive={page === p}
                          className="dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        className={page === totalPages ? 'pointer-events-none opacity-50 dark:text-slate-400' : 'dark:text-slate-200 dark:hover:bg-slate-700'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          <TabsContent value="aging" className="space-y-6">
            {/* Aging Filters */}
            <div className="bg-card rounded-lg border p-4 dark:bg-slate-800 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arAging.client', 'Client')}</label>
                  <Select value={agingClientFilter || 'all'} onValueChange={(value) => setAgingClientFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder={t('arAging.allClients', 'All Clients')} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="all" className="dark:text-white">{t('arAging.allClients', 'All Clients')}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client._id} value={client._id} className="dark:text-white">
                          {client.name} ({client.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-slate-200">{t('arAging.asOfDate', 'As of Date')}</label>
                  <Input
                    type="date"
                    value={agingAsOfDate}
                    onChange={(e) => setAgingAsOfDate(e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchAgingReport}>
                    {t('arAging.refresh', 'Refresh')}
                  </Button>
                </div>
              </div>
            </div>

            {selectedClient ? (
              /* Drill-down view */
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="ghost" onClick={() => setSelectedClient(null)} className="dark:text-slate-200">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('common.back', 'Back')}
                  </Button>
                  <h2 className="text-xl font-bold dark:text-white">
                    {selectedClient.name} - {t('arAging.invoices', 'Invoices')}
                  </h2>
                </div>

                <Card className="dark:bg-slate-800">
                  <CardContent className="p-0">
                    {loadingInvoices ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : clientInvoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                        <FileText className="mx-auto h-8 w-8 mb-2" />
                        <p>{t('arAging.noInvoices', 'No invoices found')}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:bg-slate-700/50">
                            <TableHead className="dark:text-slate-200">{t('arAging.invoiceNumber', 'Invoice #')}</TableHead>
                            <TableHead className="dark:text-slate-200">{t('arAging.reference', 'Reference')}</TableHead>
                            <TableHead className="dark:text-slate-200">{t('arAging.invoiceDate', 'Invoice Date')}</TableHead>
                            <TableHead className="dark:text-slate-200">{t('arAging.dueDate', 'Due Date')}</TableHead>
                            <TableHead className="text-right dark:text-slate-200">{t('arAging.balance', 'Balance')}</TableHead>
                            <TableHead className="dark:text-slate-200">{t('arAging.status', 'Status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientInvoices.map((invoice) => (
                            <TableRow key={invoice._id} className="dark:border-slate-600">
                              <TableCell className="font-medium dark:text-white">{invoice.invoiceNumber}</TableCell>
                              <TableCell className="dark:text-slate-300">{invoice.referenceNo || '-'}</TableCell>
                              <TableCell className="dark:text-slate-300">{formatDate(invoice.invoiceDate)}</TableCell>
                              <TableCell className="dark:text-slate-300">{formatDate(invoice.dueDate)}</TableCell>
                              <TableCell className="text-right font-medium dark:text-slate-200">
                                {formatCurrency(parseFloat(invoice.balance || invoice.amountOutstanding || '0'))}
                              </TableCell>
                              <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Main aging table */
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-6 gap-4">
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm dark:text-slate-400">{t('arAging.current', 'Current')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold dark:text-white">{formatCurrency(agingSummary.current)}</p>
                    </CardContent>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm dark:text-slate-400">1-30 {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold dark:text-white">{formatCurrency(agingSummary['1-30'])}</p>
                    </CardContent>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm dark:text-slate-400">31-60 {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold dark:text-white">{formatCurrency(agingSummary['31-60'])}</p>
                    </CardContent>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm dark:text-slate-400">61-90 {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold dark:text-white">{formatCurrency(agingSummary['61-90'])}</p>
                    </CardContent>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm dark:text-slate-400">90+ {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(agingSummary['90+'])}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary text-primary-foreground dark:bg-slate-900">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{t('arAging.total', 'Total')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold">{formatCurrency(agingSummary.total)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Table */}
                <Card className="dark:bg-slate-800">
                  <CardContent className="p-0">
                    {loadingAging ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : agingData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                        <p>{t('arAging.noData', 'No aging data found')}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:bg-slate-700/50">
                            <TableHead className="dark:text-slate-200">{t('arAging.client', 'Client')}</TableHead>
                            <TableHead className="text-right dark:text-slate-200">{t('arAging.current', 'Current')}</TableHead>
                            <TableHead className="text-right dark:text-slate-200">1-30</TableHead>
                            <TableHead className="text-right dark:text-slate-200">31-60</TableHead>
                            <TableHead className="text-right dark:text-slate-200">61-90</TableHead>
                            <TableHead className="text-right dark:text-slate-200">90+</TableHead>
                            <TableHead className="text-right dark:text-slate-200">{t('arAging.total', 'Total')}</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agingData.map((item) => (
                            <TableRow
                              key={item.client._id}
                              className="cursor-pointer hover:bg-muted/50 dark:border-slate-600"
                              onClick={() => handleClientClick(item)}
                            >
                              <TableCell className="font-medium dark:text-white">
                                <div>{item.client.name}</div>
                                <div className="text-sm text-muted-foreground dark:text-slate-500">{item.client.code}</div>
                              </TableCell>
                              <TableCell className="text-right dark:text-slate-300">{formatCurrency(item.current)}</TableCell>
                              <TableCell className="text-right dark:text-slate-300">{formatCurrency(item['1-30'])}</TableCell>
                              <TableCell className="text-right dark:text-slate-300">{formatCurrency(item['31-60'])}</TableCell>
                              <TableCell className="text-right dark:text-slate-300">{formatCurrency(item['61-90'])}</TableCell>
                              <TableCell className="text-right text-red-600 dark:text-red-400">{formatCurrency(item['90+'])}</TableCell>
                              <TableCell className="text-right font-medium dark:text-slate-200">{formatCurrency(item.totalBalance)}</TableCell>
                              <TableCell>
                                <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-slate-500" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Reconciliation Dashboard Tab */}
          <TabsContent value="reconciliation" className="space-y-6">
            <div className="flex justify-end gap-2">
              <Button onClick={handleVerify} disabled={loadingRec.verify} variant="outline" className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                {loadingRec.verify ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('arReconciliation.verifyIntegrity', 'Verify Integrity')}
              </Button>
              <Button onClick={handleReconcile} disabled={loadingRec.reconcile}>
                {loadingRec.reconcile ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('arReconciliation.reconcile', 'Reconcile & Correct')}
              </Button>
              <Button onClick={handleVerifyAll} disabled={loadingRec.reconcile} variant="outline" className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('arReconciliation.verifyAll', 'Verify All Pending')}
              </Button>
            </div>

            {loadingRec.dashboard ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground dark:text-slate-500" /></div>
            ) : !dashboardData ? (
              <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                <p>{t('arReconciliation.noData', 'No dashboard data available')}</p>
                <Button onClick={fetchDashboard} variant="outline" className="mt-4 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription className="dark:text-slate-400">{t('arReconciliation.totalTransactions', 'Total Transactions')}</CardDescription>
                      <CardTitle className="text-3xl dark:text-white">{((dashboardData.stats?.totalTransactions) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription className="dark:text-slate-400">{t('arReconciliation.recentTransactions', 'Recent (30 Days)')}</CardDescription>
                      <CardTitle className="text-3xl dark:text-white">{((dashboardData.stats?.recentTransactions) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription className="dark:text-slate-400">{t('arReconciliation.pendingReconciliation', 'Pending Reconciliation')}</CardDescription>
                      <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">{((dashboardData.stats?.pendingReconciliation) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="dark:bg-slate-800">
                    <CardHeader className="pb-2">
                      <CardDescription className="dark:text-slate-400">{t('arReconciliation.discrepancies', 'Discrepancies')}</CardDescription>
                      <CardTitle className={`text-3xl ${(dashboardData.stats?.discrepancyCount || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {((dashboardData.stats?.discrepancyCount) || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card className="dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-white">{t('arReconciliation.recentActivity', 'Recent Activity')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:bg-slate-700/50">
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.date', 'Date')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.client', 'Client')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.description', 'Description')}</TableHead>
                          <TableHead className="text-right dark:text-slate-200">{t('arReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.recentActivity?.slice(0, 5).map((tx: ARTransaction) => (
                          <TableRow key={tx._id} className="dark:border-slate-600">
                            <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                            <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                            <TableCell className="dark:text-slate-300">{tx.client?.name || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate dark:text-slate-300">{tx.description}</TableCell>
                            <TableCell className="text-right">
                              <span className={tx.direction === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
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

          {/* Receivables Tab */}
          <TabsContent value="receivables" className="space-y-6">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('arReconciliation.outstandingReceivables', 'Outstanding Receivables')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRec.receivables ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground dark:text-slate-500" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50">
                        <TableHead className="dark:text-slate-200">{t('arReconciliation.invoiceNumber', 'Invoice #')}</TableHead>
                        <TableHead className="dark:text-slate-200">{t('arReconciliation.client', 'Client')}</TableHead>
                        <TableHead className="dark:text-slate-200">{t('arReconciliation.date', 'Date')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('arReconciliation.total', 'Total')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('arReconciliation.paid', 'Paid')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('arReconciliation.balance', 'Balance')}</TableHead>
                        <TableHead className="dark:text-slate-200">{t('arReconciliation.status', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReceivables.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 dark:text-slate-400">{t('arReconciliation.noReceivables', 'No outstanding receivables')}</TableCell></TableRow>
                      ) : (
                        currentReceivables.map((inv) => (
                          <TableRow key={inv._id} className="cursor-pointer hover:bg-muted/50 dark:border-slate-600" onClick={() => navigate(`/invoices/${inv._id}`)}>
                            <TableCell className="dark:text-slate-300">{inv.invoiceNumber || inv.referenceNo || '-'}</TableCell>
                            <TableCell className="dark:text-slate-300">{inv.client?.name || '-'}</TableCell>
                            <TableCell className="dark:text-slate-300">{formatDate(inv.invoiceDate)}</TableCell>
                            <TableCell className="text-right dark:text-slate-300">{formatCurrency(inv.totalAmount)}</TableCell>
                            <TableCell className="text-right dark:text-slate-300">{formatCurrency(inv.amountPaid)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{formatCurrency(inv.balance)}</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'partially_paid' ? 'secondary' : 'outline'}>
                                {inv.status}
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

          {/* Reconciliation Transactions Tab */}
          <TabsContent value="reconciliation-transactions" className="space-y-6">
            <Card className="dark:bg-slate-800">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={recFilters.transactionType || 'all'} onValueChange={(v) => setRecFilters(p => ({ ...p, transactionType: v === 'all' ? '' : v, page: 1 }))}>
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600"><SelectValue placeholder={t('arReconciliation.allTypes', 'All Types')} /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="all" className="dark:text-white">{t('arReconciliation.allTypes', 'All Types')}</SelectItem>
                      {transactionTypes.map(t => <SelectItem key={t.value} value={t.value} className="dark:text-white">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={recFilters.reconciliationStatus || 'all'} onValueChange={(v) => setRecFilters(p => ({ ...p, reconciliationStatus: v === 'all' ? '' : v, page: 1 }))}>
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600"><SelectValue placeholder={t('arReconciliation.allStatuses', 'All Statuses')} /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="all" className="dark:text-white">{t('arReconciliation.allStatuses', 'All Statuses')}</SelectItem>
                      <SelectItem value="pending" className="dark:text-white">{t('arReconciliation.pending', 'Pending')}</SelectItem>
                      <SelectItem value="verified" className="dark:text-white">{t('arReconciliation.verified', 'Verified')}</SelectItem>
                      <SelectItem value="discrepancy" className="dark:text-white">{t('arReconciliation.discrepancy', 'Discrepancy')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={recFilters.startDate} onChange={(e) => setRecFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))} placeholder={t('arReconciliation.startDate', 'Start Date')} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  <Input type="date" value={recFilters.endDate} onChange={(e) => setRecFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))} placeholder={t('arReconciliation.endDate', 'End Date')} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('arReconciliation.transactions', 'Transactions')} ({recPagination.total} total)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRec.transactions ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground dark:text-slate-500" /></div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:bg-slate-700/50">
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.date', 'Date')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.reference', 'Reference')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.client', 'Client')}</TableHead>
                          <TableHead className="text-right dark:text-slate-200">{t('arReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead className="text-right dark:text-slate-200">{t('arReconciliation.balance', 'Balance')}</TableHead>
                          <TableHead className="dark:text-slate-200">{t('arReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 dark:text-slate-400">{t('arReconciliation.noTransactions', 'No transactions found')}</TableCell></TableRow>
                        ) : (
                          transactions.map((tx) => (
                            <TableRow key={tx._id} className="dark:border-slate-600">
                              <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                              <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                              <TableCell className="dark:text-slate-300">{tx.referenceNo || '-'}</TableCell>
                              <TableCell className="dark:text-slate-300">{tx.client?.name || '-'}</TableCell>
                              <TableCell className="text-right">
                                <span className={tx.direction === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground dark:text-slate-500">{formatCurrency(tx.clientBalanceAfter)}</TableCell>
                              <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    {recPagination.pages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button variant="outline" size="sm" disabled={recFilters.page === 1} onClick={() => setRecFilters(p => ({ ...p, page: p.page - 1 }))} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.previous', 'Previous')}</Button>
                        <span className="text-sm text-muted-foreground dark:text-slate-400">{t('common.pageOf', 'Page {{page}} of {{pages}}', { page: recPagination.currentPage, pages: recPagination.pages })}</span>
                        <Button variant="outline" size="sm" disabled={recFilters.page >= recPagination.pages} onClick={() => setRecFilters(p => ({ ...p, page: p.page + 1 }))} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.next', 'Next')}</Button>
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
          <DialogContent className="max-w-2xl dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('arReconciliation.integrityCheck', 'Data Integrity Check')}</DialogTitle>
            </DialogHeader>
            {verificationResult && (
              <div className="space-y-4">
                {verificationResult.verified ? (
                  <Alert className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-800 dark:text-green-400">{t('arReconciliation.dataVerified', 'Data Verified')}</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-500">{t('arReconciliation.noDiscrepancies', 'No discrepancies found.')}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive" className="dark:bg-red-900/30">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle className="dark:text-red-400">{t('arReconciliation.discrepanciesFound', 'Discrepancies Found')}</AlertTitle>
                    <AlertDescription className="dark:text-red-300">{t('arReconciliation.discrepancyCount', '{{count}} discrepancies found.', { count: verificationResult.discrepancies?.length || 0 })}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2">
                  {!verificationResult.verified && <Button onClick={() => { setIsVerifyDialogOpen(false); handleReconcile(); }}>{t('arReconciliation.reconcileNow', 'Reconcile Now')}</Button>}
                  <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.close', 'Close')}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
    </TooltipProvider>
  );
}
