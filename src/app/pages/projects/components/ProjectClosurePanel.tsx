import { useEffect, useState } from "react";
import { projectsApi, type Project } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";

type Checklist = { items: Array<{ code: string; label: string; required: boolean; completed: boolean; notes: string; completed_at?: string | null; completed_by?: string | null }>; blockers: Array<{ code: string; label: string }>; can_close: boolean; counts: Record<string, number> };

export default function ProjectClosurePanel({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => { setLoading(true); try { setChecklist((await projectsApi.getClosureChecklist(project._id)).data); } catch (error: any) { toast.error(error?.message || "Could not load closure checklist"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [project._id]);
  const toggle = async (item: Checklist["items"][number], notes = item.notes) => {
    setBusy(true);
    try { setChecklist((await projectsApi.updateClosureChecklistItem(project._id, item.code, !item.completed, notes)).data); }
    catch (error: any) { toast.error(error?.message || "Could not update checklist"); }
    finally { setBusy(false); }
  };
  const close = async () => { setBusy(true); try { await projectsApi.close(project._id); toast.success("Project closed"); onChanged(); await load(); } catch (error: any) { toast.error(error?.message || "Complete closure requirements before closing"); } finally { setBusy(false); } };
  const reopen = async () => { setBusy(true); try { await projectsApi.reopen(project._id); toast.success("Project reopened; closure signoffs were reset"); onChanged(); await load(); } catch (error: any) { toast.error(error?.message || "Could not reopen project"); } finally { setBusy(false); } };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Project closure</h3><p className="text-sm text-muted-foreground">Close is enabled after work, milestones, material requests, and required signoffs are complete.</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    {checklist && <>
      <div className="rounded-lg border p-4"><div className="mb-3 flex justify-between text-sm"><span>Checklist progress</span><span>{checklist.counts.completed_items}/{checklist.counts.required_items} signoffs complete</span></div><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-emerald-500" style={{ width: `${checklist.counts.required_items ? checklist.counts.completed_items / checklist.counts.required_items * 100 : 100}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{checklist.counts.open_tasks} open task(s), {checklist.counts.open_milestones} open milestone(s), {checklist.counts.open_requisitions} open material request(s)</p></div>
      <div className="divide-y rounded-lg border">{checklist.items.map((item) => <div key={item.code} className="flex flex-wrap items-center gap-3 p-3"><button type="button" aria-label={`${item.completed ? "Reopen" : "Complete"} ${item.label}`} disabled={busy || !item.required} onClick={() => void toggle(item)} className="text-emerald-600">{item.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted-foreground" />}</button><div className="min-w-52 flex-1"><p className="text-sm font-medium">{item.label} {!item.required && <span className="ml-1 text-xs text-muted-foreground">Not applicable</span>}</p>{item.completed && item.completed_by && <p className="text-xs text-muted-foreground">Signed off by {item.completed_by}{item.completed_at ? ` on ${new Date(item.completed_at).toLocaleDateString()}` : ""}</p>}</div><Input className="max-w-sm" value={item.notes || ""} placeholder="Optional signoff note" disabled={busy || !item.required} onChange={(event) => setChecklist((current) => current ? { ...current, items: current.items.map((row) => row.code === item.code ? { ...row, notes: event.target.value } : row) } : current)} onBlur={() => { const latest = checklist.items.find((row) => row.code === item.code); if (latest?.completed && latest.required) void projectsApi.updateClosureChecklistItem(project._id, item.code, true, latest.notes).then((response) => setChecklist(response.data)).catch((error: any) => toast.error(error?.message || "Could not save note")); }} /></div>)}</div>
      {checklist.blockers.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20"><h4 className="mb-2 font-semibold">Items required before closure</h4><ul className="list-inside list-disc space-y-1 text-sm">{checklist.blockers.map((item) => <li key={item.code}>{item.label}</li>)}</ul></div>}
      <div className="flex justify-end">{project.status === "completed" || project.status === "cancelled" ? <Button variant="outline" onClick={() => void reopen()} disabled={busy}>Reopen project</Button> : <Button onClick={() => void close()} disabled={busy || !checklist.can_close}>{busy ? "Saving…" : "Close project"}</Button>}</div>
    </>}
    {!checklist && !loading && <p className="text-sm text-muted-foreground">Closure checklist could not be loaded.</p>}
  </div>;
}
