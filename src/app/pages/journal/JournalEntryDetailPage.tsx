import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { journalEntriesApi, JournalEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  useEffect(() => {
    if (id) fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const response = await journalEntriesApi.getById(id!);
      if (response.success) setEntry(response.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!entry) return;
    setActionLoading(true);
    try {
      await journalEntriesApi.post(entry._id);
      toast.success('Entry posted successfully');
      setPostDialogOpen(false);
      fetchEntry();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!entry) return;
    setActionLoading(true);
    try {
      await journalEntriesApi.void(entry._id);
      toast.success('Entry voided');
      setVoidDialogOpen(false);
      fetchEntry();
    } catch (error: any) {
      toast.error(error.message || 'Failed to void entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!entry) return;
    setActionLoading(true);
    try {
      const response = await journalEntriesApi.reverse(entry._id, reverseReason);
      toast.success('Reversal entry created');
      setReverseDialogOpen(false);
      if (response.data?._id) {
        navigate(`/journal/${response.data._id}`);
      } else {
        fetchEntry();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reverse entry');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Posted</Badge>;
      case 'draft': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</Badge>;
      case 'voided': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Voided</Badge>;
      case 'reversed': return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Reversed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!entry) {
    return (
      <Layout>
        <div className="text-center py-24 dark:bg-slate-900 min-h-screen">
          <p className="text-slate-500 dark:text-slate-400">Journal entry not found</p>
          <Button variant="outline" className="mt-4 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => navigate('/journal')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Journal
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/journal')} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                {entry.entryNumber}
              </h1>
              <p className="text-muted-foreground dark:text-slate-400">{entry.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(entry.status)}
            {entry.status === 'draft' && (
              <Button onClick={() => setPostDialogOpen(true)} className="dark:bg-primary dark:text-primary-foreground">
                <CheckCircle className="h-4 w-4 mr-2" />
                Post Entry
              </Button>
            )}
            {entry.status === 'posted' && (
              <>
                <Button variant="outline" onClick={() => setReverseDialogOpen(true)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reverse
                </Button>
                <Button variant="destructive" onClick={() => setVoidDialogOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Void
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Entry Details */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
          <Card className="dark:bg-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Entry Number</p>
              <p className="font-mono font-semibold dark:text-white">{entry.entryNumber}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Date</p>
              <p className="font-semibold dark:text-white">{format(new Date(entry.date), 'dd MMM yyyy')}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Source</p>
              <p className="font-semibold dark:text-white">{(entry as any).sourceType || 'manual'}</p>
              {(entry as any).sourceReference && (
                <p className="text-xs text-slate-400 dark:text-slate-500">{(entry as any).sourceReference}</p>
              )}
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
              <p>{getStatusBadge(entry.status)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Journal Lines */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Journal Lines</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Total Debit: {entry.totalDebit.toLocaleString()} | Total Credit: {entry.totalCredit.toLocaleString()}
              {Math.abs(entry.totalDebit - entry.totalCredit) < 0.01 && (
                <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Balanced</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 xl:hidden">
              {entry.lines.map((line, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-mono text-xs text-slate-500">{line.accountCode}</p><p className="mt-1 text-sm font-semibold dark:text-white">{line.accountName}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{line.description || "—"}</p></div>
                    <div className="shrink-0 text-right text-sm"><p className="text-slate-500">Debit</p><p className="font-mono font-medium dark:text-white">{line.debit > 0 ? line.debit.toLocaleString() : "—"}</p><p className="mt-2 text-slate-500">Credit</p><p className="font-mono font-medium dark:text-white">{line.credit > 0 ? line.credit.toLocaleString() : "—"}</p></div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-900"><span>Total</span><span className="text-right">Dr {entry.totalDebit.toLocaleString()}<br/>Cr {entry.totalCredit.toLocaleString()}</span></div>
            </div>
            <div className="hidden overflow-x-auto xl:block">
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                  <TableHead className="dark:text-slate-200">Account Code</TableHead>
                  <TableHead className="dark:text-slate-200">Account Name</TableHead>
                  <TableHead className="dark:text-slate-200">Description</TableHead>
                  <TableHead className="text-right dark:text-slate-200">Debit</TableHead>
                  <TableHead className="text-right dark:text-slate-200">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line, idx) => (
                  <TableRow key={idx} className="dark:border-slate-600">
                    <TableCell className="font-mono dark:text-white">{line.accountCode}</TableCell>
                    <TableCell className="dark:text-slate-300">{line.accountName}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{line.description}</TableCell>
                    <TableCell className="text-right font-mono dark:text-slate-300">
                      {line.debit > 0 ? line.debit.toLocaleString() : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono dark:text-slate-300">
                      {line.credit > 0 ? line.credit.toLocaleString() : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600">
                  <TableCell colSpan={3} className="dark:text-white">Total</TableCell>
                  <TableCell className="text-right font-mono dark:text-white">{entry.totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono dark:text-white">{entry.totalCredit.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        {entry.notes && (
          <Card className="dark:bg-slate-800">
            <CardHeader><CardTitle className="dark:text-white">Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm dark:text-slate-300">{entry.notes}</p></CardContent>
          </Card>
        )}

        {/* Post Dialog */}
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Post Journal Entry</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Posting will finalize this entry and update all account balances. This cannot be undone (use Reverse instead).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPostDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</Button>
              <Button onClick={handlePost} disabled={actionLoading} className="dark:bg-primary dark:text-primary-foreground">
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Post Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Dialog */}
        <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Void Journal Entry</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Voiding will reverse all account balance adjustments for this entry.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</Button>
              <Button variant="destructive" onClick={handleVoid} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Void Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Dialog */}
        <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Reverse Journal Entry</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                This will create a new entry that reverses all debits and credits.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reason" className="dark:text-slate-200">Reason for reversal</Label>
              <Textarea
                id="reason"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Optional reason..."
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReverseDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</Button>
              <Button onClick={handleReverse} disabled={actionLoading} className="dark:bg-primary dark:text-primary-foreground">
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Reverse Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
