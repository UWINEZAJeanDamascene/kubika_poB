import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CircleAlert, CircleCheck, Download, ExternalLink, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { Layout } from "@/app/layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { payrollApi, payrollRunApi } from "@/lib/api";

type ExceptionRow = { id: string; status: string; type: string; severity: "critical" | "warning" | "info"; title: string; description: string; run_id?: string; payroll_id?: string; reference_no?: string; employee_name?: string; due_date?: string; amount?: number | null };
type ExceptionReport = { success: boolean; generated_at: string; total: number; summary: { critical: number; warning: number; overdue: number }; items: ExceptionRow[]; compatibilityMode?: boolean };

export default function PayrollExceptionsPage() {
  const [severity, setSeverity] = useState("");
  const query = useQuery<ExceptionReport>({ queryKey: ["payroll", "operational-exceptions", severity], queryFn: async (): Promise<ExceptionReport> => {
    try {
      return await payrollRunApi.getOperationalExceptions({ severity: severity || undefined, limit: 300 });
    } catch (error) {
      // During staggered deployments, generate a useful report from APIs that
      // are already available instead of showing a dead route when this new
      // endpoint has not reached the production server yet.
      if ((error as { status?: number })?.status !== 404) throw error;
      const loadPages = async <T,>(fetchPage: (page: number) => Promise<{ data: T[]; pagination?: { pages?: number; totalPages?: number } }>) => {
        const first = await fetchPage(1);
        const pageCount = Math.min(5, first.pagination?.pages || first.pagination?.totalPages || 1);
        const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)));
        return [first, ...rest].flatMap((page) => page.data || []);
      };
      const [runsResponse, payrollResponse, deadlinesResponse] = await Promise.all([
        loadPages((page) => payrollRunApi.getAll({ limit: 100, page })),
        loadPages((page) => payrollApi.getAll({ limit: 100, page })),
        payrollRunApi.getComplianceDeadlines({ status: "overdue" }),
      ]);
      const items: ExceptionRow[] = [];
      const today = new Date().toISOString().slice(0, 10);
      for (const run of runsResponse) {
        const ref = run.reference_no || run._id;
        const push = (type: string, level: "critical" | "warning", title: string, description: string, due_date?: string, amount?: number) => items.push({ id: `${type}:${run._id}`, status: "open", type, severity: level, title, description, run_id: run._id, reference_no: ref, due_date, amount });
        const gross = run.lines.reduce((sum, line) => sum + Number(line.gross_salary || 0), 0);
        const net = run.lines.reduce((sum, line) => sum + Number(line.net_pay || 0), 0);
        if (run.status === "posted" && !run.journal_entry_id) push("run_journal_missing", "critical", "Posted payroll has no linked journal", `${ref} is posted but has no payroll journal reference.`, undefined, run.total_gross);
        if (run.status === "posted" && (Math.abs(gross - run.total_gross) > 0.01 || Math.abs(net - run.total_net) > 0.01)) push("run_total_mismatch", "critical", "Payroll totals do not match employee lines", `${ref} header totals differ from its employee lines.`, undefined, run.total_net);
        for (const warning of run.warnings || []) push("run_warning", "warning", "Payroll run needs review", String(warning));
        if (run.payment_date && run.payment_date.slice(0, 10) < today && run.status === "draft") push("draft_run_past_payment_date", "critical", "Draft payroll is past its payment date", `${ref} has not been posted and its payment date has passed.`, run.payment_date.slice(0, 10), run.total_net);
      }
      for (const due of deadlinesResponse.data || []) if (due.status === "overdue") items.push({ id: `${due.type}_${due.stage}:${due.run_id}`, status: "open", type: `${due.type}_${due.stage}_overdue`, severity: "critical", title: `${due.type.toUpperCase()} ${due.stage} is overdue`, description: `${due.reference_no} ${due.type.toUpperCase()} ${due.stage} deadline passed without a recorded completion.`, run_id: due.run_id, reference_no: due.reference_no, due_date: due.due_date || undefined, amount: due.amount });
      for (const record of payrollResponse) if (["finalised", "paid"].includes(record.record_status) && !record.employee_id) items.push({ id: `employee-link:${record._id}`, status: "open", type: "employee_master_link_missing", severity: "warning", title: "Payroll record is not linked to an employee profile", description: `${record.employee.firstName} ${record.employee.lastName} has no employee master link.`, payroll_id: record._id, employee_name: `${record.employee.firstName} ${record.employee.lastName}` });
      const filtered = items.filter((item) => !severity || item.severity === severity).sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1));
      return { success: true, generated_at: new Date().toISOString(), total: filtered.length, summary: { critical: filtered.filter((item) => item.severity === "critical").length, warning: filtered.filter((item) => item.severity === "warning").length, overdue: filtered.filter((item) => item.type.endsWith("_overdue")).length }, items: filtered.slice(0, 300), compatibilityMode: true };
    }
  }, staleTime: 30_000 });
  const summary = query.data?.summary;
  const exportCsv = () => {
    const items = query.data?.items || [];
    const cell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+@\-]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [["Severity", "Type", "Title", "Description", "Reference", "Employee", "Due date", "Amount"], ...items.map((item) => [item.severity, item.type, item.title, item.description, item.reference_no, item.employee_name, item.due_date, item.amount])];
    const blob = new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `payroll-exceptions-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const money = (amount: number) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(amount || 0);

  return <Layout><main className="mx-auto w-full max-w-7xl space-y-5 p-3 sm:space-y-6 sm:p-5 lg:p-8">
    <header className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/70 p-5 shadow-lg sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-300"><ShieldCheck className="h-6 w-6"/></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Payroll operations</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Exception report</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Resolve accounting, payment, and statutory issues before they disrupt payroll operations.</p></div></div><div className="flex gap-2 sm:shrink-0"><Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={exportCsv} disabled={!query.data?.items.length}><Download className="mr-2 h-4 w-4"/>Export CSV</Button><Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}/>Refresh</Button></div></div>
    </header>

    {summary && <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Exception totals">
      <Card className="border-rose-500/20 bg-rose-500/[0.04]"><CardContent className="flex items-center justify-between p-4 sm:p-5"><div><p className="text-sm font-medium text-muted-foreground">Critical</p><p className="mt-1 text-3xl font-bold text-rose-500">{summary.critical}</p><p className="mt-1 text-xs text-muted-foreground">Needs immediate action</p></div><span className="rounded-xl bg-rose-500/10 p-3 text-rose-500"><TriangleAlert className="h-5 w-5"/></span></CardContent></Card>
      <Card className="border-amber-500/20 bg-amber-500/[0.04]"><CardContent className="flex items-center justify-between p-4 sm:p-5"><div><p className="text-sm font-medium text-muted-foreground">Warnings</p><p className="mt-1 text-3xl font-bold text-amber-500">{summary.warning}</p><p className="mt-1 text-xs text-muted-foreground">Review and resolve</p></div><span className="rounded-xl bg-amber-500/10 p-3 text-amber-500"><AlertTriangle className="h-5 w-5"/></span></CardContent></Card>
      <Card className="border-border"><CardContent className="flex items-center justify-between p-4 sm:p-5"><div><p className="text-sm font-medium text-muted-foreground">Overdue</p><p className="mt-1 text-3xl font-bold">{summary.overdue}</p><p className="mt-1 text-xs text-muted-foreground">Payments and filing deadlines</p></div><span className="rounded-xl bg-primary/10 p-3 text-primary"><CalendarClock className="h-5 w-5"/></span></CardContent></Card>
    </section>}

    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-lg font-semibold">Open exceptions <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">{query.data?.total ?? "—"}</span></h2><p className="mt-1 text-sm text-muted-foreground">Prioritized items that need an owner’s attention.</p></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity</span>{[["", "All"], ["critical", "Critical"], ["warning", "Warning"]].map(([value, label]) => <button key={value || "all"} type="button" onClick={() => setSeverity(value)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors ${severity === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{label}</button>)}</div></div>
      {query.data?.compatibilityMode && <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>Showing a compatibility report from the available payroll APIs. Deploy the latest backend to enable the complete exception checks.</span></div>}
      {query.isError && <div className="m-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 text-sm"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"/><div><p className="font-semibold text-rose-600">Could not load payroll exceptions</p><p className="mt-1 text-muted-foreground">{(query.error as Error)?.message || "Please retry. If this continues, check payroll reporting access."}</p><Button size="sm" variant="outline" className="mt-3" onClick={() => query.refetch()}>Try again</Button></div></div>}
      {query.isLoading && <div className="space-y-3 p-4 sm:p-5">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted/60" />)}</div>}
      {!query.isLoading && !query.isError && !query.data?.items.length && <div className="flex flex-col items-center px-5 py-12 text-center"><span className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-500"><CircleCheck className="h-7 w-7"/></span><h3 className="mt-4 font-semibold">Payroll operations are clear</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">No exceptions match this filter. Refresh after posting a payroll run or recording a payment.</p></div>}
      <div className="divide-y">{query.data?.items.map((item) => <article key={item.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between sm:px-5"><div className="flex min-w-0 gap-3"><span className={`mt-0.5 rounded-xl p-2.5 ${item.severity === "critical" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-600"}`}><AlertTriangle className="h-5 w-5"/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold leading-snug">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${item.severity === "critical" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-700"}`}>{item.severity}</span></div><p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.description}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">{item.reference_no && <span className="rounded-md bg-muted px-2 py-1 font-mono">{item.reference_no}</span>}{item.employee_name && <span>{item.employee_name}</span>}{item.due_date && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5"/>Due {new Date(item.due_date).toLocaleDateString()}</span>}{item.amount != null && <span className="font-semibold text-foreground">{money(item.amount)}</span>}</div></div></div>{item.run_id ? <Button asChild size="sm" variant="outline" className="min-h-10 shrink-0"><Link to={`/payroll-runs/${item.run_id}`}>Review payroll run <ExternalLink className="ml-2 h-3.5 w-3.5"/></Link></Button> : item.payroll_id ? <Button asChild size="sm" variant="outline" className="min-h-10 shrink-0"><Link to={`/payroll/${item.payroll_id}`}>Review employee record <ExternalLink className="ml-2 h-3.5 w-3.5"/></Link></Button> : null}</article>)}</div>
      {query.data?.generated_at && <footer className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">Report updated {new Date(query.data.generated_at).toLocaleString()}</footer>}
    </section>
  </main></Layout>;
}
