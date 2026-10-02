import { useEffect, useState } from "react";
import { projectsApi, type Project, type ProjectMilestone, type ProjectMilestoneInput, type ProjectSetupOptions } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, RefreshCw } from "lucide-react";

const empty = (): ProjectMilestoneInput => ({ name: "", description: "", status: "planned", priority: "medium", progress_percent: 0, depends_on_ids: [] });
const dateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";

export default function ProjectMilestonesPanel({ project }: { project: Project }) {
  const [rows, setRows] = useState<ProjectMilestone[]>([]);
  const [setup, setSetup] = useState<ProjectSetupOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [draft, setDraft] = useState<ProjectMilestoneInput>(empty());

  const refresh = async () => {
    setLoading(true);
    try {
      const [milestones, options] = await Promise.all([projectsApi.getMilestones(project._id), projectsApi.getSetupOptions()]);
      setRows(milestones.data || []); setSetup(options.data);
    } catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not load milestones"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [project._id]);

  const openNew = () => { setEditing(null); setDraft(empty()); setOpen(true); };
  const openExisting = (row: ProjectMilestone) => {
    setEditing(row);
    setDraft({ name: row.name, description: row.description, assignee_id: row.assignee_id || "", status: row.status, priority: row.priority, due_date: dateInput(row.due_date), progress_percent: row.progress_percent, depends_on_ids: row.depends_on_ids || [] });
    setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name?.trim()) return toast.error("Milestone name is required");
    setSaving(true);
    try {
      const payload = { ...draft, assignee_id: draft.assignee_id || null, due_date: draft.due_date || null };
      if (editing) await projectsApi.updateMilestone(project._id, editing._id, payload);
      else await projectsApi.createMilestone(project._id, payload);
      toast.success(editing ? "Milestone updated" : "Milestone created"); setOpen(false); await refresh();
    } catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not save milestone"); }
    finally { setSaving(false); }
  };
  const assigneeName = (id?: string | null) => setup?.users.find((user) => user._id === id)?.name || (id ? "Assigned user" : "Unassigned");

  return <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-950 dark:text-white">Milestones</h3><p className="text-sm text-slate-500 dark:text-slate-400">Track key delivery points, owners, dependencies, and progress.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add Milestone</Button></div></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading milestones…</p> : rows.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-700">No milestones yet. Add a delivery point to track project progress.</div> : <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="p-3">Milestone</th><th className="p-3">Owner</th><th className="p-3">Status</th><th className="p-3">Due</th><th className="p-3">Progress</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row._id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3"><div className="font-medium text-slate-950 dark:text-white">{row.name}</div>{row.depends_on_ids.length > 0 && <div className="text-xs text-slate-500">Depends on {row.depends_on_ids.length} milestone(s)</div>}</td><td className="p-3">{assigneeName(row.assignee_id)}</td><td className="p-3 capitalize">{row.status.replaceAll("_", " ")}</td><td className="p-3">{row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}</td><td className="p-3">{Number(row.progress_percent).toFixed(0)}%</td><td className="p-3"><Button variant="outline" size="sm" onClick={() => openExisting(row)}><Pencil className="h-3.5 w-3.5" /></Button></td></tr>)}</tbody></table></div>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Edit Milestone" : "Create Milestone"}</DialogTitle><DialogDescription>Set an owner, due date, workflow status, and prerequisite milestones.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4">
      <div className="space-y-2"><Label>Name</Label><Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div><div className="space-y-2"><Label>Description</Label><Textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Assignee</Label><Select value={draft.assignee_id || "__none__"} onValueChange={(value) => setDraft({ ...draft, assignee_id: value === "__none__" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Unassigned</SelectItem>{(setup?.users || []).map((user) => <SelectItem key={user._id} value={user._id}>{user.name} · {user.email}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={draft.status || "planned"} onValueChange={(value: ProjectMilestone["status"]) => setDraft({ ...draft, status: value, progress_percent: value === "completed" ? 100 : draft.progress_percent })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["planned", "active", "blocked", "completed", "cancelled"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Priority</Label><Select value={draft.priority || "medium"} onValueChange={(value: ProjectMilestone["priority"]) => setDraft({ ...draft, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "critical"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Due date</Label><Input type="date" value={draft.due_date || ""} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} /></div><div className="space-y-2"><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={draft.progress_percent || 0} onChange={(e) => setDraft({ ...draft, progress_percent: Number(e.target.value) })} /></div></div>
      <div className="space-y-2"><Label>Depends on</Label><select multiple value={draft.depends_on_ids || []} onChange={(e) => setDraft({ ...draft, depends_on_ids: Array.from(e.target.selectedOptions, (option) => option.value) })} className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm">{rows.filter((row) => row._id !== editing?._id).map((row) => <option key={row._id} value={row._id}>{row.name} ({row.status})</option>)}</select><p className="text-xs text-slate-500">A milestone cannot be completed until its prerequisites are complete.</p></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Create Milestone"}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </>;
}
