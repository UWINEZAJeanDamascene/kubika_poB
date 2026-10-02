import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi, TrialBalanceEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  Calculator,
  BadgeCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/app/components/ui/table';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TrialBalancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await journalEntriesApi.getTrialBalance(params);
      if (response.success) {
        const data = response.data || [];
        setEntries(data);
        setTotalDebit(response.totals?.totalDebit || data.reduce((s: number, e: TrialBalanceEntry) => s + (e.debit || 0), 0));
        setTotalCredit(response.totals?.totalCredit || data.reduce((s: number, e: TrialBalanceEntry) => s + (e.credit || 0), 0));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => navigate('/journal')} className="h-10 w-10 dark:border-slate-700 dark:text-slate-200">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Trial Balance</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Verify all debits equal all credits</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`h-6 gap-1 ${isBalanced ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'}`}>
                  {isBalanced ? <BadgeCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {isBalanced ? 'Balanced' : `Unbalanced by ${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
                </Badge>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Debit</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{totalDebit.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Credit</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{totalCredit.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Accounts</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{entries.length}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
            </div>
            <Button onClick={fetchTrialBalance} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Generate
            </Button>
            {startDate || endDate ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <CalendarDays className="inline h-3 w-3 mr-1" />
                {startDate ? format(new Date(startDate), 'dd MMM yyyy') : 'Beginning'} — {endDate ? format(new Date(endDate), 'dd MMM yyyy') : 'Present'}
              </span>
            ) : null}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Layers className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No entries found for the selected period</p>
            </div>
          ) : (
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base font-semibold dark:text-white">
                  <span>Trial Balance</span>
                  <Badge variant="outline" className={`h-6 gap-1 ${isBalanced ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'}`}>
                    {isBalanced ? <BadgeCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {isBalanced ? 'Balanced' : `Unbalanced by ${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
                  </Badge>
                </CardTitle>
                {startDate || endDate ? (
                  <CardDescription className="dark:text-slate-400">
                    Period: {startDate ? format(new Date(startDate), 'dd MMM yyyy') : 'Beginning'} — {endDate ? format(new Date(endDate), 'dd MMM yyyy') : 'Present'}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-3 xl:hidden">
                  {entries.map((entry) => (
                    <div key={entry.accountCode} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="min-w-0"><p className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">{entry.accountCode}</p><p className="mt-1 text-sm font-medium dark:text-white">{entry.accountName}</p></div>
                      <div className="shrink-0 text-right text-xs"><p className="text-slate-500">Debit</p><p className="font-mono font-semibold dark:text-white">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</p><p className="mt-1 text-slate-500">Credit</p><p className="font-mono font-semibold dark:text-white">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</p></div>
                    </div>
                  ))}
                  <div className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-900"><span>Total</span><span className="text-right">Dr {totalDebit.toLocaleString()}<br/>Cr {totalCredit.toLocaleString()}</span></div>
                </div>
                <div className="hidden overflow-x-auto xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Account Code</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Account Name</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Debit</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.accountCode} className="dark:border-slate-800">
                          <TableCell className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{entry.accountCode}</TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{entry.accountName}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                            {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                            {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-slate-50 font-bold dark:bg-slate-900/50 dark:border-slate-800">
                        <TableCell colSpan={2} className="text-sm font-bold text-slate-950 dark:text-white">Total</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-slate-950 dark:text-white">{totalDebit.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-slate-950 dark:text-white">{totalCredit.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
