import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { payrollRunApi, PayrollRun } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  RefreshCw,
  Loader2,
  Play,
  AlertCircle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function PayrollRunsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [deadlines, setDeadlines] = useState<Array<{ run_id: string; reference_no: string; type: string; stage: string; due_date: string | null; status: string; amount: number }>>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: currentPage, limit };
      if (filterStatus) params.status = filterStatus;

      const response = await payrollRunApi.getAll(params);
      if (response.success) {
        setRuns(response.data || []);
        if (response.pagination) {
          setTotalCount(response.pagination.total || 0);
          setTotalPages(response.pagination.pages || 1);
        }
      }
      const deadlineResponse = await payrollRunApi.getComplianceDeadlines();
      setDeadlines((deadlineResponse.data || []).filter((item) => item.status !== 'complete').slice(0, 8));
    } catch (error) {
      console.error('[PayrollRunsListPage] Failed to fetch:', error);
      toast.error(t('payroll.messages.runLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentPage, limit, t]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handlePost = async (run: PayrollRun) => {
    setSubmitting(true);
    try {
      const response = await payrollRunApi.post(run._id);
      if (response.success) {
        toast.success(t('payroll.messages.runPosted'));
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runPostFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!selectedRun) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.reverse(selectedRun._id, {
        reason: reversalReason || undefined,
      });
      if (response.success) {
        toast.success(t('payroll.messages.runReversed'));
        setShowReverseDialog(false);
        setSelectedRun(null);
        setReversalReason('');
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runReverseFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRun) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.delete(selectedRun._id);
      if (response.success) {
        toast.success(t('payroll.messages.runDeleted'));
        setShowDeleteDialog(false);
        setSelectedRun(null);
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runLoadFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500' },
      posted: { className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' },
      reversed: { className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
    };
    const { className } = config[status] || config.draft;
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Play className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{t('payroll.run.title')}</h1>
                  <Badge variant="secondary" className="h-6">{t('payroll.run.subtitle')}</Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('payroll.run.subtitle')}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {hasPermission('payroll:create') && <Button onClick={() => navigate('/payroll-runs/new')} className="h-10 gap-2 bg-blue-600 hover:bg-blue-700">
                    <Play className="h-4 w-4" />
                    {t('payroll.run.createFromRecords') || 'New Payroll Run'}
                  </Button>}
                  <Button variant="outline" onClick={() => navigate('/payroll')} className="h-10 gap-2">
                    <Eye className="h-4 w-4" />
                    {t('payroll.employeeRecords')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900 min-h-[64px] flex flex-col justify-center min-w-[320px] flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Employees</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white leading-tight">{runs.reduce((acc, r) => acc + (r.employee_count || 0), 0)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900 min-h-[64px] flex flex-col justify-center min-w-[320px] flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Gross</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white leading-tight break-words">{formatCurrency(runs.reduce((acc, r) => acc + (r.total_gross || 0), 0))}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900 min-h-[64px] flex flex-col justify-center min-w-[320px] flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Net</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight break-words">{formatCurrency(runs.reduce((acc, r) => acc + (r.total_net || 0), 0))}</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Payroll deadlines</h2><p className="text-xs text-slate-500 dark:text-slate-400">Open PAYE, RSSB, and salary payment actions</p></div>
                <Badge variant={deadlines.some((item) => item.status === 'overdue') ? 'destructive' : 'secondary'}>{deadlines.filter((item) => item.status === 'overdue').length} overdue</Badge>
              </div>
              {deadlines.length === 0 ? <p className="text-sm text-slate-500">No outstanding payroll deadlines.</p> : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {deadlines.map((item) => <button key={`${item.run_id}-${item.type}-${item.stage}`} onClick={() => navigate(`/payroll-runs/${item.run_id}`)} className="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-900 dark:text-slate-100">{item.type.toUpperCase()} {item.stage}</span><Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>{item.status.replace('_', ' ')}</Badge></div>
                  <p className="mt-1 text-xs text-slate-500">{item.reference_no} · Due {item.due_date || '—'}</p>
                </button>)}
              </div>}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"><SelectValue placeholder={t('payroll.filterByStatus')} /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="all" className="dark:text-slate-200">{t('payroll.allStatuses')}</SelectItem>
                    <SelectItem value="draft" className="dark:text-slate-200">{t('payroll.statuses.draft')}</SelectItem>
                    <SelectItem value="posted" className="dark:text-slate-200">{t('payroll.statuses.posted')}</SelectItem>
                    <SelectItem value="reversed" className="dark:text-slate-200">{t('payroll.statuses.reversed')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" onClick={() => { setFilterStatus(''); setCurrentPage(1); }} className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('common.clearFilters')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
                </div>
              ) : runs.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-400" />
                  <p className="text-muted-foreground dark:text-slate-400">No payroll runs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600">
                        <TableHead className="dark:text-slate-200">{t('payroll.reference')}</TableHead>
                        <TableHead className="dark:text-slate-200">{t('payroll.payPeriod')}</TableHead>
                        <TableHead className="dark:text-slate-200">{t('payroll.paymentDate')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('payroll.totalGross')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('payroll.run.rssbTotal')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('payroll.totalNet')}</TableHead>
                        <TableHead className="text-center dark:text-slate-200">{t('payroll.employees')}</TableHead>
                        <TableHead className="dark:text-slate-200">{t('payroll.status')}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => (
                        <TableRow key={run._id} className="dark:border-slate-600">
                          <TableCell className="font-mono font-medium dark:text-white whitespace-nowrap">{run.reference_no}</TableCell>
                          <TableCell className="dark:text-slate-300 max-w-[220px] truncate">{formatPeriod(run.pay_period_start, run.pay_period_end)}</TableCell>
                          <TableCell className="dark:text-slate-300 whitespace-nowrap">{formatDate(run.payment_date)}</TableCell>
                          <TableCell className="text-right font-medium dark:text-slate-200 whitespace-nowrap">{formatCurrency(run.total_gross)}</TableCell>
                          <TableCell className="text-right text-orange-600 dark:text-orange-400 whitespace-nowrap">{formatCurrency(run.total_other_deductions)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{formatCurrency(run.total_net)}</TableCell>
                          <TableCell className="text-center dark:text-slate-300 whitespace-nowrap">{run.employee_count}</TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/payroll-runs/${run._id}`)} title={t('payroll.run.viewDetails')} className="dark:text-slate-300 dark:hover:bg-slate-700">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {run.status === 'draft' && (
                                <>
                                  {hasPermission('payroll:post') && <Button variant="ghost" size="icon" onClick={() => handlePost(run)} disabled={submitting || String(run.created_by || '') === String(user?._id || '')} title={String(run.created_by || '') === String(user?._id || '') ? 'A different user must post this payroll run' : t('payroll.run.postRun')} className="dark:text-green-400 dark:hover:bg-slate-700">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </Button>}
                                  {hasPermission('payroll:delete') && <Button variant="ghost" size="icon" onClick={() => { setSelectedRun(run); setShowDeleteDialog(true); }} title={t('payroll.run.deleteRun')} className="dark:text-red-400 dark:hover:bg-slate-700">
                                    <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                                  </Button>}
                                </>
                              )}
                              {run.status === 'posted' && hasPermission('payroll:admin') && (
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedRun(run); setShowReverseDialog(true); }} title={t('payroll.run.reverseRun')} className="dark:text-orange-400 dark:hover:bg-slate-700">
                                  <RotateCcw className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between px-4 py-4 border-t dark:border-slate-600">
                    <div className="text-sm text-muted-foreground dark:text-slate-400">Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="dark:border-slate-600 dark:text-slate-200"><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="text-sm dark:text-slate-300">Page {currentPage} of {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="dark:border-slate-600 dark:text-slate-200"><ChevronRight className="h-4 w-4" /></Button>
                      <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[80px] bg-white dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800">
                          <SelectItem value="10" className="dark:text-slate-200">10</SelectItem>
                          <SelectItem value="20" className="dark:text-slate-200">20</SelectItem>
                          <SelectItem value="50" className="dark:text-slate-200">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete Confirmation */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="bg-white dark:bg-slate-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">{t('payroll.run.deleteConfirmTitle')}</DialogTitle>
                <DialogDescription className="dark:text-slate-400">{t('payroll.run.deleteConfirmMessage')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reverse Confirmation */}
          <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
            <DialogContent className="bg-white dark:bg-slate-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">{t('payroll.run.reverseConfirmTitle')}</DialogTitle>
                <DialogDescription className="dark:text-slate-400">{t('payroll.run.reverseConfirmMessage')}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-1">
                  <Label className="dark:text-slate-200">{t('payroll.run.reversalReason')}</Label>
                  <Input value={reversalReason} onChange={(e) => setReversalReason(e.target.value)} placeholder="Enter reason for reversal..." className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReverseDialog(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
                <Button variant="destructive" onClick={handleReverse} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('payroll.run.reverseRun')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
