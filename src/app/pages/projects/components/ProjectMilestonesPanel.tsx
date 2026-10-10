import { useEffect, useState } from "react";
import { projectsApi, type Project, type ProjectMilestone, type ProjectMilestoneInput, type ProjectSetupOptions } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, RefreshCw } from "lucide-react";

const empty = (): ProjectMilestoneInput => ({
  name: "",
  description: "",
  status: "planned",
  priority: "medium",
  progress_percent: 0,
  depends_on_ids: [],
  task_ids: [],
});
const dateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";

export default function ProjectMilestonesPanel({ project }: { project: Project }) {
  const [rows, setRows] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<Project[]>([]);
  const [setup, setSetup] = useState<ProjectSetupOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [draft, setDraft] = useState<ProjectMilestoneInput>(empty());

  const refresh = async () => {
    setLoading(true);
    try {
      const [milestones, options, taskResponse] = await Promise.all([
        projectsApi.getMilestones(project._id),
        projectsApi.getSetupOptions(),
        projectsApi.getTasks(project._id),
      ]);
      setRows(milestones.data || []);
      setSetup(options.data);
      setTasks(taskResponse.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Could not load milestones");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, [project._id]);

  const openNew = () => { setEditing(null); setDraft(empty()); setOpen(true); };
  const openExisting = (row: ProjectMilestone) => {
    setEditing(row);
    setDraft({
      name: row.name,
      description: row.description,
      assignee_id: row.assignee_id || "",
      status: row.status,
      priority: row.priority,
      due_date: dateInput(row.due_date),
      progress_percent: row.progress_percent,
      depends_on_ids: row.depends_on_ids || [],
      task_ids: row.task_ids || [],
    });
    setOpen(true);
  };

  const selectedTaskIds = draft.task_ids || [];
  const linkedProgress = (() => {
    if (!selectedTaskIds.length) return Number(draft.progress_percent || 0);
    const selectedTasks = selectedTaskIds.map((id) => tasks.find((task) => task._id === id));
    const weights = selectedTasks.map((task) => task && Number(task.estimated_hours) > 0 ? Number(task.estimated_hours) : 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const earnedWeight = selectedTasks.reduce((sum, task, index) => {
      const progress = task?.status === "completed" ? 100 : task?.status === "cancelled" ? 0 : Number(task?.progress_percent || 0);
      return sum + weights[index] * progress;
    }, 0);
    return totalWeight ? Math.round(earnedWeight / totalWeight * 100) / 100 : 0;
  })();
  const toggleTask = (taskId: string, checked: boolean) => {
    setDraft({
      ...draft,
      task_ids: checked
        ? [...new Set([...selectedTaskIds, taskId])]
        : selectedTaskIds.filter((id) => id !== taskId),
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name?.trim()) return toast.error("Milestone name is required");
    setSaving(true);
    try {
      const payload = {
        ...draft,
        progress_percent: selectedTaskIds.length ? undefined : draft.progress_percent,
        task_ids: selectedTaskIds,
        assignee_id: draft.assignee_id || null,
        due_date: draft.due_date || null,
      };
      if (editing) await projectsApi.updateMilestone(project._id, editing._id, payload);
      else await projectsApi.createMilestone(project._id, payload);
      toast.success(editing ? "Milestone updated" : "Milestone created");
      setOpen(false);
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Could not save milestone");
    } finally {
      setSaving(false);
    }
  };
  const assigneeName = (id?: string | null) => setup?.users.find((user) => user._id === id)?.name || (id ? "Assigned user" : "Unassigned");
  const toggleProgress = (progress: number) => `${Math.min(100, Math.max(0, progress)).toFixed(0)}%`;

  return <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">Milestones</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track key delivery points, owners, dependencies, and progress.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add Milestone</Button>
        </div>
      </div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading milestones…</p> : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-700">No milestones yet. Add a delivery point to track project progress.</div>
      ) : <>
        <div className="space-y-3 xl:hidden">
          {rows.map((row) => (
            <article key={row._id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold dark:text-white">{row.name}</p>
                  {row.depends_on_ids.length > 0 && <p className="mt-1 text-xs text-slate-500">Depends on {row.depends_on_ids.length} milestone(s)</p>}
                  {!!row.task_ids?.length && <p className="mt-1 text-xs text-slate-500">Progress from {row.task_ids.length} linked task(s)</p>}
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">{row.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div><p className="text-slate-500">Owner</p><p className="mt-1 text-sm dark:text-slate-200">{assigneeName(row.assignee_id)}</p></div>
                <div><p className="text-slate-500">Due date</p><p className="mt-1 text-sm dark:text-slate-200">{row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}</p></div>
                <div className="col-span-2">
                  <div className="flex justify-between text-slate-500"><span>Progress</span><span>{toggleProgress(Number(row.progress_percent))}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"><div className="h-full bg-violet-600" style={{ width: `${Math.min(100, Number(row.progress_percent) || 0)}%` }} /></div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 min-h-10 w-full" onClick={() => openExisting(row)}><Pencil className="mr-2 h-4 w-4" />Edit milestone</Button>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 xl:block">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="p-3">Milestone</th><th className="p-3">Owner</th><th className="p-3">Status</th><th className="p-3">Due</th><th className="p-3">Progress</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3">
                    <div className="font-medium text-slate-950 dark:text-white">{row.name}</div>
                    {row.depends_on_ids.length > 0 && <div className="text-xs text-slate-500">Depends on {row.depends_on_ids.length} milestone(s)</div>}
                    {!!row.task_ids?.length && <div className="text-xs text-slate-500">From {row.task_ids.length} linked task(s)</div>}
                  </td>
                  <td className="p-3">{assigneeName(row.assignee_id)}</td>
                  <td className="p-3 capitalize">{row.status.replaceAll("_", " ")}</td>
                  <td className="p-3">{row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}</td>
                  <td className="p-3">{toggleProgress(Number(row.progress_percent))}</td>
                  <td className="p-3"><Button variant="outline" size="sm" onClick={() => openExisting(row)}><Pencil className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Milestone" : "Create Milestone"}</DialogTitle>
          <DialogDescription>Link tasks to calculate effort-weighted progress automatically. Confirm completion manually after the linked work reaches 100%.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={draft.assignee_id || "__none__"} onValueChange={(value) => setDraft({ ...draft, assignee_id: value === "__none__" ? "" : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Unassigned</SelectItem>{(setup?.users || []).map((user) => <SelectItem key={user._id} value={user._id}>{user.name} · {user.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draft.status || "planned"} onValueChange={(value: ProjectMilestone["status"]) => setDraft({ ...draft, status: value, progress_percent: value === "completed" ? 100 : draft.progress_percent })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["planned", "active", "blocked", "completed", "cancelled"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={draft.priority || "medium"} onValueChange={(value: ProjectMilestone["priority"]) => setDraft({ ...draft, priority: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high", "critical"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={draft.due_date || ""} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Linked tasks</Label>
            {tasks.length ? (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                {selectedTaskIds.filter((id) => !tasks.some((task) => task._id === id)).map((id) => (
                  <label key={id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30">
                    <input type="checkbox" checked onChange={(event) => toggleTask(id, event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    <span>Unavailable linked task · {id}</span>
                  </label>
                ))}
                {tasks.map((task) => (
                  <label key={task._id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={selectedTaskIds.includes(task._id)} disabled={task.status === "cancelled" && !selectedTaskIds.includes(task._id)} onChange={(event) => toggleTask(task._id, event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    <span className="min-w-0 flex-1">{task.wbs_code} · {task.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{task.status === "cancelled" ? "Cancelled · " : ""}{Number(task.estimated_hours || 0) > 0 ? `${task.estimated_hours}h · ` : ""}{toggleProgress(task.status === "cancelled" ? 0 : Number(task.progress_percent || 0))}</span>
                  </label>
                ))}
              </div>
            ) : <p className="rounded-md border border-dashed p-3 text-sm text-slate-500">No project tasks yet. You can still track this milestone manually.</p>}
            <p className="text-xs text-slate-500">Progress uses estimated task hours as weights. Tasks without estimates count equally. Project tasks only.</p>
          </div>
          {selectedTaskIds.length ? (
            <div className="rounded-md bg-violet-50 p-3 text-sm text-violet-950 dark:bg-violet-950/30 dark:text-violet-100">
              Automatically calculated progress: <strong>{toggleProgress(linkedProgress)}</strong>. To complete the milestone, linked tasks must first reach 100%.
            </div>
          ) : (
            <div className="space-y-2"><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={draft.progress_percent || 0} onChange={(e) => setDraft({ ...draft, progress_percent: Number(e.target.value) })} /><p className="text-xs text-slate-500">Manual progress is available when no tasks are linked.</p></div>
          )}
          <div className="space-y-2">
            <Label>Depends on</Label>
            <select multiple value={draft.depends_on_ids || []} onChange={(e) => setDraft({ ...draft, depends_on_ids: Array.from(e.target.selectedOptions, (option) => option.value) })} className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm">
              {rows.filter((row) => row._id !== editing?._id).map((row) => <option key={row._id} value={row._id}>{row.name} ({row.status})</option>)}
            </select>
            <p className="text-xs text-slate-500">A milestone cannot be completed until its prerequisites are complete.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Create Milestone"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
