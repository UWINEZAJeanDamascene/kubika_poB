import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Layout } from "@/app/layout/Layout";
import { bankAccountsApi, bankReconciliationApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Check, ChevronLeft, ChevronRight, FileDown, Link as LinkIcon, Loader2, Lock, Upload } from "lucide-react";
import { toast } from "sonner";

type Props = { embedded?: boolean; accountId?: string; accountData?: any };

const money = (value: number | string | undefined) =>
  `RWF ${Math.round(Number(value || 0)).toLocaleString()}`;

const statusClass: Record<string, string> = {
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  locked: "bg-slate-100 text-slate-700 ring-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`whitespace-nowrap ring-1 ${statusClass[status] || statusClass.in_progress}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function BankReconciliationPage({ embedded = false, accountId, accountData }: Props) {
  const params = useParams<{ id: string }>();
  const bankAccountId = accountId || params.id || "";
  const [account, setAccount] = useState<any>(accountData || null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPages, setSessionPages] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [statementTx, setStatementTx] = useState<any[]>([]);
  const [statementPage, setStatementPage] = useState(1);
  const [statementPages, setStatementPages] = useState(1);
  const [bookTx, setBookTx] = useState<any[]>([]);
  const [bookPage, setBookPage] = useState(1);
  const [bookPages, setBookPages] = useState(1);
  const [selectedStatement, setSelectedStatement] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    openingStatementBalance: "0",
    closingStatementBalance: "0",
  });

  const activeSession = useMemo(
    () => sessions.find((session) => session._id === activeSessionId),
    [sessions, activeSessionId],
  );

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [accountRes, sessionsRes] = await Promise.all([
        bankAccountId
          ? (accountData ? Promise.resolve({ data: accountData }) : bankAccountsApi.getById(bankAccountId))
          : Promise.resolve({ data: null }),
        bankReconciliationApi.listSessions(bankAccountId ? { bankAccountId, page: sessionPage, limit: 50 } : { page: sessionPage, limit: 50 }),
      ]);
      setAccount(accountRes.data || null);
      setSessions(sessionsRes.data || []);
      setSessionPages(sessionsRes.pagination?.pages || 1);
      if (!activeSessionId && sessionsRes.data?.[0]?._id) setActiveSessionId(sessionsRes.data[0]._id);
    } catch (error: any) {
      toast.error(error.message || "Failed to load reconciliation sessions");
    } finally {
      setLoading(false);
    }
  }, [accountData, activeSessionId, bankAccountId, sessionPage]);

  const loadWorkspace = useCallback(async () => {
    if (!activeSessionId) return;
    const matchStatus = filter === "all" ? undefined : filter;
    setLoading(true);
    try {
      const [summaryRes, statementRes, bookRes] = await Promise.all([
        bankReconciliationApi.summary(activeSessionId),
        bankReconciliationApi.listTransactions(activeSessionId, { matchStatus, page: statementPage, limit: 100 }),
        bankReconciliationApi.listBookTransactions(activeSessionId, { matchStatus, page: bookPage, limit: 100 }),
      ]);
      setSummary(summaryRes.data);
      setStatementTx(statementRes.data || []);
      setStatementPages(statementRes.pagination?.pages || 1);
      setBookTx(bookRes.data || []);
      setBookPages(bookRes.pagination?.pages || 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to load reconciliation workspace");
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, filter, statementPage, bookPage]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const createSession = async () => {
    setCreating(true);
    try {
      const response = await bankReconciliationApi.createSession({
        bankAccountId,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        openingStatementBalance: Number(form.openingStatementBalance || 0),
        closingStatementBalance: Number(form.closingStatementBalance || 0),
      });
      toast.success("Reconciliation session created");
      setSessions((items) => [response.data, ...items]);
      setActiveSessionId(response.data._id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const importCsv = async (file?: File) => {
    if (!file || !activeSessionId) return;
    try {
      const response = await bankReconciliationApi.importTransactions(activeSessionId, file);
      toast.success(`Imported ${response.data.imported} statement transactions`);
      if (response.data.errors?.length) toast.warning(`${response.data.errors.length} rows need attention`);
      loadWorkspace();
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    }
  };

  const matchSelected = async () => {
    if (!activeSessionId || !selectedBook || !selectedStatement) return;
    try {
      await bankReconciliationApi.match(activeSessionId, {
        bookTransactionId: selectedBook,
        statementTransactionId: selectedStatement,
      });
      setSelectedBook("");
      setSelectedStatement("");
      toast.success("Transactions matched");
      loadWorkspace();
    } catch (error: any) {
      toast.error(error.message || "Match failed");
    }
  };

  const autoMatch = async () => {
    if (!activeSessionId) return;
    try {
      const response = await bankReconciliationApi.autoMatch(activeSessionId);
      toast.success(`Auto matched ${response.data.matched} transaction pairs`);
      loadWorkspace();
    } catch (error: any) {
      toast.error(error.message || "Auto match failed");
    }
  };

  const complete = async () => {
    if (!activeSessionId) return;
    try {
      await bankReconciliationApi.completeSession(activeSessionId);
      toast.success("Reconciliation completed");
      loadSessions();
      loadWorkspace();
    } catch (error: any) {
      toast.error(error.message || "Complete reconciliation failed");
    }
  };

  const lock = async () => {
    if (!activeSessionId) return;
    try {
      await bankReconciliationApi.lockSession(activeSessionId);
      toast.success("Reconciliation locked");
      loadSessions();
    } catch (error: any) {
      toast.error(error.message || "Lock failed");
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Bank Reconciliation</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {account?.name || "Bank account"} {account?.accountNumber ? `- ${account.accountNumber}` : ""}
          </p>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
      </div>

      <Card className="border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
        <CardHeader>
          <CardTitle className="text-base">Create Session</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Input className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50" type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
          <Input className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50" type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
          <Input className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50" type="number" placeholder="Opening statement balance" value={form.openingStatementBalance} onChange={(e) => setForm({ ...form, openingStatementBalance: e.target.value })} />
          <Input className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50" type="number" placeholder="Closing statement balance" value={form.closingStatementBalance} onChange={(e) => setForm({ ...form, closingStatementBalance: e.target.value })} />
          <Button onClick={createSession} disabled={creating || !bankAccountId}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            New Session
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_320px]">
        <Card className="border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session._id}
                onClick={() => setActiveSessionId(session._id)}
                className={`w-full rounded border p-3 text-left text-sm ${activeSessionId === session._id ? "border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50" : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{new Date(session.periodStart).toLocaleDateString()} - {new Date(session.periodEnd).toLocaleDateString()}</span>
                  <StatusBadge status={session.status} />
                </div>
                {!bankAccountId && (
                  <div className="mt-1 text-slate-500">
                    {session.bankAccountId?.name || session.bankAccountId?.bankName || "Bank account"}
                  </div>
                )}
                <div className="mt-2 text-slate-500">Difference {money(session.adjustedBookBalance - session.adjustedBankBalance)}</div>
              </button>
            ))}
            {!sessions.length && <p className="text-sm text-slate-500">No reconciliation sessions yet.</p>}
            {sessionPages > 1 && (
              <PaginationControls page={sessionPage} pages={sessionPages} onPageChange={(nextPage) => {
                setSessionPage(nextPage);
                setActiveSessionId("");
              }} label="Session pagination" />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={(value) => { setFilter(value); setStatementPage(1); setBookPage(1); setSelectedStatement(""); setSelectedBook(""); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={autoMatch} disabled={!activeSessionId || activeSession?.status === "locked"}>Auto Match</Button>
            <Button onClick={matchSelected} disabled={!selectedBook || !selectedStatement || activeSession?.status === "locked"}>
              <LinkIcon className="mr-2 h-4 w-4" /> Match
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TransactionPanel
              title="Bank Statement Transactions"
              items={statementTx}
              selected={selectedStatement}
              onSelect={setSelectedStatement}
              side="statement"
              page={statementPage}
              pages={statementPages}
              onPageChange={(nextPage) => { setSelectedStatement(""); setStatementPage(nextPage); }}
            />
            <TransactionPanel
              title="Book Transactions"
              items={bookTx}
              selected={selectedBook}
              onSelect={setSelectedBook}
              side="book"
              page={bookPage}
              pages={bookPages}
              onPageChange={(nextPage) => { setSelectedBook(""); setBookPage(nextPage); }}
            />
          </div>
        </div>

        <Card className="border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryLine label="Closing book balance" value={summary?.closingBookBalance} />
            <SummaryLine label="Add: unrecorded bank credits" value={summary?.unrecordedBankCredits} />
            <SummaryLine label="Less: unrecorded bank charges" value={-Number(summary?.unrecordedBankCharges || 0)} />
            <SummaryLine label="Adjusted book balance" value={summary?.adjustedBookBalance} strong />
            <div className="border-t pt-3" />
            <SummaryLine label="Closing statement balance" value={summary?.closingStatementBalance} />
            <SummaryLine label="Add: deposits in transit" value={summary?.outstandingDeposits} />
            <SummaryLine label="Less: outstanding checks" value={-Number(summary?.outstandingChecks || 0)} />
            <SummaryLine label="Adjusted bank balance" value={summary?.adjustedBankBalance} strong />
            <div className="border-t pt-3" />
            <SummaryLine label="Difference" value={summary?.difference} strong />
            {summary?.isBalanced ? (
              <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><Check className="mr-1 h-3 w-3" /> Balanced</Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">Not balanced</Badge>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={complete} disabled={!summary?.isBalanced || activeSession?.status !== "in_progress"}>Complete Reconciliation</Button>
              <Button variant="outline" onClick={lock} disabled={activeSession?.status !== "completed"}><Lock className="mr-2 h-4 w-4" /> Lock Session</Button>
              <Button variant="outline" onClick={() => window.print()} disabled={!activeSessionId}><FileDown className="mr-2 h-4 w-4" /> Print Report</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return embedded ? content : <Layout>{content}</Layout>;
}

function PaginationControls({ page, pages, onPageChange, label }: { page: number; pages: number; onPageChange: (page: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2" aria-label={label}>
      <Button variant="outline" size="sm" aria-label="Previous page" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
        <ChevronLeft className="mr-1 h-4 w-4" />
      </Button>
      <span className="text-xs text-slate-500">{page} / {pages}</span>
      <Button variant="outline" size="sm" aria-label="Next page" onClick={() => onPageChange(Math.min(pages, page + 1))} disabled={page >= pages}>
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: any; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}

function TransactionPanel({
  title,
  items,
  selected,
  onSelect,
  side,
  page,
  pages,
  onPageChange,
}: {
  title: string;
  items: any[];
  selected: string;
  onSelect: (id: string) => void;
  side: "statement" | "book";
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card className="border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[560px] overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const id = item._id;
              const amount = side === "statement" ? Number(item.credit || item.debit || 0) : Number(item.amount || 0);
              const status = side === "statement" ? item.matchStatus : item.reconciliationStatus === "reconciled" ? "matched" : "unmatched";
              return (
                <TableRow
                  key={id}
                  onClick={() => status === "matched" ? undefined : onSelect(id)}
                  className={`${selected === id ? "bg-blue-50" : ""} ${status !== "matched" ? "cursor-pointer" : "opacity-70"}`}
                >
                  <TableCell className="whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="max-w-[280px] truncate">{item.description}</div>
                    <div className="text-xs text-slate-500">{item.reference || item.referenceNumber || item.sourceReference}</div>
                  </TableCell>
                  <TableCell className="text-right">{money(amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-500">No transactions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pages > 1 && <div className="px-4 pb-3"><PaginationControls page={page} pages={pages} onPageChange={onPageChange} label={`${title} pagination`} /></div>}
      </CardContent>
    </Card>
  );
}
