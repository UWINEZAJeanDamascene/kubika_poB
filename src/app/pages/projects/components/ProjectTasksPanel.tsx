import { useEffect, useState } from "react";
import { projectsApi, type Project, type ProjectSetupOptions } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, RefreshCw, CheckCircle2 } from "lucide-react";

type TaskDraft = {
  name: string;
  description: string;
  manager_id: string;
  status: Project["status"];
  priority: Project["priority"];
  start_date: string;
  end_date: string;
  estimated_hours: number;
  actual_hours: number;
  progress_percent: number;
  acceptance_criteria: string;
  depends_on_ids: string[];
};

const blankTask = (): TaskDraft => ({
  name: "", description: "", manager_id: "", status: "planned", priority: "medium",
  start_date: "", end_date: "", estimated_hours: 0, actual_hours: 0,
  progress_percent: 0, acceptance_criteria: "", depends_on_ids: [],
});

const dateInput = (value?: string) => value ? new Date(value).toISOString().slice(0, 10) : "";

export default function ProjectTasksPanel({ project }: { project: Project }) {
  const [tasks, setTasks] = useState<Project[]>([]);
  const [setup, setSetup] = useState<ProjectSetupOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(blankTask());

  const refresh = async () => {
    try {
      setLoading(true);
      const [taskResponse, setupResponse] = await Promise.all([projectsApi.getTasks(project._id), projectsApi.getSetupOptions()]);
      setTasks(taskResponse.data || []);
      setSetup(setupResponse.data);
    } catch (error: any) {
      toast.error(error?.message || "Could not load project tasks");
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [project._id]);

  const openCreate = () => { setEditing(null); setDraft(blankTask()); setOpen(true); };
  const openEdit = (task: Project) => {
    setEditing(task);
    setDraft({
      name: task.name, description: task.description || "", manager_id: typeof task.manager_id === "string" ? task.manager_id : task.manager_id?._id || "",
      status: task.status, priority: task.priority, start_date: dateInput(task.start_date), end_date: dateInput(task.end_date),
      estimated_hours: task.estimated_hours || 0, actual_hours: task.actual_hours || 0, progress_percent: task.progress_percent || 0,
      acceptance_criteria: task.acceptance_criteria || "", depends_on_ids: task.depends_on_ids || [],
    });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return toast.error("Task name is required");
    setSaving(true);
    try {
      const payload = {
        ...draft,
        manager_id: draft.manager_id || undefined,
        start_date: draft.start_date || undefined,
        end_date: draft.end_date || undefined,
        project_category: project.project_category,
        client_id: typeof project.client_id === "string" ? project.client_id : project.client_id?._id,
        currency_code: project.currency_code,
      };
      if (editing) {
        await projectsApi.update(editing._id, payload);
        toast.success("Task updated");
      } else {
        await projectsApi.createTask(project._id, payload);
        toast.success("Task created");
      }
      setOpen(false);
      await refresh();
    } catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not save task"); }
    finally { setSaving(false); }
  };

  const setStatus = async (task: Project, status: Project["status"]) => {
    try {
      await projectsApi.update(task._id, { status, progress_percent: status === "completed" ? 100 : task.progress_percent });
      await refresh();
      toast.success(status === "completed" ? "Task completed" : "Task status updated");
    } catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not update task"); }
  };

  const ownerName = (task: Project) => {
    if (!task.manager_id) return "Unassigned";
    const id = typeof task.manager_id === "string" ? task.manager_id : task.manager_id._id;
    const user = setup?.users.find((item) => item._id === id);
    return user?.name || (typeof task.manager_id === "string" ? "Assigned user" : `${task.manager_id.firstName} ${task.manager_id.lastName}`);
  };

  return <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-semibold text-slate-950 dark:text-white">Tasks</h3><p className="text-sm text-slate-500 dark:text-slate-400">Assign work, track due dates and estimates, and record completion.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          {project.type !== "task" && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Task</Button>}
        </div>
      </div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading tasks…</p> : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-700">No tasks yet. Add a task to start tracking assigned work.</div>
      ) : <><div className="space-y-3 xl:hidden">{tasks.map((task) => <article key={task._id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold dark:text-white">{task.name}</p><p className="mt-1 font-mono text-xs text-slate-500">{task.wbs_code}</p></div><Badge variant="outline" className="shrink-0 capitalize">{task.status.replaceAll("_", " ")}</Badge></div>{task.depends_on_ids?.length > 0 && <p className="mt-2 text-xs text-slate-500">Depends on {task.depends_on_ids.length} task(s)</p>}<div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800"><div><p className="text-slate-500">Owner</p><p className="mt-1 text-sm dark:text-slate-200">{ownerName(task)}</p></div><div><p className="text-slate-500">Due date</p><p className="mt-1 text-sm dark:text-slate-200">{task.end_date ? new Date(task.end_date).toLocaleDateString() : "—"}</p></div><div><p className="text-slate-500">Actual / estimated hours</p><p className="mt-1 text-sm dark:text-slate-200">{task.actual_hours || 0} / {task.estimated_hours || 0}h</p>{Number(task.timesheet_hours || 0) > 0 && <p className="mt-1 text-xs text-slate-500">{Number(task.timesheet_hours).toFixed(2)}h approved timesheets</p>}</div><div><p className="text-slate-500">Progress</p><div className="mt-2 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"><div className="h-full bg-blue-600" style={{width: `${Math.min(100, task.progress_percent || 0)}%`}}/></div><span className="text-xs">{Number(task.progress_percent || 0).toFixed(0)}%</span></div></div></div>{task.timesheet_labor_cost_by_currency && Object.keys(task.timesheet_labor_cost_by_currency).length > 0 && <p className="mt-2 text-xs text-slate-500">Labor: {Object.entries(task.timesheet_labor_cost_by_currency).map(([currency, amount]) => `${currency} ${Number(amount).toLocaleString()}`).join(" · ")}</p>}<div className="mt-3 flex gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"><Button variant="outline" size="sm" className="min-h-10 flex-1" onClick={() => openEdit(task)}><Pencil className="mr-2 h-4 w-4"/>Edit task</Button>{task.status !== "completed" && <Button variant="outline" size="sm" className="min-h-10 flex-1" onClick={() => void setStatus(task, "completed")}><CheckCircle2 className="mr-2 h-4 w-4"/>Complete</Button>}</div></article>)}</div><div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 xl:block"><table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="p-3">Task</th><th className="p-3">Owner</th><th className="p-3">Status</th><th className="p-3">Due</th><th className="p-3">Hours</th><th className="p-3">Progress</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{tasks.map((task) => <tr key={task._id} className="border-t border-slate-200 dark:border-slate-800">
          <td className="p-3"><div className="font-medium text-slate-950 dark:text-white">{task.name}</div><div className="font-mono text-xs text-slate-500">{task.wbs_code}</div>{task.depends_on_ids?.length > 0 && <div className="mt-1 text-xs text-slate-500">Depends on {task.depends_on_ids.length} task(s)</div>}</td>
          <td className="p-3">{ownerName(task)}</td>
          <td className="p-3"><Badge variant="outline">{task.status.replaceAll("_", " ")}</Badge></td>
          <td className="p-3">{task.end_date ? new Date(task.end_date).toLocaleDateString() : "—"}</td>
          <td className="p-3">{task.actual_hours || 0} / {task.estimated_hours || 0}h{Number(task.timesheet_hours || 0) > 0 && <div className="mt-1 text-xs text-slate-500">{Number(task.timesheet_hours).toFixed(2)}h approved timesheets</div>}{task.timesheet_labor_cost_by_currency && Object.keys(task.timesheet_labor_cost_by_currency).length > 0 && <div className="mt-1 text-xs text-slate-500">{Object.entries(task.timesheet_labor_cost_by_currency).map(([currency, amount]) => `${currency} ${Number(amount).toLocaleString()}`).join(" · ")}</div>}</td>
          <td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-20 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"><div className="h-full bg-blue-600" style={{ width: `${Math.min(100, task.progress_percent || 0)}%` }} /></div>{Number(task.progress_percent || 0).toFixed(0)}%</div></td>
          <td className="p-3"><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => openEdit(task)}><Pencil className="h-3.5 w-3.5" /></Button>{task.status !== "completed" && <Button variant="outline" size="sm" onClick={() => void setStatus(task, "completed")} title="Complete task"><CheckCircle2 className="h-3.5 w-3.5" /></Button>}</div></td>
        </tr>)}</tbody>
      </table></div></>}
    </div>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Edit Task" : "Create Task"}</DialogTitle><DialogDescription>Set ownership, schedule, dependencies, and completion criteria for this task.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>Task name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Assignee</Label><Select value={draft.manager_id || "__none__"} onValueChange={(value) => setDraft({ ...draft, manager_id: value === "__none__" ? "" : value })}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="__none__">Unassigned</SelectItem>{(setup?.users || []).map((user) => <SelectItem key={user._id} value={user._id}>{user.name} · {user.email}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Priority</Label><Select value={draft.priority} onValueChange={(value: Project["priority"]) => setDraft({ ...draft, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "critical"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Status</Label><Select value={draft.status} onValueChange={(value: Project["status"]) => setDraft({ ...draft, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft", "planned", "planning", "active", "blocked", "on_hold", "completed", "cancelled"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={draft.progress_percent} onChange={(e) => setDraft({ ...draft, progress_percent: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Start date</Label><Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Due date</Label><Input type="date" min={draft.start_date || undefined} value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Estimated hours</Label><Input type="number" min={0} step="0.25" value={draft.estimated_hours} onChange={(e) => setDraft({ ...draft, estimated_hours: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Actual hours</Label><Input type="number" min={0} step="0.25" value={draft.actual_hours} onChange={(e) => setDraft({ ...draft, actual_hours: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-2"><Label>Depends on</Label><select multiple value={draft.depends_on_ids} onChange={(e) => setDraft({ ...draft, depends_on_ids: Array.from(e.target.selectedOptions, (option) => option.value) })} className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm">{tasks.filter((task) => task._id !== editing?._id).map((task) => <option key={task._id} value={task._id}>{task.wbs_code} · {task.name} ({task.status})</option>)}</select><p className="text-xs text-slate-500">Use Ctrl or Command to select multiple tasks. A task cannot be completed until its dependencies are complete.</p></div>
          <div className="space-y-2"><Label>Acceptance criteria</Label><Textarea value={draft.acceptance_criteria} onChange={(e) => setDraft({ ...draft, acceptance_criteria: e.target.value })} rows={3} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Create Task"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
