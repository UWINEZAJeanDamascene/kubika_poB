import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi, chartOfAccountsApi, ChartOfAccountItem } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  ScrollText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BadgeCheck,
  Layers,
  FilePenLine,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LineForm {
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export default function JournalEntryFormPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineForm[]>([
    { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
    { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await chartOfAccountsApi.getAll({ isActive: true });
      if (response.success) setAccounts(response.data || []);
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

  const addLine = () => {
    setLines([...lines, { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('Minimum 2 lines required');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill account name when code is selected
    if (field === 'accountCode') {
      const account = accounts.find(a => a.code === value);
      if (account) {
        updated[index].accountName = account.name;
      }
    }

    // Clear opposite field
    if (field === 'debit' && value > 0) {
      updated[index].credit = 0;
    }
    if (field === 'credit' && value > 0) {
      updated[index].debit = 0;
    }

    setLines(updated);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    const validLines = lines.filter(l => l.accountCode && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast.error('At least 2 lines with amounts are required');
      return;
    }

    if (!isBalanced) {
      toast.error('Journal entry must be balanced (Debits = Credits)');
      return;
    }

    setSaving(true);
    try {
      const response = await journalEntriesApi.create({
        date,
        description,
        notes,
        lines: validLines.map(l => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
        })),
      });

      if (response.success) {
        toast.success('Journal entry created as draft');
        navigate(`/journal/${response.data._id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create entry');
    } finally {
      setSaving(false);
    }
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
                    <FilePenLine className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">New Journal Entry</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Create a manual journal entry</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`h-6 gap-1 ${isBalanced ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'}`}>
                  {isBalanced ? <BadgeCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {isBalanced ? 'Balanced' : 'Unbalanced'}
                </Badge>
                <Button onClick={handleSubmit} disabled={saving} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save as Draft
                </Button>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Difference</p>
                    <p className={`mt-2 text-2xl font-bold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {Math.abs(totalDebit - totalCredit).toLocaleString()}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ring-1 ${isBalanced ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60' : 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60'}`}>
                    {isBalanced ? <BadgeCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entry Details */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold dark:text-white">
                <FilePenLine className="h-4 w-4 text-indigo-500" />
                Entry Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description *</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Monthly adjustment entry"
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Journal Lines */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base font-semibold dark:text-white">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Journal Lines
                </span>
                <Button variant="outline" size="sm" onClick={addLine} className="h-8 gap-1 dark:border-slate-700 dark:text-slate-200">
                  <Plus className="h-3.5 w-3.5" />
                  Add Line
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3 p-3 xl:hidden">
                {lines.map((line, idx) => (
                  <div key={idx} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2"><Label className="text-xs text-slate-500">Account</Label><Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={lines.length <= 2} className="h-10 w-10 text-red-500"><Trash2 className="h-4 w-4" /></Button></div>
                    <Select value={line.accountCode} onValueChange={(value) => updateLine(idx, 'accountCode', value)}>
                      <SelectTrigger className="min-h-11 font-mono text-sm dark:bg-slate-900 dark:text-white dark:border-slate-700"><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-700">{accounts.map(acc => <SelectItem key={acc.code} value={acc.code} className="dark:text-slate-200">{acc.code} - {acc.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div><Label className="text-xs text-slate-500">Description</Label><Input value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="Line description" className="mt-1 min-h-11 dark:bg-slate-900 dark:text-white" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs text-slate-500">Debit</Label><Input type="number" inputMode="decimal" step="0.01" min="0" value={line.debit || ''} onChange={(e) => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)} className="mt-1 min-h-11 text-right font-mono dark:bg-slate-900 dark:text-white" placeholder="0.00" /></div>
                      <div><Label className="text-xs text-slate-500">Credit</Label><Input type="number" inputMode="decimal" step="0.01" min="0" value={line.credit || ''} onChange={(e) => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)} className="mt-1 min-h-11 text-right font-mono dark:bg-slate-900 dark:text-white" placeholder="0.00" /></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                      <TableHead className="w-[220px] text-xs font-semibold text-slate-600 dark:text-slate-400">Account</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                      <TableHead className="w-[150px] text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Debit</TableHead>
                      <TableHead className="w-[150px] text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Credit</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx} className="dark:border-slate-800">
                        <TableCell>
                          <Select
                            value={line.accountCode}
                            onValueChange={(value) => updateLine(idx, 'accountCode', value)}
                          >
                            <SelectTrigger className="h-9 font-mono text-sm dark:bg-slate-900 dark:text-white dark:border-slate-700">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                              {accounts.map(acc => (
                                <SelectItem key={acc.code} value={acc.code} className="dark:text-slate-200">
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            placeholder="Line description"
                            className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit || ''}
                            onChange={(e) => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                            className="h-9 text-right font-mono dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit || ''}
                            onChange={(e) => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                            className="h-9 text-right font-mono dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 2}
                            className="h-8 w-8 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex flex-wrap justify-end gap-6 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Debit</p>
                  <p className="mt-1 text-lg font-bold font-mono text-slate-950 dark:text-white">{totalDebit.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Credit</p>
                  <p className="mt-1 text-lg font-bold font-mono text-slate-950 dark:text-white">{totalCredit.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Difference</p>
                  <p className={`mt-1 text-lg font-bold font-mono ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Math.abs(totalDebit - totalCredit).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold dark:text-white">
                <ScrollText className="h-4 w-4 text-indigo-500" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
                className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
