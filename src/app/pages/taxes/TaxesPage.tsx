import { useState, useEffect, useCallback } from 'react';
import { 
  taxRatesApi, 
  taxLiabilityApi, 
  taxDashboardApi,
  chartOfAccountsApi,
  TaxRate, 
  TaxDashboardData,
  ChartOfAccountItem,
  LiabilityReport,
  bankAccountsApi, 
  BankAccount 
} from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Edit,
  Trash2,
  Calculator,
  Calendar,
  CreditCard,
  Building2,
  AlertCircle,
  Receipt,
  Users,
  Briefcase,
  Percent
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface SettlementFormData {
  tax_code: string;
  amount: number;
  settlement_date: string;
  payment_method: string;
  bank_account_id: string;
  period_description: string;
}

const TAX_TYPES = [
  { value: 'vat', label: 'VAT' },
  { value: 'sales_tax', label: 'Sales Tax' },
  { value: 'withholding', label: 'Withholding Tax' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'zero_rated', label: 'Zero Rated' },
];

const PAYMENT_METHODS = [
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
];

// Zod Schema for Tax Rate Form
const taxRateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(10, 'Code must be 10 characters or less'),
  rate_pct: z.number().min(0, 'Rate must be positive'),
  type: z.enum(['vat', 'sales_tax', 'withholding', 'exempt', 'zero_rated']),
  input_account_id: z.string().min(1, 'Input Account is required'),
  output_account_id: z.string().min(1, 'Output Account is required'),
  input_account_code: z.string().min(1, 'Input Account Code is required'),
  output_account_code: z.string().min(1, 'Output Account Code is required'),
  is_active: z.boolean(),
  effective_from: z.string().min(1, 'Effective From date is required'),
  effective_to: z.string().optional(),
});

type TaxRateFormValues = z.infer<typeof taxRateSchema>;

