import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CircleAlert, ExternalLink, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { Layout } from "@/app/layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { payrollRunApi } from "@/lib/api";

export default function PayrollExceptionsPage() {
  const [severity, setSeverity] = useState("");
  const query = useQuery({ queryKey: ["payroll", "operational-exceptions", severity], queryFn: () => payrollRunApi.getOperationalExceptions({ severity: severity || undefined, limit: 300 }), staleTime: 30_000 });
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
  return <Layout><main className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-5 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-600">Payroll operations</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Exception report</h1><p className="mt-1 text-sm text-muted-foreground">Find payroll runs and records that need operational or accounting follow-up.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!query.data?.items.length}>Export CSV</Button><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}/>Refresh</Button></div></header>
    {summary && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Critical</p><p className="mt-1 text-2xl font-bold text-rose-600">{summary.critical}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Warnings</p><p className="mt-1 text-2xl font-bold text-amber-600">{summary.warning}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-bold">{summary.overdue}</p></CardContent></Card></div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Open exceptions ({query.data?.total ?? "…"})</h2><label className="text-sm">Severity <select className="ml-2 h-10 rounded-md border bg-background px-3" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">All</option><option value="critical">Critical</option><option value="warning">Warning</option></select></label></div>
    {query.isError && <Card><CardContent className="p-5 text-sm text-rose-600">{(query.error as Error)?.message || "Unable to load payroll exceptions."}</CardContent></Card>}
    {query.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading exceptions…</p>}
    {!query.isLoading && !query.isError && !query.data?.items.length && <Card><CardContent className="p-8 text-center"><CircleAlert className="mx-auto mb-3 h-8 w-8 text-emerald-500"/><p className="font-medium">No payroll exceptions found</p><p className="mt-1 text-sm text-muted-foreground">The selected payroll operations are clear.</p></CardContent></Card>}
    <section className="space-y-3">{query.data?.items.map((item) => <Card key={item.id} className="overflow-hidden"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><span className={`mt-0.5 rounded-lg p-2 ${item.severity === "critical" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}><AlertTriangle className="h-5 w-5"/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${item.severity === "critical" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>{item.severity}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.description}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{item.reference_no && <span>{item.reference_no}</span>}{item.employee_name && <span>{item.employee_name}</span>}{item.due_date && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5"/>Due {new Date(item.due_date).toLocaleDateString()}</span>}{item.amount != null && <span>Amount {new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(item.amount)}</span>}</div></div></div>{item.run_id && <Button asChild size="sm" variant="outline" className="shrink-0"><Link to={`/payroll-runs/${item.run_id}`}>Open run <ExternalLink className="ml-2 h-3.5 w-3.5"/></Link></Button>}{!item.run_id && item.payroll_id && <Button asChild size="sm" variant="outline" className="shrink-0"><Link to={`/payroll/${item.payroll_id}`}>Open record <ExternalLink className="ml-2 h-3.5 w-3.5"/></Link></Button>}</CardContent></Card>)}</section>
  </main></Layout>;
}
