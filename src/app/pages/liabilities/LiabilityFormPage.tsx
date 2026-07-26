import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loansApi, Liability, journalEntriesApi, ChartOfAccounts, PaymentScheduleResponse, bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import DocumentCurrencySelect from '@/app/components/DocumentCurrencySelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Wallet,
  Building2,
  Percent,
  Calendar,
  Hash,
  FileText,
  Calculator,
  TrendingDown,
  Landmark,
  Shield,
  AlertTriangle,
  Info,
  Banknote
} from 'lucide-react';
import { useFormatCurrency } from '@/lib/currencyUtils';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

export default function LiabilityFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const formatCurrency = useFormatCurrency();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccounts[]>([]);
  const [liabilityAccounts, setLiabilityAccounts] = useState<ChartOfAccounts[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ChartOfAccounts[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [calculatingSchedule, setCalculatingSchedule] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleResponse['schedule'] | null>(null);
  
  const [formData, setFormData] = useState({
    loanNumber: '',
    name: '',
    loanType: 'loan',
    lenderName: '',
    lenderContact: '',
    originalAmount: 0,
    interestRate: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    liabilityAccountId: '',
    interestExpenseAccountId: '',
    bankAccountId: '',
    purpose: '',
    durationMonths: 12,
    interestMethod: 'simple',
    paymentTerms: 'monthly',
    collateral: '',
    // IFRS 7 fields
    isSecured: false,
    securityDescription: '',
    classification: 'bank_loan',
    currencyCode: 'RWF',
    exchangeRate: 1,
    hasCovenants: false,
    covenantDetails: '',
    covenantBreach: false,
    // IFRS 9 fields
    ifrs9Classification: 'amortized_cost',
    impairmentStage: 'stage_1',
    eclProvision: 0,
    probabilityOfDefault: 0,
    lossGivenDefault: 45,
    exposureAtDefault: 0,
    effectiveInterestRate: 0,
    significantIncreaseInCreditRisk: false,
    daysPastDue: 0,
    forbearanceStatus: 'none'
  });

  // Calculate payment schedule when relevant fields change
  const calculateSchedule = useCallback(async () => {
    if (!formData.originalAmount || formData.originalAmount <= 0 || 
        !formData.durationMonths || formData.durationMonths <= 0) {
      setPaymentSchedule(null);
      return;
    }

    setCalculatingSchedule(true);
    try {
      const response: any = await loansApi.calculatePaymentSchedule({
        originalAmount: formData.originalAmount,
        interestRate: formData.interestRate || 0,
        durationMonths: formData.durationMonths,
        interestMethod: formData.interestMethod,
        startDate: formData.startDate,
        loanType: formData.loanType
      });
      
      if (response.success && response.data?.schedule) {
        setPaymentSchedule(response.data.schedule);
      } else {
        setPaymentSchedule(null);
      }
    } catch (error) {
      console.error('[LiabilityFormPage] Failed to calculate schedule:', error);
      setPaymentSchedule(null);
    } finally {
      setCalculatingSchedule(false);
    }
  }, [formData.originalAmount, formData.interestRate, formData.durationMonths, formData.interestMethod, formData.startDate, formData.loanType]);

  useEffect(() => {
    fetchAccounts();
    if (isEditMode && id) {
      fetchLiability();
    }
  }, [id]);

  // Calculate schedule when form data changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (!isEditMode) {
        calculateSchedule();
      }
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [calculateSchedule, isEditMode]);

  const fetchAccounts = async () => {
    try {
      // Fetch accounts and bank accounts in parallel
      const [accountsResponse, bankResponse] = await Promise.all([
        journalEntriesApi.getAccounts({ includeInactive: true }),
        bankAccountsApi.getAll()
      ]);

      if (accountsResponse.success) {
        const allAccounts = accountsResponse.data || [];
        // Filter liability accounts (type = liability)
        const liabilityAccs = allAccounts.filter((acc: ChartOfAccounts) => acc.type === 'liability');
        // Filter expense accounts (type = expense)
        const expenseAccs = allAccounts.filter((acc: ChartOfAccounts) => acc.type === 'expense');
        setAccounts(allAccounts);
        setLiabilityAccounts(liabilityAccs);
        setExpenseAccounts(expenseAccs);
      }

      if (bankResponse.success) {
        setBankAccounts(bankResponse.data || []);
      }
    } catch (error) {
      console.error('[LiabilityFormPage] Failed to fetch accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchLiability = async () => {
    try {
      const response: any = await loansApi.getById(id!);
      if (response.success && response.data) {
        const liability = response.data;
        setFormData({
          loanNumber: liability.loanNumber || '',
          name: liability.name || '',
          loanType: liability.loanType || liability.type || 'loan',
          lenderName: liability.lenderName || '',
          lenderContact: liability.lenderContact || '',
          originalAmount: liability.originalAmount || 0,
          interestRate: liability.interestRate || 0,
          startDate: liability.startDate ? liability.startDate.split('T')[0] : '',
          endDate: liability.endDate ? liability.endDate.split('T')[0] : '',
          liabilityAccountId: (liability as any).liabilityAccountId?._id || (liability as any).liabilityAccountId || '',
          interestExpenseAccountId: (liability as any).interestExpenseAccountId?._id || (liability as any).interestExpenseAccountId || '',
          bankAccountId: (liability as any).bankAccountId?._id || (liability as any).bankAccountId || '',
          purpose: (liability as any).purpose || '',
          durationMonths: (liability as any).durationMonths || 12,
          interestMethod: (liability as any).interestMethod || 'simple',
          paymentTerms: (liability as any).paymentTerms || 'monthly',
          collateral: (liability as any).collateral || '',
          // IFRS 7 fields
          isSecured: (liability as any).isSecured || false,
          securityDescription: (liability as any).securityDescription || '',
          classification: (liability as any).classification || 'bank_loan',
          currencyCode: (liability as any).currencyCode || 'RWF',
          exchangeRate: (liability as any).exchangeRate || 1,
          hasCovenants: (liability as any).hasCovenants || false,
          covenantDetails: (liability as any).covenantDetails || '',
          covenantBreach: (liability as any).covenantBreach || false,
          // IFRS 9 fields
          ifrs9Classification: (liability as any).ifrs9Classification || 'amortized_cost',
          impairmentStage: (liability as any).impairmentStage || 'stage_1',
          eclProvision: (liability as any).eclProvision || 0,
          probabilityOfDefault: (liability as any).probabilityOfDefault || 0,
          lossGivenDefault: (liability as any).lossGivenDefault || 45,
          exposureAtDefault: (liability as any).exposureAtDefault || 0,
          effectiveInterestRate: (liability as any).effectiveInterestRate || 0,
          significantIncreaseInCreditRisk: (liability as any).significantIncreaseInCreditRisk || false,
          daysPastDue: (liability as any).daysPastDue || 0,
          forbearanceStatus: (liability as any).forbearanceStatus || 'none'
        });
      }
    } catch (error) {
      console.error('[LiabilityFormPage] Failed to fetch liability:', error);
      toast.error(t('liabilities.errors.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('liabilities.errors.invalidAmount'));
      return;
    }

    if (formData.originalAmount <= 0) {
      toast.error(t('liabilities.errors.invalidAmount'));
      return;
    }

    if (!formData.liabilityAccountId) {
      toast.error('Please select a liability account');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        loanType: formData.loanType,
        lenderName: formData.lenderName,
        lenderContact: formData.lenderContact || undefined,
        originalAmount: formData.originalAmount,
        outstandingBalance: formData.originalAmount,
        interestRate: formData.interestRate,
        interestMethod: formData.interestMethod,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        liabilityAccountId: formData.liabilityAccountId,
        interestExpenseAccountId: formData.interestExpenseAccountId || undefined,
        bankAccountId: formData.bankAccountId || undefined,
        purpose: formData.purpose,
        durationMonths: formData.durationMonths,
        paymentTerms: formData.paymentTerms,
        collateral: formData.collateral || undefined,
        // IFRS 7 fields
        isSecured: formData.isSecured,
        securityDescription: formData.securityDescription || undefined,
        classification: formData.classification,
        currencyCode: formData.currencyCode,
        exchangeRate: formData.exchangeRate,
        hasCovenants: formData.hasCovenants,
        covenantDetails: formData.covenantDetails || undefined,
        covenantBreach: formData.covenantBreach,
        // IFRS 9 fields
        ifrs9Classification: formData.ifrs9Classification,
        impairmentStage: formData.impairmentStage,
        eclProvision: formData.eclProvision,
        probabilityOfDefault: formData.probabilityOfDefault,
        lossGivenDefault: formData.lossGivenDefault,
        exposureAtDefault: formData.exposureAtDefault,
        effectiveInterestRate: formData.effectiveInterestRate,
        significantIncreaseInCreditRisk: formData.significantIncreaseInCreditRisk,
        daysPastDue: formData.daysPastDue,
        forbearanceStatus: formData.forbearanceStatus,
        status: 'active'
      };

      let response: any;
      if (isEditMode) {
        // When editing, send IFRS 7 and IFRS 9 disclosure fields
        const disclosurePayload = {
          // IFRS 7.33 Classification
          isSecured: formData.isSecured,
          securityDescription: formData.securityDescription || undefined,
          classification: formData.classification,
          // IFRS 7.34 Currency
          currencyCode: formData.currencyCode,
          exchangeRate: formData.exchangeRate,
          // IAS 1.74 Covenant tracking
          hasCovenants: formData.hasCovenants,
          covenantDetails: formData.covenantDetails || undefined,
          covenantBreach: formData.covenantBreach,
          // IFRS 9 fields
          ifrs9Classification: formData.ifrs9Classification,
          impairmentStage: formData.impairmentStage,
          eclProvision: formData.eclProvision,
          probabilityOfDefault: formData.probabilityOfDefault,
          lossGivenDefault: formData.lossGivenDefault,
          exposureAtDefault: formData.exposureAtDefault,
          effectiveInterestRate: formData.effectiveInterestRate,
          significantIncreaseInCreditRisk: formData.significantIncreaseInCreditRisk,
          daysPastDue: formData.daysPastDue,
          forbearanceStatus: formData.forbearanceStatus,
        };
        response = await loansApi.update(id!, disclosurePayload);
      } else {
        response = await loansApi.create(payload);
      }

      if (response.success) {
        toast.success(isEditMode ? 'Liability updated successfully' : 'Liability created successfully');
        navigate('/liabilities');
      } else {
        toast.error(response.error || (isEditMode ? 'Failed to update liability' : 'Failed to create liability'));
      }
    } catch (error: any) {
      console.error('[LiabilityFormPage] Failed to save liability:', error);
      toast.error(error.response?.data?.error || (isEditMode ? 'Failed to update liability' : 'Failed to create liability'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || accountsLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading form...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero Header */}
        <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-5xl 2xl:max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/liabilities')}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {isEditMode ? t('liabilities.editLiability') : t('liabilities.addLiability')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isEditMode ? 'Update liability information' : 'Add a new liability to your accounts'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl 2xl:max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:ring-indigo-900/40">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">{t('liabilities.title')}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Basic liability information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loanNumber" className="dark:text-slate-200">{t('liabilities.reference')}</Label>
                  <Input 
                    id="loanNumber"
                    value={formData.loanNumber}
                    onChange={(e) => handleChange('loanNumber', e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="dark:text-slate-200">{t('liabilities.name')} *</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Bank Loan"
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loanType" className="dark:text-slate-200">{t('liabilities.type')} *</Label>
                  <Select 
                    value={formData.loanType} 
                    onValueChange={(value) => handleChange('loanType', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="loan">{t('liabilities.types.loan')}</SelectItem>
                      <SelectItem value="short-term">Short-term</SelectItem>
                      <SelectItem value="long-term">Long-term</SelectItem>
                      <SelectItem value="hire_purchase">{t('liabilities.types.hire_purchase')}</SelectItem>
                      <SelectItem value="accrual">{t('liabilities.types.accrual')}</SelectItem>
                      <SelectItem value="other">{t('liabilities.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lenderName" className="dark:text-slate-200">{t('liabilities.lender')} *</Label>
                  <Input 
                    id="lenderName"
                    value={formData.lenderName}
                    onChange={(e) => handleChange('lenderName', e.target.value)}
                    placeholder="Bank Name"
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lenderContact" className="dark:text-slate-200">{t('liabilities.lenderContact')}</Label>
                  <Input 
                    id="lenderContact"
                    value={formData.lenderContact}
                    onChange={(e) => handleChange('lenderContact', e.target.value)}
                    placeholder="Contact person or phone"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-900/40">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">Financial Details</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Loan amount and interest information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="liabilityAccountId" className="dark:text-slate-200">Liability Account *</Label>
                  <Select 
                    value={formData.liabilityAccountId} 
                    onValueChange={(value) => handleChange('liabilityAccountId', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Select liability account" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {liabilityAccounts.map((account) => (
                        <SelectItem key={account._id || account.code} value={account._id || account.code}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountId" className="dark:text-slate-200">Deposit to Bank Account</Label>
                  <Select 
                    value={formData.bankAccountId} 
                    onValueChange={(value) => handleChange('bankAccountId', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {bankAccounts.map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.name}
                          {account.cachedBalance !== undefined
                            ? ` (Balance: ${Number(account.cachedBalance).toLocaleString()})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalAmount" className="dark:text-slate-200">{t('liabilities.principal')} *</Label>
                  <Input 
                    id="originalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.originalAmount}
                    onChange={(e) => handleChange('originalAmount', parseFloat(e.target.value) || 0)}
                    placeholder="10000"
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestRate" className="dark:text-slate-200">{t('liabilities.interestRate')} (%)</Label>
                  <Input 
                    id="interestRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
                    placeholder="5.5"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestExpenseAccountId" className="dark:text-slate-200">Interest Expense Account</Label>
                  <Select 
                    value={formData.interestExpenseAccountId} 
                    onValueChange={(value) => handleChange('interestExpenseAccountId', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Select expense account" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {expenseAccounts.map((account) => (
                        <SelectItem key={account._id || account.code} value={account._id || ''}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMonths" className="dark:text-slate-200">Duration (months)</Label>
                  <Input 
                    id="durationMonths"
                    type="number"
                    min="1"
                    value={formData.durationMonths}
                    onChange={(e) => handleChange('durationMonths', parseInt(e.target.value) || 12)}
                    placeholder="12"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-900/40">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">Dates</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Start and end dates for the liability</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="dark:text-slate-200">Start Date *</Label>
                  <Input 
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="dark:text-slate-200">End Date</Label>
                  <Input 
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms" className="dark:text-slate-200">{t('liabilities.paymentTerms')}</Label>
                  <Select 
                    value={formData.paymentTerms} 
                    onValueChange={(value) => handleChange('paymentTerms', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="monthly">{t('liabilities.paymentTermOptions.monthly')}</SelectItem>
                      <SelectItem value="quarterly">{t('liabilities.paymentTermOptions.quarterly')}</SelectItem>
                      <SelectItem value="annually">{t('liabilities.paymentTermOptions.annually')}</SelectItem>
                      <SelectItem value="bullet">{t('liabilities.paymentTermOptions.bullet')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collateral" className="dark:text-slate-200">{t('liabilities.collateral')}</Label>
                  <Input 
                    id="collateral"
                    value={formData.collateral}
                    onChange={(e) => handleChange('collateral', e.target.value)}
                    placeholder="Collateral description"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="purpose" className="dark:text-slate-200">Purpose</Label>
                  <Input 
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => handleChange('purpose', e.target.value)}
                    placeholder="Purpose of the loan"
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* IFRS 7 Disclosure Section */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-sky-50 p-1.5 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:ring-sky-900/40">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">IFRS 7 Disclosure</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Financial instrument classification and covenant tracking</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {/* Loan Classification */}
                <div className="space-y-2">
                  <Label htmlFor="classification" className="dark:text-slate-200">Loan Classification (IFRS 7.33)</Label>
                  <Select
                    value={formData.classification}
                    onValueChange={(value) => handleChange('classification', value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="bank_loan">Bank Loan</SelectItem>
                      <SelectItem value="bond">Bond</SelectItem>
                      <SelectItem value="finance_lease">Finance Lease (IFRS 16)</SelectItem>
                      <SelectItem value="related_party">Related Party (IAS 24)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label htmlFor="currencyCode" className="dark:text-slate-200">Currency (IFRS 7.34)</Label>
                  <DocumentCurrencySelect
                    value={formData.currencyCode}
                    date={formData.startDate}
                    onChange={(currency, rateToBase) => {
                      handleChange('currencyCode', currency);
                      handleChange('exchangeRate', rateToBase ?? 1);
                    }}
                  />
                </div>

                {/* Secured Toggle */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isSecured"
                      checked={formData.isSecured}
                      onCheckedChange={(checked) => handleChange('isSecured', checked === true)}
                    />
                    <Label htmlFor="isSecured" className="dark:text-slate-200 cursor-pointer">
                      This loan is secured (IFRS 7.33)
                    </Label>
                  </div>
                </div>

                {/* Security Description (only if secured) */}
                {formData.isSecured && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="securityDescription" className="dark:text-slate-200">Security/Collateral Description</Label>
                    <Input
                      id="securityDescription"
                      value={formData.securityDescription}
                      onChange={(e) => handleChange('securityDescription', e.target.value)}
                      placeholder="e.g., Property mortgage, equipment pledge, etc."
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                )}

                {/* Covenant Tracking */}
                <div className="space-y-2 md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasCovenants"
                      checked={formData.hasCovenants}
                      onCheckedChange={(checked) => handleChange('hasCovenants', checked === true)}
                    />
                    <Label htmlFor="hasCovenants" className="dark:text-slate-200 cursor-pointer">
                      This loan has financial covenants (IAS 1.74)
                    </Label>
                  </div>
                </div>

                {/* Covenant Details (only if has covenants) */}
                {formData.hasCovenants && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="covenantDetails" className="dark:text-slate-200">Covenant Details</Label>
                      <Input
                        id="covenantDetails"
                        value={formData.covenantDetails}
                        onChange={(e) => handleChange('covenantDetails', e.target.value)}
                        placeholder="e.g., Debt/EBITDA < 3.0, Current Ratio > 1.5"
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="covenantBreach"
                        checked={formData.covenantBreach}
                        onCheckedChange={(checked) => handleChange('covenantBreach', checked === true)}
                      />
                      <Label htmlFor="covenantBreach" className="text-red-600 dark:text-red-400 cursor-pointer font-medium">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Covenant breach detected - Reclassify to Current (IAS 1.74)
                      </Label>
                    </div>
                  </>
                )}

                {/* IFRS 7 Guidance */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-slate-400" />
                    <p>
                      <strong>IFRS 7</strong> requires disclosure of financial instrument classification (IFRS 7.33) 
                      and currency risk (IFRS 7.34). Covenant tracking ensures compliance with IAS 1.74 
                      presentation requirements for borrowings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IFRS 9 - Financial Instruments Section */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-900/40">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">IFRS 9 - Financial Instruments</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Impairment (ECL model) and classification</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ifrs9Classification" className="dark:text-slate-200">Classification</Label>
                    <Select
                      value={formData.ifrs9Classification}
                      onValueChange={(value) => handleChange('ifrs9Classification', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="amortized_cost">Amortized Cost</SelectItem>
                        <SelectItem value="fvoci">FVOCI (Fair Value OCI)</SelectItem>
                        <SelectItem value="fvtpl">FVTPL (Fair Value P&L)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">IFRS 9 business model classification</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="impairmentStage" className="dark:text-slate-200">Impairment Stage (ECL)</Label>
                    <Select
                      value={formData.impairmentStage}
                      onValueChange={(value) => handleChange('impairmentStage', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="stage_1">Stage 1 - 12-month ECL</SelectItem>
                        <SelectItem value="stage_2">Stage 2 - Lifetime ECL</SelectItem>
                        <SelectItem value="stage_3">Stage 3 - Credit-impaired</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Expected Credit Loss stage</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eclProvision" className="dark:text-slate-200">ECL Provision</Label>
                    <Input
                      id="eclProvision"
                      type="number"
                      value={formData.eclProvision}
                      onChange={(e) => handleChange('eclProvision', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Expected Credit Loss provision amount</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="daysPastDue" className="dark:text-slate-200">Days Past Due (DPD)</Label>
                    <Input
                      id="daysPastDue"
                      type="number"
                      value={formData.daysPastDue}
                      onChange={(e) => handleChange('daysPastDue', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Days since last payment</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="probabilityOfDefault" className="dark:text-slate-200">Probability of Default (PD %)</Label>
                    <Input
                      id="probabilityOfDefault"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.probabilityOfDefault}
                      onChange={(e) => handleChange('probabilityOfDefault', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Likelihood of default (0-100%)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lossGivenDefault" className="dark:text-slate-200">Loss Given Default (LGD %)</Label>
                    <Input
                      id="lossGivenDefault"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.lossGivenDefault}
                      onChange={(e) => handleChange('lossGivenDefault', parseFloat(e.target.value) || 0)}
                      placeholder="45"
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Expected loss if default occurs (default: 45%)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="effectiveInterestRate" className="dark:text-slate-200">Effective Interest Rate (EIR %)</Label>
                    <Input
                      id="effectiveInterestRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.effectiveInterestRate}
                      onChange={(e) => handleChange('effectiveInterestRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Actual yield for amortized cost calculation</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forbearanceStatus" className="dark:text-slate-200">Forbearance Status</Label>
                    <Select
                      value={formData.forbearanceStatus}
                      onValueChange={(value) => handleChange('forbearanceStatus', value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                        <SelectItem value="permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Restructuring/forbearance status</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Checkbox
                    id="significantIncreaseInCreditRisk"
                    checked={formData.significantIncreaseInCreditRisk}
                    onCheckedChange={(checked) => handleChange('significantIncreaseInCreditRisk', checked === true)}
                  />
                  <Label htmlFor="significantIncreaseInCreditRisk" className="dark:text-slate-200 cursor-pointer text-amber-500">
                    Significant Increase in Credit Risk (SICR) - Stage 2 indicator
                  </Label>
                </div>

                {/* IFRS 9 Guidance */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-slate-400" />
                    <p>
                      <strong>IFRS 9</strong> requires classification (Amortized Cost/FVOCI/FVTPL) and impairment 
                      using the Expected Credit Loss (ECL) model. ECL = PD × LGD × EAD. 
                      Stage 1 (12-month ECL), Stage 2 (Lifetime ECL), Stage 3 (Credit-impaired).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Schedule Preview */}
            {!isEditMode && paymentSchedule && (
              <Card className="overflow-hidden border-indigo-200 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-950">
                <CardHeader className="border-b border-indigo-100 bg-indigo-50/40 px-5 py-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:ring-indigo-800/50">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-slate-900 dark:text-white">Payment Schedule Preview</CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Based on your loan parameters (updated automatically)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {/* Metric Cards */}
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <Banknote className="h-3.5 w-3.5" />
                        Monthly Payment
                      </div>
                      <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(paymentSchedule.monthlyPayment)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <Wallet className="h-3.5 w-3.5" />
                        Total Payment
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(paymentSchedule.totalPayment)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <TrendingDown className="h-3.5 w-3.5" />
                        Total Interest
                      </div>
                        <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(paymentSchedule.totalInterest)}
                      </div>
                    </div>
                  </div>

                  {/* Interest Method */}
                  <div className="space-y-2">
                    <Label htmlFor="interestMethod" className="text-sm font-medium text-slate-700 dark:text-slate-200">Interest Calculation Method</Label>
                    <Select
                      value={formData.interestMethod}
                      onValueChange={(value) => handleChange('interestMethod', value)}
                    >
                      <SelectTrigger className="w-full md:w-[300px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="simple">Simple Interest</SelectItem>
                        <SelectItem value="compound">Compound (Amortized)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formData.interestMethod === 'simple'
                        ? 'Interest calculated on original principal. Best for short-term loans.'
                        : 'Interest calculated on remaining balance. Standard for mortgages and long-term loans.'}
                    </p>
                  </div>

                  {/* Payment Schedule Table (first 6 months) */}
                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">#</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Principal</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Interest</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentSchedule.schedule.slice(0, 6).map((payment) => (
                          <TableRow key={payment.paymentNumber} className="border-slate-100 dark:border-slate-800">
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{payment.paymentNumber}</TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{payment.paymentDate}</TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payment.principalPortion)}</TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payment.interestPortion)}</TableCell>
                            <TableCell className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(payment.totalPayment)}</TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payment.remainingBalance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {paymentSchedule.schedule.length > 6 && (
                      <p className="border-t border-slate-100 bg-slate-50/30 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                        ...and {paymentSchedule.schedule.length - 6} more payments
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading state for schedule calculation */}
            {!isEditMode && calculatingSchedule && formData.originalAmount > 0 && (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="py-8 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>Calculating payment schedule...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/liabilities')} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </Layout>
  );
}
