import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  Landmark,
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
} from '@/app/components/ui/table';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LedgerEntry {
  date: string;
  entryNumber: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance?: number;
}

interface LedgerAccount {
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerEntry[];
}

export default function GeneralLedgerPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountCodeFilter, setAccountCodeFilter] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const fetchGeneralLedger = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (accountCodeFilter) params.accountCode = accountCodeFilter;

      const response = await journalEntriesApi.getGeneralLedger(params);
      if (response.success) {
        const data = (response.data || []) as unknown as LedgerAccount[];
        setAccounts(data);
        if (accountCodeFilter) {
          setExpandedAccounts(new Set(data.map((a: LedgerAccount) => a.code)));
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load general ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneralLedger();
  }, []);

  const toggleAccount = (code: string) => {
    const next = new Set(expandedAccounts);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpandedAccounts(next);
  };

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
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">General Ledger</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">All transactions grouped by account</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="h-6 border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400">
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  {accounts.length} Accounts
                </Badge>
              </div>
            </div>
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
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Account Code</Label>
              <Input
                value={accountCodeFilter}
                onChange={(e) => setAccountCodeFilter(e.target.value)}
                placeholder="e.g., 1100"
                className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
              />
            </div>
            <Button onClick={fetchGeneralLedger} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              Generate
            </Button>
          </div>

          {/* Accounts */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Layers className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No transactions found for the selected period</p>
            </div>
          ) : (
            accounts.map((account) => (
              <Card key={account.code} className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader
                  className="cursor-pointer pb-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  onClick={() => toggleAccount(account.code)}
                >
                  <CardTitle className="flex flex-col items-start justify-between gap-2 text-base font-semibold dark:text-white sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {expandedAccounts.has(account.code) ? (
                        <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      )}
                      <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                        <Landmark className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{account.code}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">—</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{account.name}</span>
                      <Badge variant="outline" className="h-5 text-xs dark:border-slate-700 dark:text-slate-400">{account.type}</Badge>
                    </div>
                    <span className={`shrink-0 font-mono text-sm font-bold ${account.closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {account.closingBalance.toLocaleString()}
                    </span>
                  </CardTitle>
                  <CardDescription className="pl-6 dark:text-slate-400">
                    {(account.transactions || []).length} transactions · Closing Balance: {account.closingBalance.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                {expandedAccounts.has(account.code) && (
                  <CardContent className="p-0">
                    <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800 xl:hidden">
                      {(account.transactions || []).map((t, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-slate-500">{format(new Date(t.date), 'dd MMM yyyy')}</p><p className="mt-1 truncate font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">{t.entryNumber}</p></div><span className="shrink-0 text-xs text-slate-500">Balance {t.balance?.toLocaleString() ?? "—"}</span></div>
                          <p className="mt-2 text-sm dark:text-slate-200">{t.description}</p>
                          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800"><span className="text-slate-500">Debit <b className="font-mono text-slate-800 dark:text-slate-200">{t.debit > 0 ? t.debit.toLocaleString() : "—"}</b></span><span className="text-slate-500">Credit <b className="font-mono text-slate-800 dark:text-slate-200">{t.credit > 0 ? t.credit.toLocaleString() : "—"}</b></span></div>
                        </div>
                      ))}
                      {!(account.transactions || []).length && <p className="py-6 text-center text-sm text-slate-500">No transactions in this account for the selected period.</p>}
                    </div>
                    <div className="hidden overflow-x-auto border-t border-slate-100 dark:border-slate-800 xl:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                            <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Entry #</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Debit</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Credit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(account.transactions || []).map((t, idx) => (
                            <TableRow key={idx} className="dark:border-slate-800">
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">{format(new Date(t.date), 'dd MMM yyyy')}</TableCell>
                              <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">{t.entryNumber}</TableCell>
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">{t.description}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                                {t.debit > 0 ? t.debit.toLocaleString() : ''}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                                {t.credit > 0 ? t.credit.toLocaleString() : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
