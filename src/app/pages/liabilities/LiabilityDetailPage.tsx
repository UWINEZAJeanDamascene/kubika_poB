import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loansApi, Liability, LiabilityTransaction, bankAccountsApi } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  ArrowLeft,
  RefreshCcw,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
  CalendarDays,
  Zap,
  ChevronDown,
  Shield,
  Landmark,
  CreditCard,
  Wallet,
  Activity,
  Clock,
  CheckCircle2,
  XOctagon,
  FileText,
  Banknote,
  Percent,
  PackageOpen,
  BarChart3,
  Briefcase,
  Timer,
  Gauge
} from 'lucide-react';
import { useFormatCurrency } from '@/lib/currencyUtils';
import { toast } from 'sonner';

export default function LiabilityDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const [liability, setLiability] = useState<Liability | null>(null);
  const [transactions, setTransactions] = useState<LiabilityTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [drawdownOpen, setDrawdownOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Form states
  const [repaymentForm, setRepaymentForm] = useState({
    amount: 0,
    principalPortion: 0,
    interestPortion: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    bankAccountId: ''
  });

  const [interestForm, setInterestForm] = useState({
    amount: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  // Compute accrued interest since last interest charge or repayment
  const accruedInterest = useMemo(() => {
    if (!liability) return 0;
    const rate = liability.interestRate || 0;
    const balance = liability.outstandingBalance || 0;
    if (rate <= 0 || balance <= 0) return 0;

    const today = new Date();
    // Find last transaction that affects interest accrual (interest_charge or repayment)
    const relevantTx = transactions
      .filter(tx => tx.type === 'interest_charge' || tx.type === 'repayment')
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    const lastDate = relevantTx.length > 0
      ? new Date(relevantTx[0].transactionDate)
      : (liability.startDate ? new Date(liability.startDate) : today);

    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
    // Simple interest: P * R * (days/365)
    const interest = balance * (rate / 100) * (daysElapsed / 365);
    return Math.round(interest * 100) / 100;
  }, [liability, transactions]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response: any = await bankAccountsApi.getAll({});
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch bank accounts:', error);
    }
  }, []);

  const fetchLiability = useCallback(async () => {
    if (!id) return;
    try {
      const response: any = await loansApi.getById(id);
      if (response.success && response.data) {
        setLiability(response.data);
      } else {
        toast.error(t('liabilities.errors.notFound'));
        navigate('/liabilities');
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch liability:', error);
      toast.error(t('liabilities.errors.fetchFailed'));
      navigate('/liabilities');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  const fetchTransactions = useCallback(async () => {
    if (!id) return;
    try {
      const response: any = await loansApi.getTransactions(id);
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch transactions:', error);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchLiability();
    fetchTransactions();
    fetchBankAccounts();
  }, [fetchLiability, fetchTransactions, fetchBankAccounts, id]);

  // Handle query params to open dialogs directly
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'repayment' && !loading && liability) {
      setRepaymentOpen(true);
    } else if (action === 'interest' && !loading && liability) {
      setInterestOpen(true);
    }
  }, [searchParams, loading, liability]);

  const handleRepayment = async () => {
    if (!repaymentForm.principalPortion || repaymentForm.principalPortion <= 0) {
      toast.error('Please enter a valid principal amount');
      return;
    }
    
    if (!repaymentForm.bankAccountId) {
      toast.error('Please select a bank account');
      return;
    }
    
    setSubmitting(true);
    try {
      const response: any = await loansApi.recordRepayment(id!, {
        principalPortion: repaymentForm.principalPortion,
        interestPortion: repaymentForm.interestPortion || 0,
        bankAccountId: repaymentForm.bankAccountId,
        transactionDate: repaymentForm.transactionDate,
        notes: repaymentForm.notes,
        reference: repaymentForm.reference || undefined,
      });
      
      if (response.success) {
        toast.success(t('liabilities.success.repayment'));
        setRepaymentOpen(false);
        fetchLiability();
        fetchTransactions();
        setRepaymentForm({
          amount: 0,
          principalPortion: 0,
          interestPortion: 0,
          transactionDate: new Date().toISOString().split('T')[0],
          reference: '',
          notes: '',
          bankAccountId: ''
        });
      } else {
        toast.error(response.error || t('liabilities.errors.repaymentFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Repayment error:', error);
      toast.error(error.response?.data?.error || t('liabilities.errors.repaymentFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterest = async () => {
    if (!interestForm.amount || interestForm.amount <= 0) {
      toast.error(t('liabilities.errors.invalidAmount'));
      return;
    }
    
    setSubmitting(true);
    try {
      const response: any = await loansApi.recordInterest(id!, {
        amount: interestForm.amount,
        chargeDate: interestForm.transactionDate,
        notes: interestForm.notes,
        reference: interestForm.reference || undefined,
      });
      
      if (response.success) {
        toast.success(t('liabilities.success.interest'));
        setInterestOpen(false);
        fetchLiability();
        fetchTransactions();
        setInterestForm({
          amount: 0,
          transactionDate: new Date().toISOString().split('T')[0],
          reference: '',
          notes: ''
        });
      } else {
        toast.error(response.error || t('liabilities.errors.interestFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Interest error:', error);
      toast.error(error.response?.data?.error || t('liabilities.errors.interestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Drawdown form state
  const [drawdownForm, setDrawdownForm] = useState({
    amount: 0,
    bankAccountId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
    reference: '',
  });

  const handleDrawdown = async () => {
    if (!drawdownForm.amount || drawdownForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!drawdownForm.bankAccountId) {
      toast.error('Please select a bank account');
      return;
    }
    
    setSubmitting(true);
    try {
      const response: any = await loansApi.recordDrawdown(id!, {
        amount: drawdownForm.amount,
        bankAccountId: drawdownForm.bankAccountId,
        transactionDate: drawdownForm.transactionDate,
        notes: drawdownForm.notes,
        reference: drawdownForm.reference || undefined,
      });
      
      if (response.success) {
        toast.success('Drawdown recorded successfully');
        setDrawdownOpen(false);
        fetchLiability();
        fetchTransactions();
        setDrawdownForm({
          amount: 0,
          bankAccountId: '',
          transactionDate: new Date().toISOString().split('T')[0],
          notes: '',
          reference: '',
        });
      } else {
        toast.error(response.error || 'Failed to record drawdown');
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Drawdown error:', error);
      toast.error(error.response?.data?.error || 'Failed to record drawdown');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch payment schedule
  const handleViewSchedule = async () => {
    try {
      const response: any = await loansApi.getPaymentSchedule(id!);
      if (response.success && response.data) {
        setPaymentSchedule(response.data);
        setScheduleOpen(true);
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch schedule:', error);
      toast.error('Failed to load payment schedule');
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const response: any = await loansApi.delete(id!);
      if (response.success) {
        toast.success(t('liabilities.success.deleted'));
        navigate('/liabilities');
      } else {
        toast.error(response.error || t('liabilities.errors.deleteFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Delete error:', error);
      toast.error(error.response?.data?.message || t('liabilities.errors.deleteFailed'));
    } finally {
      setSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const response: any = await loansApi.cancel(id!);
      if (response.success) {
        toast.success(t('liabilities.success.cancelled'));
        setCancelDialogOpen(false);
        fetchLiability();
      } else {
        toast.error(response.error || t('liabilities.errors.cancelFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Cancel error:', error);
      toast.error(error.response?.data?.error || t('liabilities.errors.cancelFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Auto-Record Functions
  const handleQuickRepayment = async () => {
    if (!liability) return;

    // Check for valid bank account
    const loanBankAccountId = (liability as any).bankAccountId;
    const defaultBankAccount = bankAccounts.length > 0 ? bankAccounts[0]._id : null;
    const bankAccountId = loanBankAccountId || defaultBankAccount;

    if (!bankAccountId) {
      toast.error('No bank account available. Please configure a bank account first.');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate payment schedule to get monthly amounts
      const scheduleResponse: any = await loansApi.calculatePaymentSchedule({
        originalAmount: liability.originalAmount,
        interestRate: liability.interestRate || 0,
        durationMonths: (liability as any).durationMonths || 12,
        interestMethod: (liability as any).interestMethod || 'simple',
        startDate: liability.startDate,
        loanType: liability.loanType
      });

      let principalPortion = 0;
      let interestPortion = 0;

      if (scheduleResponse.success && scheduleResponse.data?.schedule) {
        const schedule = scheduleResponse.data.schedule;
        interestPortion = schedule.monthlyInterest || 0;
        principalPortion = schedule.monthlyPrincipal || 0;

        // If simple method with 0 monthly principal, calculate principal
        if (principalPortion === 0 && schedule.totalPayment > 0) {
          principalPortion = schedule.totalPayment - interestPortion;
        }
      }

      // Calculate total accrued interest from loan start date to today
      const startDate = liability.startDate ? new Date(liability.startDate) : new Date();
      const today = new Date();
      const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const yearsElapsed = daysElapsed / 365.25;

      // Calculate total accrued interest for the entire period
      if (interestPortion === 0 && liability.interestRate > 0) {
        // Simple interest: P * R * T
        interestPortion = liability.originalAmount * (liability.interestRate / 100) * yearsElapsed;
      }

      // Calculate remaining months until maturity
      const endDate = liability.endDate ? new Date(liability.endDate) : new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

      // Determine loan type and calculate appropriate principal
      const loanType = liability.loanType || 'bullet';
      const interestMethod = (liability as any).interestMethod || 'simple';

      if (principalPortion === 0) {
        if (loanType === 'amortizing' || interestMethod === 'compound') {
          // Amortizing: spread principal over remaining months
          principalPortion = liability.outstandingBalance / monthsRemaining;
        } else if (loanType === 'bullet' && daysRemaining <= 0) {
          // Bullet loan at/past maturity: pay full principal
          principalPortion = liability.outstandingBalance;
        } else {
          // Bullet loan before maturity: interest-only payment (principal = 0)
          principalPortion = 0;
        }
      }

      // Calculate total and cap at outstanding balance
      // The total repayment (principal + interest) should never exceed outstanding balance + interest
      // For a normal payment: principal + interest = payment amount
      // But principal portion alone cannot exceed outstanding balance
      principalPortion = Math.min(principalPortion, liability.outstandingBalance);

      // If this is a bullet loan at maturity, cap total at outstanding
      if (loanType === 'bullet' && daysRemaining <= 0) {
        // At maturity for bullet: principal should equal outstanding, interest is separate
        // But some backends expect: principalPortion + interestPortion <= outstandingBalance
        // So we need to adjust
        if (principalPortion + interestPortion > liability.outstandingBalance) {
          // Adjust: interest is paid first, then principal from remainder
          const availableForPrincipal = Math.max(0, liability.outstandingBalance - interestPortion);
          principalPortion = Math.min(principalPortion, availableForPrincipal);
        }
      }

      // Final validation
      if (principalPortion < 0) principalPortion = 0;
      if (interestPortion < 0) interestPortion = 0;

      if (principalPortion === 0 && interestPortion === 0) {
        toast.error('No payment to record - outstanding balance may be zero');
        setSubmitting(false);
        return;
      }

      // Ensure principal never exceeds outstanding balance (safety check for API validation)
      principalPortion = Math.min(principalPortion, liability.outstandingBalance);
      // Also ensure total doesn't exceed outstanding + interest (some backends validate this)
      const maxTotal = liability.outstandingBalance + interestPortion;
      if (principalPortion + interestPortion > maxTotal) {
        principalPortion = Math.max(0, maxTotal - interestPortion);
      }

      const transactionDate = new Date().toISOString().split('T')[0];

      // Round to 2 decimal places for API
      const finalPrincipal = Math.floor(principalPortion * 100) / 100;
      const finalInterest = Math.floor(interestPortion * 100) / 100;

      // Final safety check
      if (finalPrincipal > liability.outstandingBalance) {
        toast.error('Calculated principal exceeds outstanding balance. Please use Manual entry.');
        setSubmitting(false);
        return;
      }

      const response: any = await loansApi.recordRepayment(id!, {
        principalPortion: finalPrincipal,
        interestPortion: finalInterest,
        bankAccountId: bankAccountId,
        transactionDate: transactionDate,
        notes: `Auto-recorded repayment. Principal: ${formatCurrency(finalPrincipal)}, Interest: ${formatCurrency(finalInterest)}. Ref: AUTO-RP-${Date.now().toString().slice(-4)}`
      });

      if (response.success) {
        toast.success(`Quick repayment recorded: ${formatCurrency(principalPortion + interestPortion)}`);
        fetchLiability();
        fetchTransactions();
      } else {
        toast.error(response.error || 'Failed to record quick repayment');
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Quick repayment error:', error);
      toast.error(error.response?.data?.error || 'Failed to record quick repayment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickInterest = async () => {
    if (!liability) return;

    setSubmitting(true);
    try {
      // Calculate monthly interest
      const rate = liability.interestRate || 0;
      const balance = liability.outstandingBalance || 0;
      const monthlyInterest = (balance * (rate / 100)) / 12;

      if (monthlyInterest <= 0) {
        toast.error('No interest to charge (0% rate or no balance)');
        setSubmitting(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const response: any = await loansApi.recordInterest(id!, {
        amount: Math.round(monthlyInterest * 100) / 100,
        chargeDate: today,
        notes: `Auto-recorded monthly interest at ${rate}% annual rate. Ref: AUTO-INT-${Date.now().toString().slice(-4)}`
      });

      if (response.success) {
        toast.success(`Quick interest recorded: ${formatCurrency(monthlyInterest)}`);
        fetchLiability();
        fetchTransactions();
      } else {
        toast.error(response.error || 'Failed to record quick interest');
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Quick interest error:', error);
      toast.error(error.response?.data?.error || 'Failed to record quick interest');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = useFormatCurrency();

  const formatDate = (date: string | undefined | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; className: string; label: string }> = {
      active: { icon: Activity, className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60', label: t('liabilities.status.active') },
      fully_repaid: { icon: CheckCircle2, className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60', label: t('liabilities.status.fullyRepaid') },
      'paid-off': { icon: CheckCircle2, className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60', label: t('liabilities.status.fullyRepaid') },
      closed: { icon: Shield, className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700/50', label: t('liabilities.status.closed') },
      cancelled: { icon: XCircle, className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:ring-gray-700/50', label: t('liabilities.status.cancelled') },
      defaulted: { icon: AlertCircle, className: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60', label: t('liabilities.status.defaulted') },
      default: { icon: AlertCircle, className: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60', label: t('liabilities.status.defaulted') },
    };
    const cfg = config[status] || config.default;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 font-medium border-0 ${cfg.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </Badge>
    );
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { icon: any; className: string; label: string }> = {
      drawdown: { icon: TrendingUp, className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60', label: t('liabilities.transactionTypes.drawdown') },
      repayment: { icon: RefreshCcw, className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60', label: t('liabilities.transactionTypes.repayment') },
      interest_charge: { icon: TrendingDown, className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60', label: t('liabilities.transactionTypes.interest_charge') },
      interest: { icon: TrendingDown, className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60', label: t('liabilities.transactionTypes.interest_charge') },
      default: { icon: AlertCircle, className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700/50', label: type },
    };
    const cfg = config[type] || config.default;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 font-medium border-0 ${cfg.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </Badge>
    );
  };

  const repaymentProgress = liability && liability.originalAmount > 0
    ? Math.max(0, Math.min(100, ((liability.originalAmount - liability.outstandingBalance) / liability.originalAmount) * 100))
    : 0;

  const getProgressColor = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 25) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading liability details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!liability) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-12 w-12 text-slate-400 dark:text-slate-500" />
            <p className="text-slate-500 dark:text-slate-400">Liability not found</p>
            <Button variant="outline" onClick={() => navigate('/liabilities')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
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
          <div className="mx-auto max-w-7xl 2xl:max-w-[2200px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/liabilities')}
                  className="mt-1 h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {liability.name}
                    </h1>
                    {getStatusBadge(liability.status)}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{liability.loanNumber}</span>
                    <span className="hidden sm:inline">|</span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Landmark className="h-3.5 w-3.5" />
                      {liability.lenderName || 'No lender'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/liabilities/${id}/edit`)}
                  className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                {liability.status !== 'cancelled' && liability.status !== 'fully_repaid' && liability.status !== 'paid-off' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Cancel
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
                {(() => {
                  const liabAccount = (liability as any).liabilityAccountId;
                  const liabIsValid = (liabAccount && typeof liabAccount === 'object' && liabAccount.name) || (typeof liabAccount === 'string' && liabAccount.length > 0);
                  const intAccount = (liability as any).interestExpenseAccountId;
                  const intIsValid = (intAccount && typeof intAccount === 'object' && intAccount.name) || (typeof intAccount === 'string' && intAccount.length > 0);
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                          Quick Actions
                          <ChevronDown className="ml-1.5 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                        <DropdownMenuItem onClick={handleQuickRepayment} disabled={!liabIsValid || submitting}>
                          <Zap className="mr-2 h-4 w-4" />
                          Quick Repay
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRepaymentOpen(true)} disabled={submitting}>
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Manual Repayment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleQuickInterest} disabled={!intIsValid || submitting}>
                          <Zap className="mr-2 h-4 w-4 text-amber-500" />
                          Quick Interest
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setInterestForm({
                            amount: accruedInterest,
                            transactionDate: new Date().toISOString().split('T')[0],
                            reference: '',
                            notes: `Accrued interest since last charge/payment`
                          });
                          setInterestOpen(true);
                        }} disabled={submitting}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Manual Interest
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl 2xl:max-w-[2200px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Progress Card */}
          <Card className="mb-6 overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <Activity className="h-3.5 w-3.5" />
                    Repayment Progress
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{repaymentProgress.toFixed(1)}%</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {formatCurrency((liability.originalAmount || 0) - (liability.outstandingBalance || 0))} of {formatCurrency(liability.originalAmount)} repaid
                    </span>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getProgressColor(repaymentProgress)}`}
                      style={{ width: `${repaymentProgress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Start</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(liability.startDate)}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Maturity</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(liability.endDate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Principal</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(liability.originalAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-900/40">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Outstanding</p>
                    <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(liability.outstandingBalance)}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-900/40">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Interest Rate</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{liability.interestRate || 0}%</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-900/40">
                    <Percent className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Accrued Interest</p>
                    <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(accruedInterest)}</p>
                    {accruedInterest > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Since last charge/payment</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-900/40">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Monthly Payment</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(liability.monthlyPayment || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:ring-indigo-900/40">
                    <Banknote className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:ring-indigo-900/40">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Liability Account</p>
                </div>
                {(liability as any).liabilityAccountId ? (
                  <div>
                    {(liability as any).liabilityAccountId.name ? (
                      <>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{(liability as any).liabilityAccountId.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{(liability as any).liabilityAccountId.code}</div>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">{(liability as any).liabilityAccountId}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4" />
                    Not configured — edit to add account
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-900/40">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Interest Expense Account</p>
                </div>
                {(liability as any).interestExpenseAccountId ? (
                  <div>
                    {(liability as any).interestExpenseAccountId.name ? (
                      <>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{(liability as any).interestExpenseAccountId.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{(liability as any).interestExpenseAccountId.code}</div>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">{(liability as any).interestExpenseAccountId}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    Not configured — required for interest recording
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* IFRS 9 - Financial Instruments */}
          <Card className="mb-6 overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-sky-50 p-2 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:ring-sky-900/40">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">IFRS 9</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Financial Instruments</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Classification</p>
                  <Badge variant="outline" className="mt-1 border-slate-200 dark:border-slate-700">
                    {liability.ifrs9Classification === 'amortized_cost' ? 'Amortized Cost' :
                     liability.ifrs9Classification === 'fvoci' ? 'FVOCI' :
                     liability.ifrs9Classification === 'fvtpl' ? 'FVTPL' : 'Amortized Cost'}
                  </Badge>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Impairment Stage</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      liability.impairmentStage === 'stage_1' ? 'bg-emerald-500' :
                      liability.impairmentStage === 'stage_2' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    <span className={`text-sm font-semibold ${
                      liability.impairmentStage === 'stage_1' ? 'text-emerald-600 dark:text-emerald-400' :
                      liability.impairmentStage === 'stage_2' ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {liability.impairmentStage === 'stage_1' ? 'Stage 1 (12m ECL)' :
                       liability.impairmentStage === 'stage_2' ? 'Stage 2 (Lifetime ECL)' :
                       liability.impairmentStage === 'stage_3' ? 'Stage 3 (Credit-impaired)' : 'Stage 1'}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">ECL Provision</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-200">
                    {formatCurrency(liability.eclProvision || 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Days Past Due</p>
                  <p className={`mt-1 text-sm font-semibold ${
                    (liability.daysPastDue || 0) > 30 ? 'text-rose-600 dark:text-rose-400' :
                    (liability.daysPastDue || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {liability.daysPastDue || 0} DPD
                  </p>
                </div>
              </div>
              {(liability.probabilityOfDefault || liability.lossGivenDefault || liability.effectiveInterestRate) && (
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Probability of Default (PD)</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {(liability.probabilityOfDefault || 0).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Loss Given Default (LGD)</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {(liability.lossGivenDefault || 45).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Effective Interest Rate</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {(liability.effectiveInterestRate || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
              {liability.forbearanceStatus && liability.forbearanceStatus !== 'none' && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Forbearance: {liability.forbearanceStatus === 'temporary' ? 'Temporary' : 'Permanent'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction History - Split into two tables */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Repayment History Table */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-900/40">
                    <RefreshCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">{t('liabilities.repaymentHistory')}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{t('liabilities.repaymentHistoryDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.filter(tx => tx.type === 'repayment').length === 0 ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                      <RefreshCcw className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('liabilities.noRepayments')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.transactionDate')}</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.reference')}</TableHead>
                          <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.principalPortion')}</TableHead>
                          <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.interestPortion')}</TableHead>
                          <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.total')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions
                          .filter(tx => tx.type === 'repayment')
                          .map((tx) => (
                            <TableRow key={tx._id} className="border-slate-100 dark:border-slate-800">
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                              <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{tx.reference || (tx as any).journalEntryNumber || '-'}</TableCell>
                              <TableCell className="text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(tx.principalPortion || 0)}</TableCell>
                              <TableCell className="text-right text-sm text-slate-700 dark:text-slate-300">{formatCurrency(tx.interestPortion || 0)}</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(tx.amount)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interest Charges Table */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-900/40">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">{t('liabilities.interestCharges')}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{t('liabilities.interestChargesDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.filter(tx => tx.type === 'interest_charge' || tx.type === 'interest').length === 0 ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                      <TrendingDown className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('liabilities.noInterestCharges')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.transactionDate')}</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.reference')}</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.notes')}</TableHead>
                          <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions
                          .filter(tx => tx.type === 'interest_charge' || tx.type === 'interest')
                          .map((tx) => (
                            <TableRow key={tx._id} className="border-slate-100 dark:border-slate-800">
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                              <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{tx.reference || (tx as any).journalEntryNumber || '-'}</TableCell>
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">{tx.notes || '-'}</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(tx.amount)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Drawdown History Table (Full Width) */}
          {transactions.filter(tx => tx.type === 'drawdown').length > 0 && (
            <Card className="mt-6 overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-900/40">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">{t('liabilities.drawdownHistory')}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{t('liabilities.drawdownHistoryDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.transactionDate')}</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.reference')}</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.notes')}</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">{t('liabilities.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter(tx => tx.type === 'drawdown')
                        .map((tx) => (
                          <TableRow key={tx._id} className="border-slate-100 dark:border-slate-800">
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                            <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{tx.reference || (tx as any).journalEntryNumber || '-'}</TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{tx.notes || '-'}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(tx.amount)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Repayment Dialog */}
        <Dialog open={repaymentOpen} onOpenChange={setRepaymentOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('liabilities.dialogs.repayment.title')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.repayment.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.totalAmount')} *</Label>
                <Input 
                  type="number" 
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({...repaymentForm, amount: parseFloat(e.target.value) || 0})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Bank Account *</Label>
                <Select 
                  value={repaymentForm.bankAccountId}
                  onValueChange={(value) => setRepaymentForm({...repaymentForm, bankAccountId: value})}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.accountName} - {account.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('liabilities.principalPortion')}</Label>
                  <Input 
                    type="number" 
                    value={repaymentForm.principalPortion}
                    onChange={(e) => setRepaymentForm({...repaymentForm, principalPortion: parseFloat(e.target.value) || 0})}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('liabilities.interestPortion')}</Label>
                  <Input 
                    type="number" 
                    value={repaymentForm.interestPortion}
                    onChange={(e) => setRepaymentForm({...repaymentForm, interestPortion: parseFloat(e.target.value) || 0})}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.date')}</Label>
                <Input 
                  type="date" 
                  value={repaymentForm.transactionDate}
                  onChange={(e) => setRepaymentForm({...repaymentForm, transactionDate: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.reference')}</Label>
                <Input 
                  value={repaymentForm.reference}
                  onChange={(e) => setRepaymentForm({...repaymentForm, reference: e.target.value})}
                  placeholder="Auto-generated if empty"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.notes')}</Label>
                <Input 
                  value={repaymentForm.notes}
                  onChange={(e) => setRepaymentForm({...repaymentForm, notes: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRepaymentOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
              <Button onClick={handleRepayment} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.recordRepayment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interest Dialog */}
        <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('liabilities.dialogs.interest.title')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.interest.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.interestAmount')} *</Label>
                <Input 
                  type="number" 
                  value={interestForm.amount}
                  onChange={(e) => setInterestForm({...interestForm, amount: parseFloat(e.target.value) || 0})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
                {liability && liability.interestRate > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Suggested: {formatCurrency(accruedInterest)} (based on {liability.interestRate}% rate × {liability.outstandingBalance?.toLocaleString()} balance × days since last charge)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.date')}</Label>
                <Input 
                  type="date" 
                  value={interestForm.transactionDate}
                  onChange={(e) => setInterestForm({...interestForm, transactionDate: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.reference')}</Label>
                <Input 
                  value={interestForm.reference}
                  onChange={(e) => setInterestForm({...interestForm, reference: e.target.value})}
                  placeholder="Auto-generated if empty"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.notes')}</Label>
                <Input 
                  value={interestForm.notes}
                  onChange={(e) => setInterestForm({...interestForm, notes: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInterestOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
              <Button onClick={handleInterest} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.recordInterest')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('liabilities.dialogs.cancel.title')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.cancel.description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="dark:bg-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-white">{t('liabilities.dialogs.delete.title')}</AlertDialogTitle>
              <AlertDialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.delete.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={submitting} className="dark:bg-red-600 dark:text-white">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
