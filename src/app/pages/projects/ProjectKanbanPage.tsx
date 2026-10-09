import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { projectsApi, type Project } from "@/lib/api";
import { Layout } from "@/app/layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ProjectTaskCompletionDialog } from "./components/ProjectTaskCompletionDialog";

const columns: Array<{ id: Project["status"][]; title: string }> = [
  { id: ["draft", "planned", "planning"], title: "To do" },
  { id: ["active"], title: "In progress" },
  { id: ["blocked", "on_hold"], title: "Blocked / on hold" },
  { id: ["completed", "cancelled"], title: "Done / cancelled" },
];

export default function ProjectKanbanPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [completionTask, setCompletionTask] = useState<Project | null>(null);
  const refresh = async () => { setLoading(true); try { const response = await projectsApi.getAll({ type: "task" }); setTasks(response.data || []); } catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not load project tasks"); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  const changeStatus = async (task: Project, status: Project["status"], actualHours?: number) => {
    if (status === "completed" && Number(task.timesheet_hours || 0) <= 0 && actualHours === undefined) {
      setCompletionTask(task);
      return;
    }
    setBusy(task._id);
    try {
      await projectsApi.update(task._id, {
        status,
        progress_percent: status === "completed" ? 100 : task.progress_percent,
        ...(actualHours === undefined ? {} : { actual_hours: actualHours }),
      });
      await refresh();
      setCompletionTask(null);
    }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not update task"); }
    finally { setBusy(null); }
  };
  return <Layout><div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => navigate("/projects")}><ArrowLeft className="mr-2 h-4 w-4" />Projects</Button><h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Project task board</h1><p className="text-sm text-slate-500 dark:text-slate-400">Move tasks through their workflow and see ownership and due dates.</p></div><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    {loading ? <div className="py-16 text-center text-slate-500">Loading tasks…</div> : <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">{columns.map((column) => { const items = tasks.filter((task) => column.id.includes(task.status)); return <section key={column.title} className="min-h-64 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-800 dark:text-slate-100">{column.title}</h2><span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">{items.length}</span></div><div className="space-y-3">{items.map((task) => <article key={task._id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950"><button className="w-full text-left" onClick={() => navigate(`/projects/${task._id}`)}><div className="font-medium text-slate-950 dark:text-white">{task.name}</div><div className="mt-1 font-mono text-xs text-slate-500">{task.wbs_code}</div></button><div className="flex justify-between gap-2 text-xs text-slate-500"><span>{typeof task.manager_id === "object" ? `${task.manager_id.firstName} ${task.manager_id.lastName}` : task.manager_id ? "Assigned" : "Unassigned"}</span><span>{task.end_date ? new Date(task.end_date).toLocaleDateString() : "No due date"}</span></div><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded bg-slate-200 dark:bg-slate-800"><div className="h-full rounded bg-blue-600" style={{ width: `${Math.min(100, Number(task.progress_percent || 0))}%` }} /></div><span className="text-xs tabular-nums">{Number(task.progress_percent || 0).toFixed(0)}%</span></div><Select disabled={busy === task._id} value={task.status} onValueChange={(status: Project["status"]) => void changeStatus(task, status)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["planned", "active", "blocked", "on_hold", "completed", "cancelled"].map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></article>)}{items.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No tasks here</p>}</div></section>; })}</div>}
    <ProjectTaskCompletionDialog
      task={completionTask}
      saving={Boolean(completionTask && busy === completionTask._id)}
      onCancel={() => setCompletionTask(null)}
      onConfirm={(actualHours) => { if (completionTask) void changeStatus(completionTask, "completed", actualHours); }}
    />
  </div></Layout>;
}
