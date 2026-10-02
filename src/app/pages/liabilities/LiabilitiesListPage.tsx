import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loansApi, Liability } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import {
  Plus,
  Eye,
  RefreshCcw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Landmark,
  Wallet,
  Scale,
  Activity,
  ArrowRight,
  Loader2,
  CreditCard,
  ShieldCheck,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { useFormatCurrency } from '@/lib/currencyUtils';
import { toast } from 'sonner';

export default function LiabilitiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLiabilities = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response: any = await loansApi.getAll(params);
      if (response.success) {
        setLiabilities(response.data || []);
      }
    } catch (error) {
      console.error('[LiabilitiesListPage] Failed to fetch liabilities:', error);
      toast.error(t('liabilities.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchLiabilities();
  }, [fetchLiabilities]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; className: string; label: string }> = {
      active: { icon: Activity, className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60', label: t('liabilities.status.active') },
      fully_repaid: { icon: CheckCircle2, className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60', label: t('liabilities.status.fullyRepaid') },
      'paid-off': { icon: CheckCircle2, className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60', label: t('liabilities.status.fullyRepaid') },
      closed: { icon: ShieldCheck, className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700/50', label: t('liabilities.status.closed') },
      cancelled: { icon: XCircle, className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:ring-gray-700/50', label: t('liabilities.status.cancelled') },
      defaulted: { icon: AlertCircle, className: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60', label: t('liabilities.status.defaulted') },
      default: { icon: AlertCircle, className: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60', label: t('liabilities.status.defaulted') },
    };
    const cfg = config[status] || config.default;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 font-medium border-0 ${cfg.className}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {cfg.label}
      </Badge>
    );
  };

  const formatCurrency = useFormatCurrency();

  const totalPrincipal = liabilities.reduce((sum, l) => sum + (l.originalAmount || 0), 0);
  const totalOutstanding = liabilities.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);
  const totalPaid = liabilities.reduce((sum, l) => sum + ((l.originalAmount || 0) - (l.outstandingBalance || 0)), 0);
  const activeCount = liabilities.filter(l => l.status === 'active').length;
  const avgProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

  const getRepaymentProgress = (l: Liability) => {
    if (!l.originalAmount || l.originalAmount <= 0) return 0;
    const paid = (l.originalAmount || 0) - (l.outstandingBalance || 0);
    return Math.max(0, Math.min(100, (paid / l.originalAmount) * 100));
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 25) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const statusOptions = [
    { value: 'all', label: 'All', count: liabilities.length },
    { value: 'active', label: 'Active', count: liabilities.filter(l => l.status === 'active').length },
    { value: 'fully_repaid', label: 'Repaid', count: liabilities.filter(l => l.status === 'fully_repaid' || l.status === 'paid-off').length },
    { value: 'closed', label: 'Closed', count: liabilities.filter(l => l.status === 'closed').length },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero Header */}
        <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl 2xl:max-w-[2200px] px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900/40">
                  <Landmark className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('liabilities.title')}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('liabilities.subtitle')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/liabilities/new')}
                className="bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('liabilities.addLiability')}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl 2xl:max-w-[2200px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Total Liabilities
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{liabilities.length}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {activeCount} active
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:ring-indigo-900/40">
                    <Scale className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Total Principal
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalPrincipal)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Original borrowed
                    </p>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Outstanding Balance
                    </p>
                    <p className="mt-2 text-3xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalOutstanding)}</p>
                    <p className="mt-1 text-xs text-rose-600/70 dark:text-rose-400/70">
                      Remaining to repay
                    </p>
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
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Repayment Progress
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                      {avgProgress.toFixed(1)}%
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getProgressColor(avgProgress)}`}
                        style={{ width: `${avgProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-900/40">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all
                  ${statusFilter === opt.value
                    ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-600'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                  }`}
              >
                {opt.label}
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold
                  ${statusFilter === opt.value
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-0">
              <div className="space-y-3 p-3 xl:hidden">
                {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />) : liabilities.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700"><Scale className="mx-auto h-8 w-8 text-slate-400"/><p className="mt-2 text-sm font-medium dark:text-white">{t('liabilities.noLiabilities')}</p><Button variant="outline" size="sm" className="mt-4 min-h-10" onClick={() => navigate('/liabilities/new')}><Plus className="mr-2 h-4 w-4"/>Add Liability</Button></div> : liabilities.map((liability) => {
                  const progress = getRepaymentProgress(liability);
                  return <div key={liability._id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">{liability.loanNumber}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{liability.name}</p><p className="mt-0.5 text-xs text-slate-500">{liability.lenderName}</p></div>{getStatusBadge(liability.status)}</div>
                    <p className="mt-2 text-xs text-slate-500">{(liability as any).loanType ? t(`liabilities.types.${liability.loanType}`) : t(`liabilities.types.${liability.type || 'other'}`)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><div><p className="text-xs text-slate-500">Principal</p><p className="mt-1 text-sm font-medium dark:text-slate-200">{formatCurrency(liability.originalAmount)}</p></div><div><p className="text-xs text-slate-500">Outstanding</p><p className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(liability.outstandingBalance)}</p></div></div>
                    <div className="mt-3"><div className="flex justify-between text-xs text-slate-500"><span>Repayment progress</span><span>{progress.toFixed(0)}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${getProgressColor(progress)}`} style={{width: `${progress}%`}} /></div></div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"><Button variant="outline" size="sm" className="min-h-10" onClick={() => navigate(`/liabilities/${liability._id}`)}><Eye className="mr-1.5 h-4 w-4"/>View</Button><Button variant="outline" size="sm" className="min-h-10 px-2" onClick={() => navigate(`/liabilities/${liability._id}?action=repayment`)}><RefreshCcw className="mr-1.5 h-4 w-4"/>Pay</Button><Button variant="outline" size="sm" className="min-h-10 px-2" onClick={() => navigate(`/liabilities/${liability._id}?action=interest`)}><TrendingUp className="mr-1.5 h-4 w-4"/>Interest</Button></div>
                  </div>;
                })}
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/50 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                      <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reference</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name / Lender</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Principal</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Outstanding</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</TableHead>
                      <TableHead className="w-[120px] text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="dark:border-slate-800">
                          <TableCell colSpan={8}>
                            <div className="flex items-center gap-4 py-3">
                              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                              <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                              <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                              <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : liabilities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-16">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-4 dark:bg-slate-900/70">
                              <Scale className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              {t('liabilities.noLiabilities')}
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                              No liabilities found. Create a new liability to start tracking your borrowings and repayments.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={() => navigate('/liabilities/new')}
                            >
                              <Plus className="mr-1.5 h-4 w-4" />
                              Add Liability
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      liabilities.map((liability) => {
                        const progress = getRepaymentProgress(liability);
                        return (
                          <TableRow
                            key={liability._id}
                            className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/60"
                            onClick={() => navigate(`/liabilities/${liability._id}`)}
                          >
                            <TableCell className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                              {liability.loanNumber}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{liability.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{liability.lenderName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                              {(liability as any).loanType ? t(`liabilities.types.${liability.loanType}`) : t(`liabilities.types.${liability.type || 'other'}`)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                              {formatCurrency(liability.originalAmount)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-rose-600 dark:text-rose-400">
                              {formatCurrency(liability.outstandingBalance)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {progress.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(liability.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/liabilities/${liability._id}`);
                                  }}
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/liabilities/${liability._id}?action=repayment`);
                                  }}
                                  title="Repayment"
                                >
                                  <RefreshCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/liabilities/${liability._id}?action=interest`);
                                  }}
                                  title="Interest"
                                >
                                  <TrendingUp className="h-4 w-4" />
                                </Button>
                                <ArrowRight className="ml-1 h-4 w-4 text-slate-300 dark:text-slate-600" />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
