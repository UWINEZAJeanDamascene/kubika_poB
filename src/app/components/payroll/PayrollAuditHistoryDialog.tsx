import { useEffect, useState } from "react";
import { payrollApi, payrollRunApi } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { Loader2 } from "lucide-react";

type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  changes: unknown;
  createdAt: string;
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void; entityType: "payroll" | "payroll_run" | "payroll_period_input"; entityId: string; title?: string };

export function PayrollAuditHistoryDialog({ open, onOpenChange, entityType, entityId, title = "Payroll audit history" }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !entityId) return;
    let active = true;
    setLoading(true); setError("");
    const request = entityType === "payroll_run"
      ? payrollRunApi.getAuditHistory(entityId)
      : entityType === "payroll_period_input"
        ? payrollApi.getPeriodInputAuditHistory(entityId)
        : payrollApi.getAuditHistory(entityId);
    request.then((response) => { if (active) setEvents(response.data || []); })
      .catch((reason: any) => { if (active) setError(reason?.message || "Could not load payroll audit history"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, entityId, entityType]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 dark:border-slate-800 sm:max-w-2xl">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Read-only history of payroll changes and approvals.</DialogDescription></DialogHeader>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : error ? <p role="alert" className="py-4 text-sm text-red-600">{error}</p>
          : events.length === 0 ? <p className="py-4 text-sm text-slate-500">No audit events recorded.</p>
            : <div className="space-y-3">{events.map((event) => <article key={event.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="secondary">{event.action}</Badge><time className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</time></div>
              <p className="mt-1 text-xs text-slate-500">Actor: {event.actorUserId || "System"}</p>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs dark:bg-slate-950">{JSON.stringify(event.changes, null, 2)}</pre>
            </article>)}</div>}
    </DialogContent>
  </Dialog>;
}
