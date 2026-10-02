import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi, JournalEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ScrollText,
  BadgeCheck,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SOURCE_TYPES = [
  { value: 'all', label: 'All Sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'expense', label: 'Expense' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'payroll_run', label: 'Payroll Run' },
  { value: 'payroll_salary', label: 'Payroll Salary' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'purchase_return', label: 'Purchase Return' },
  { value: 'tax_settlement', label: 'Tax Settlement' },
  { value: 'vat_settlement', label: 'VAT Settlement' },
  { value: 'paye_settlement', label: 'PAYE Settlement' },
  { value: 'rssb_settlement', label: 'RSSB Settlement' },
  { value: 'reversal', label: 'Reversal' },
  { value: 'petty_cash_expense', label: 'Petty Cash' },
  { value: 'cogs', label: 'COGS' },
  { value: 'payment', label: 'Payment' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'voided', label: 'Voided' },
  { value: 'reversed', label: 'Reversed' },
];

export default function JournalEntriesPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Void dialog
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidingEntry, setVoidingEntry] = useState<JournalEntry | null>(null);
  const [voiding, setVoiding] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (sourceTypeFilter !== 'all') params.sourceType = sourceTypeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await journalEntriesApi.getAll(params);
      if (response.success) {
        setEntries(response.data || []);
        setTotalPages(response.pages || 1);
        setTotal(response.total || 0);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sourceTypeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntries();
  };

  const handleVoid = async () => {
    if (!voidingEntry) return;
    setVoiding(true);
    try {
      await journalEntriesApi.void(voidingEntry._id);
      toast.success('Journal entry voided');
      setVoidDialogOpen(false);
      setVoidingEntry(null);
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to void entry');
    } finally {
      setVoiding(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (sourceTypeFilter !== 'all') params.append('sourceType', sourceTypeFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    const url = `/api/journal-entries/export?${params.toString()}`;
    window.open(url, '_blank');
    toast.success('Export started');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return (
          <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
            <BadgeCheck className="h-3 w-3" />
            Posted
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            Draft
          </Badge>
        );
      case 'voided':
        return (
          <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Voided
          </Badge>
        );
      case 'reversed':
        return (
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
            Reversed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const postedCount = entries.filter(e => e.status === 'posted').length;
  const draftCount = entries.filter(e => e.status === 'draft').length;
  const voidedCount = entries.filter(e => e.status === 'voided').length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <ScrollText className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Journal Entries</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      View and manage all journal entries · {total} total
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-6 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                    {postedCount} Posted
                  </Badge>
                  <Badge variant="outline" className="h-6 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                    {draftCount} Draft
                  </Badge>
                  <Badge variant="outline" className="h-6 border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                    {voidedCount} Voided
                  </Badge>
                </div>
              </div>
              <div className="mobile-action-row grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <Button variant="outline" size="sm" onClick={() => navigate('/journal/trial-balance')} className="h-9 dark:border-slate-700 dark:text-slate-200">
                  Trial Balance
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/journal/general-ledger')} className="h-9 dark:border-slate-700 dark:text-slate-200">
                  General Ledger
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button size="sm" onClick={() => navigate('/journal/new')} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                  New Entry
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Entries</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{total}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Posted</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{postedCount}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Draft</p>
                    <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{draftCount}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <Pencil className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Voided</p>
                    <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{voidedCount}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2.5 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Search by entry #, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
              />
            </div>
            <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
              <SelectTrigger className="h-9 w-full sm:w-40 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                {SOURCE_TYPES.map(st => (
                  <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-36 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400">To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>

          {/* Entries Table */}
          {loading && entries.length === 0 ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <FileText className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No journal entries found</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try adjusting your filters or create a new entry</p>
            </div>
          ) : (
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-0">
                <div className="space-y-3 p-3 xl:hidden">
                  {entries.map((entry) => (
                    <div key={entry._id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300">{entry.entryNumber}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{format(new Date(entry.date), 'dd MMM yyyy')}</p>
                        </div>
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{entry.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <Badge variant="outline" className="capitalize">{(entry as any).sourceType || 'manual'}</Badge>
                        <span className="text-right text-slate-500 dark:text-slate-400">Dr {formatAmount(entry.totalDebit)} <span className="px-1">·</span> Cr {formatAmount(entry.totalCredit)}</span>
                      </div>
                      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/journal/${entry._id}`)} className="min-h-10 flex-1"> <Eye className="mr-2 h-4 w-4" /> View</Button>
                        {entry.status === 'draft' && <Button variant="outline" size="sm" onClick={() => navigate(`/journal/${entry._id}`)} className="min-h-10 flex-1 text-emerald-600"><CheckCircle className="mr-2 h-4 w-4" /> Post</Button>}
                        {entry.status === 'posted' && <Button variant="outline" size="sm" onClick={() => { setVoidingEntry(entry); setVoidDialogOpen(true); }} className="min-h-10 flex-1 text-red-600"><XCircle className="mr-2 h-4 w-4" /> Void</Button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto xl:block">
                  <Table className="min-w-[960px]">
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Entry #</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Source</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Debit</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Credit</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry._id} className="dark:border-slate-800 dark:hover:bg-slate-900/50">
                          <TableCell className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {entry.entryNumber}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="max-w-xs text-sm text-slate-700 dark:text-slate-300">
                            <span className="truncate block">{entry.description}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize dark:border-slate-700 dark:text-slate-400">
                              {(entry as any).sourceType || 'manual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                            {formatAmount(entry.totalDebit)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                            {formatAmount(entry.totalCredit)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(entry.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/journal/${entry._id}`)}
                                className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {entry.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/journal/${entry._id}`)}
                                  title="Post entry"
                                  className="h-8 w-8 text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:bg-slate-800"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {entry.status === 'posted' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setVoidingEntry(entry); setVoidDialogOpen(true); }}
                                  title="Void entry"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:bg-slate-800"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      className="h-8 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Page {page} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="h-8 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Void Dialog */}
          <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 dark:text-white">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Void Journal Entry
                </DialogTitle>
                <DialogDescription className="dark:text-slate-400">
                  Are you sure you want to void entry <strong className="text-slate-900 dark:text-slate-200">{voidingEntry?.entryNumber}</strong>?
                  This will reverse all account balance adjustments.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVoidDialogOpen(false)} className="dark:border-slate-700 dark:text-slate-200">Cancel</Button>
                <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
                  {voiding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Void Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