export default function TaxesPage() {
  // State for Tax Dashboard (auto-detected data)
  const [dashboardData, setDashboardData] = useState<TaxDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [periodFilter, setPeriodFilter] = useState({
    year: new Date().getFullYear(),
    month: '' // empty = all months
  });

  // State for Tax Rates
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // State for Chart of Accounts (for account selectors)
  const [chartAccounts, setChartAccounts] = useState<ChartOfAccountItem[]>([]);

  // State for Tax Rate Form with Zod validation
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [savingRate, setSavingRate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaxRateFormValues>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      name: '',
      code: '',
      rate_pct: 0,
      type: 'vat',
      input_account_id: '',
      output_account_id: '',
      input_account_code: '',
      output_account_code: '',
      is_active: true,
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      effective_to: '',
    },
  });

  const watchType = watch('type');
  const watchInputAccountId = watch('input_account_id');
  const watchOutputAccountId = watch('output_account_id');

  // State for Settlement
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementForm, setSettlementForm] = useState<SettlementFormData>({
    tax_code: '',
    amount: 0,
    settlement_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'bank',
    bank_account_id: '',
    period_description: '',
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  // State for Liability Report
  const [liabilityReport, setLiabilityReport] = useState<LiabilityReport | null>(null);
  const [loadingLiability, setLoadingLiability] = useState(false);
  const [liabilityPeriodStart, setLiabilityPeriodStart] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')
  );
  const [liabilityPeriodEnd, setLiabilityPeriodEnd] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Fetch Tax Dashboard Data (auto-detected from all sources)
  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const params: any = { year: periodFilter.year };
      if (periodFilter.month) params.month = periodFilter.month;
      
      const response = await taxDashboardApi.get(params);
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tax dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  }, [periodFilter]);

  // Fetch Tax Rates
  const fetchTaxRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const params: any = {};
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await taxRatesApi.getAll(params);
      if (response.success) {
        setTaxRates(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tax rates');
    } finally {
      setLoadingRates(false);
    }
  }, [typeFilter]);

  // Fetch Chart of Accounts for account selectors
  const fetchChartAccounts = useCallback(async () => {
    try {
      const response = await chartOfAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setChartAccounts(response.data);
      }
    } catch (error) {
      console.error('Failed to load chart of accounts', error);
    }
  }, []);

  // Fetch Bank Accounts
  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setBankAccounts(response.data);
        if (response.data.length > 0 && !settlementForm.bank_account_id) {
          setSettlementForm(prev => ({ ...prev, bank_account_id: response.data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Failed to load bank accounts', error);
    }
  }, [settlementForm.bank_account_id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchTaxRates();
  }, [fetchTaxRates]);

  useEffect(() => {
    fetchChartAccounts();
    fetchBankAccounts();
  }, [fetchChartAccounts, fetchBankAccounts]);

  // Chart of accounts loaded for account selectors in form

  // Handle Tax Rate Form
  const handleOpenRateForm = (rate?: TaxRate) => {
    if (rate) {
      setEditingRate(rate);
      reset({
        name: rate.name,
        code: rate.code,
        rate_pct: rate.rate_pct,
        type: rate.type,
        input_account_id: typeof rate.input_account_id === 'string' ? rate.input_account_id : rate.input_account_id._id,
        output_account_id: typeof rate.output_account_id === 'string' ? rate.output_account_id : rate.output_account_id._id,
        input_account_code: rate.input_account_code,
        output_account_code: rate.output_account_code,
        is_active: rate.is_active,
        effective_from: format(new Date(rate.effective_from), 'yyyy-MM-dd'),
        effective_to: rate.effective_to ? format(new Date(rate.effective_to), 'yyyy-MM-dd') : '',
      });
    } else {
      setEditingRate(null);
      reset({
        name: '',
        code: '',
        rate_pct: 0,
        type: 'vat',
        input_account_id: '',
        output_account_id: '',
        input_account_code: '',
        output_account_code: '',
        is_active: true,
        effective_from: format(new Date(), 'yyyy-MM-dd'),
        effective_to: '',
      });
    }
    setIsRateFormOpen(true);
  };

  const onSubmitRateForm: SubmitHandler<TaxRateFormValues> = async (data) => {
    setSavingRate(true);
    try {
      const formData = {
        ...data,
        effective_to: data.effective_to || undefined,
      };

      if (editingRate) {
        await taxRatesApi.update(editingRate._id, formData);
        toast.success('Tax rate updated successfully');
      } else {
        await taxRatesApi.create(formData);
        toast.success('Tax rate created successfully');
      }

      setIsRateFormOpen(false);
      fetchTaxRates();
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tax rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this tax rate?')) return;

    try {
      await taxRatesApi.delete(id);
      toast.success('Tax rate deactivated');
      fetchTaxRates();
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate tax rate');
    }
  };

  // Fetch Liability Report
  const fetchLiabilityReport = async () => {
    setLoadingLiability(true);
    try {
      const response = await taxLiabilityApi.getReport({
        periodStart: liabilityPeriodStart,
        periodEnd: liabilityPeriodEnd
      });
      if (response.success) {
        setLiabilityReport(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load liability report');
    } finally {
      setLoadingLiability(false);
    }
  };

  // Handle Settlement
  const handleOpenSettlement = (taxType: string, amount: number) => {
    setSettlementForm({
      tax_code: taxType,
      amount: Math.max(0, amount),
      settlement_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'bank',
      bank_account_id: bankAccounts[0]?._id || '',
      period_description: `${taxType} Settlement ${periodFilter.year}${periodFilter.month ? ` - Month ${periodFilter.month}` : ''}`,
    });
    setIsSettlementOpen(true);
  };

  const handleSubmitSettlement = async () => {
    setSubmittingSettlement(true);
    try {
      const settlementType = settlementForm.tax_code.toLowerCase();
      const data = {
        amount: settlementForm.amount,
        settlement_date: settlementForm.settlement_date,
        payment_method: settlementForm.payment_method,
        bank_account_id: settlementForm.bank_account_id,
        period_description: settlementForm.period_description,
      };

      // Use the appropriate settlement endpoint based on tax type
      if (settlementType === 'paye') {
        await taxLiabilityApi.postPayeSettlement(data);
      } else if (settlementType === 'rssb') {
        await taxLiabilityApi.postRssbSettlement(data);
      } else {
        await taxLiabilityApi.postVatSettlement(data);
      }

      toast.success('Tax settlement posted successfully');
      setIsSettlementOpen(false);
      fetchDashboard();
      // Refresh liability report if it was loaded
      if (liabilityReport) {
        fetchLiabilityReport();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to post settlement');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  // Handle account selection - auto-fill account code
  const handleAccountSelect = (field: 'input_account_id' | 'output_account_id', accountId: string) => {
    setValue(field, accountId);
    const account = chartAccounts.find(a => a._id === accountId);
    if (account) {
      if (field === 'input_account_id') {
        setValue('input_account_code', account.code);
      } else {
        setValue('output_account_code', account.code);
      }
    }
  };

  // Filter tax rates
  const filteredRates = taxRates.filter(rate => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        rate.name.toLowerCase().includes(query) ||
        rate.code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getTaxTypeBadge = (type: string) => {
    const typeInfo = TAX_TYPES.find(t => t.value === type);
    return typeInfo?.label || type;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Tax Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              All tax data is automatically tracked from invoices, expenses, and payroll
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={String(periodFilter.year)} 
              onValueChange={(v) => setPeriodFilter(prev => ({ ...prev, year: parseInt(v) }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={periodFilter.month || 'all'} 
              onValueChange={(v) => setPeriodFilter(prev => ({ ...prev, month: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={String(m)}>
                    {format(new Date(2024, m - 1), 'MMMM')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="rates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tax Rates
            </TabsTrigger>
            <TabsTrigger value="liability" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Liability Report
            </TabsTrigger>
          </TabsList>

          {/* ========== DASHBOARD TAB ========== */}
          <TabsContent value="dashboard" className="space-y-6">
            {loadingDashboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : dashboardData ? (
              <>
                {/* Summary Cards - Auto-detected */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* VAT Card */}
                  <Card className={dashboardData.vat.net >= 0 ? 'border-blue-200 dark:border-blue-800' : 'border-green-200 dark:border-green-800'}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            VAT Payable
                          </p>
                          <p className={`text-2xl font-bold ${dashboardData.vat.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCurrency(dashboardData.vat.net >= 0 ? dashboardData.vat.net : 0)}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            From {dashboardData.vat.invoiceCount} invoices, {dashboardData.vat.expenseCount} expenses
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PAYE Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            PAYE Tax
                          </p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(dashboardData.paye.collected)}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            From {dashboardData.paye.employeeCount} employees
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Withholding Tax Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Withholding Tax
                          </p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(dashboardData.withholding.total)}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Auto-tracked from journal entries
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Percent className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Corporate Tax Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Corporate Tax
                          </p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {formatCurrency(dashboardData.corporateIncome.total)}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {dashboardData.corporateIncome.rate}% rate
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Grand Total & Quick Actions */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Total Tax Obligations
                        </p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(dashboardData.totals.grandTotal)}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-blue-600">VAT: {formatCurrency(dashboardData.totals.vat)}</span>
                          <span className="text-green-600">PAYE: {formatCurrency(dashboardData.totals.paye)}</span>
                          <span className="text-orange-600">WHT: {formatCurrency(dashboardData.totals.withholding)}</span>
                          <span className="text-purple-600">CIT: {formatCurrency(dashboardData.totals.corporate)}</span>
                        </div>
                      </div>
                      {dashboardData.totals.grandTotal > 0 && (
                        <Button onClick={() => handleOpenSettlement('ALL', dashboardData.totals.grandTotal)}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Settle All Taxes
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                {(dashboardData.upcomingDeadlines.length > 0 || dashboardData.overdue.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Tax Calendar
                      </CardTitle>
                      <CardDescription>
                        Upcoming and overdue tax deadlines
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dashboardData.overdue.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-red-600 mb-2">Overdue</h4>
                          <div className="space-y-2">
                            {dashboardData.overdue.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  <div>
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm text-slate-500">{item.taxType} - Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}</p>
                                  </div>
                                </div>
                                <Badge variant="destructive">Overdue</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {dashboardData.upcomingDeadlines.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-orange-600 mb-2">Upcoming</h4>
                          <div className="space-y-2">
                            {dashboardData.upcomingDeadlines.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-orange-600" />
                                  <div>
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm text-slate-500">{item.taxType} - Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="border-orange-200 text-orange-700">
                                  {Math.ceil((new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No tax data available
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Tax data will appear automatically when you create invoices, expenses, or process payroll.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ========== TAX RATES TAB ========== */}
          <TabsContent value="rates" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Tax Rate Configuration</CardTitle>
                  <CardDescription>
                    Configure tax rates for automatic calculation on transactions
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenRateForm()} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Tax Rate
                </Button>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search tax rates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TAX_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tax Rates Table */}
                {loadingRates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : filteredRates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                      No tax rates configured
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                      Add tax rates to automatically calculate taxes on invoices and expenses
                    </p>
                    <Button onClick={() => handleOpenRateForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tax Rate
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Rate %</TableHead>
                          <TableHead>Input Account</TableHead>
                          <TableHead>Output Account</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRates.map((rate) => (
                          <TableRow key={rate._id}>
                            <TableCell className="font-mono font-medium">{rate.code}</TableCell>
                            <TableCell>{rate.name}</TableCell>
                            <TableCell><Badge variant="outline">{getTaxTypeBadge(rate.type)}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{rate.rate_pct.toFixed(2)}%</TableCell>
                            <TableCell className="font-mono text-sm">{rate.input_account_code}</TableCell>
                            <TableCell className="font-mono text-sm">{rate.output_account_code}</TableCell>
                            <TableCell>
                              <Badge
                                variant={rate.is_active ? 'default' : 'secondary'}
                                className={rate.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                              >
                                {rate.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenRateForm(rate)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRate(rate._id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== LIABILITY REPORT TAB ========== */}
          <TabsContent value="liability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tax Liability Report</CardTitle>
                <CardDescription>
                  VAT, PAYE, and RSSB liability breakdown from posted journal entries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Selection */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="liability_start">Period Start</Label>
                    <Input
                      id="liability_start"
                      type="date"
                      value={liabilityPeriodStart}
                      onChange={(e) => setLiabilityPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="liability_end">Period End</Label>
                    <Input
                      id="liability_end"
                      type="date"
                      value={liabilityPeriodEnd}
                      onChange={(e) => setLiabilityPeriodEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <Button onClick={fetchLiabilityReport} disabled={loadingLiability} className="w-full">
                      {loadingLiability ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                      Generate Report
                    </Button>
                  </div>
                </div>

                {/* Report Results */}
                {liabilityReport && (
                  <div className="space-y-6">
                    {/* VAT Section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Percent className="h-5 w-5 text-blue-500" />
                        VAT
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-slate-500">Output VAT Collected</p>
                          <p className="text-lg font-semibold text-green-700">{liabilityReport.vat.output_vat_collected.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-slate-500">Input VAT Claimed</p>
                          <p className="text-lg font-semibold text-red-700">{liabilityReport.vat.input_vat_claimed.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-slate-500">Net VAT Payable</p>
                          <p className="text-lg font-semibold text-blue-700">{liabilityReport.vat.net_vat_payable.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500">Status</p>
                          <p className="text-lg font-semibold">
                            {liabilityReport.vat.is_payable ? (
                              <Badge className="bg-red-100 text-red-700">Payable</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700">Refund Due</Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-3">
                        <div>Output reversed: {liabilityReport.vat.output_vat_reversed.toLocaleString()}</div>
                        <div>Input reversed: {liabilityReport.vat.input_vat_reversed.toLocaleString()}</div>
                        <div>Net output: {liabilityReport.vat.net_output_vat.toLocaleString()}</div>
                      </div>
                      {liabilityReport.vat.net_vat_payable > 0 && (
                        <div className="mt-3">
                          <Button size="sm" onClick={() => handleOpenSettlement('VAT', liabilityReport.vat.net_vat_payable)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Settle VAT
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* PAYE Section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-500" />
                        PAYE
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-slate-500">Total Withheld</p>
                          <p className="text-lg font-semibold text-purple-700">{liabilityReport.paye.total_withheld.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-slate-500">Total Remitted</p>
                          <p className="text-lg font-semibold text-green-700">{liabilityReport.paye.total_remitted.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs text-slate-500">Outstanding</p>
                          <p className="text-lg font-semibold text-orange-700">{liabilityReport.paye.outstanding.toLocaleString()}</p>
                        </div>
                      </div>
                      {liabilityReport.paye.outstanding > 0 && (
                        <div className="mt-3">
                          <Button size="sm" onClick={() => handleOpenSettlement('PAYE', liabilityReport.paye.outstanding)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Settle PAYE
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* RSSB Section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-teal-500" />
                        RSSB
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="p-3 bg-teal-50 rounded-lg">
                          <p className="text-xs text-slate-500">Total Contributions</p>
                          <p className="text-lg font-semibold text-teal-700">{liabilityReport.rssb.total_contributions.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-slate-500">Total Remitted</p>
                          <p className="text-lg font-semibold text-green-700">{liabilityReport.rssb.total_remitted.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs text-slate-500">Outstanding</p>
                          <p className="text-lg font-semibold text-orange-700">{liabilityReport.rssb.outstanding.toLocaleString()}</p>
                        </div>
                      </div>
                      {liabilityReport.rssb.outstanding > 0 && (
                        <div className="mt-3">
                          <Button size="sm" onClick={() => handleOpenSettlement('RSSB', liabilityReport.rssb.outstanding)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Settle RSSB
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Grand Total */}
                    <div className="border rounded-lg p-4 bg-slate-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Total Tax Liability</p>
                          <p className="text-2xl font-bold">{liabilityReport.totals.total_tax_liability.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Remitted</p>
                          <p className="text-2xl font-bold text-green-600">{liabilityReport.totals.total_remitted.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!liabilityReport && !loadingLiability && (
                  <p className="text-slate-500 text-center py-8">Select a period and click Generate Report to view the tax liability breakdown.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========== TAX RATE FORM DIALOG ========== */}
        <Dialog open={isRateFormOpen} onOpenChange={setIsRateFormOpen}>
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:max-h-[90vh] sm:w-full sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Edit Tax Rate' : 'Create Tax Rate'}</DialogTitle>
              <DialogDescription>
                {editingRate ? 'Update the tax rate configuration' : 'Configure a new tax rate for automatic tax calculation'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitRateForm)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Tax Code *</Label>
                  <Input
                    id="code"
                    {...register('code')}
                    onChange={(e) => setValue('code', e.target.value.toUpperCase())}
                    placeholder="e.g., VAT18"
                    disabled={!!editingRate}
                    className={errors.code ? 'border-red-500' : ''}
                  />
                  {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Tax Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Standard VAT"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Tax Type *</Label>
                  <Select value={watchType} onValueChange={(value: any) => setValue('type', value)}>
                    <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_pct">Rate (%) *</Label>
                  <Input
                    id="rate_pct"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('rate_pct', { valueAsNumber: true })}
                    placeholder="18.00"
                    className={errors.rate_pct ? 'border-red-500' : ''}
                  />
                  {errors.rate_pct && <p className="text-sm text-red-500">{errors.rate_pct.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="input_account">Input Account (VAT Receivable) *</Label>
                  <Select 
                    value={watchInputAccountId} 
                    onValueChange={(v) => handleAccountSelect('input_account_id', v)}
                  >
                    <SelectTrigger className={errors.input_account_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select account from Chart of Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      {chartAccounts.map(account => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.input_account_id && <p className="text-sm text-red-500">{errors.input_account_id.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="output_account">Output Account (VAT Payable) *</Label>
                  <Select 
                    value={watchOutputAccountId} 
                    onValueChange={(v) => handleAccountSelect('output_account_id', v)}
                  >
                    <SelectTrigger className={errors.output_account_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select account from Chart of Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      {chartAccounts.map(account => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.output_account_id && <p className="text-sm text-red-500">{errors.output_account_id.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="effective_from">Effective From *</Label>
                  <Input
                    id="effective_from"
                    type="date"
                    {...register('effective_from')}
                    className={errors.effective_from ? 'border-red-500' : ''}
                  />
                  {errors.effective_from && <p className="text-sm text-red-500">{errors.effective_from.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effective_to">Effective To</Label>
                  <Input id="effective_to" type="date" {...register('effective_to')} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-950"
                />
                <Label htmlFor="is_active" className="font-normal">Active (available for use in transactions)</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRateFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={savingRate || isSubmitting}>
                  {savingRate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingRate ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== SETTLEMENT DIALOG ========== */}
        <Dialog open={isSettlementOpen} onOpenChange={setIsSettlementOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post {settlementForm.tax_code} Settlement</DialogTitle>
              <DialogDescription>
                Record a payment to the {settlementForm.tax_code === 'PAYE' ? 'RRA' : settlementForm.tax_code === 'RSSB' ? 'Social Security' : 'tax authority'}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="settlement_tax_code">Settlement Type</Label>
                <Input id="settlement_tax_code" value={settlementForm.tax_code} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlement_amount">Amount *</Label>
                <Input
                  id="settlement_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlement_date">Settlement Date *</Label>
                <Input
                  id="settlement_date"
                  type="date"
                  value={settlementForm.settlement_date}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, settlement_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={settlementForm.payment_method}
                  onValueChange={(value) => setSettlementForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {settlementForm.payment_method === 'bank' && (
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account</Label>
                  <Select
                    value={settlementForm.bank_account_id}
                    onValueChange={(value) => setSettlementForm(prev => ({ ...prev, bank_account_id: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(account => (
                        <SelectItem key={account._id} value={account._id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {account.name} ({account.accountType})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="period_description">Period Description</Label>
                <Input
                  id="period_description"
                  value={settlementForm.period_description}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, period_description: e.target.value }))}
                  placeholder="e.g., VAT Settlement Jan 2024"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettlementOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitSettlement} disabled={submittingSettlement || settlementForm.amount <= 0}>
                {submittingSettlement ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Post Settlement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
