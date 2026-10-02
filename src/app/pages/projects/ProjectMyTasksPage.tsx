import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { projectsApi, type Project } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Layout } from "@/app/layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ProjectMyTasksPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = async () => {
    if (!user?._id) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    try { const response = await projectsApi.getAll({ type: "task", manager_id: user._id }); setTasks(response.data || []); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not load your tasks"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [user?._id]);
  const updateStatus = async (task: Project, status: Project["status"]) => {
    setBusy(task._id);
    try { await projectsApi.update(task._id, { status, progress_percent: status === "completed" ? 100 : task.progress_percent }); await refresh(); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not update task"); }
    finally { setBusy(null); }
  };
  const sorted = [...tasks].sort((a, b) => (a.end_date || "9999").localeCompare(b.end_date || "9999"));
  return <Layout><div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => navigate("/projects")}><ArrowLeft className="mr-2 h-4 w-4" />Projects</Button><h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">My tasks</h1><p className="text-sm text-slate-500 dark:text-slate-400">Tasks assigned to {user?.name || "you"}, sorted by due date.</p></div><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    {loading ? <div className="py-16 text-center text-slate-500">Loading your tasks…</div> : sorted.length === 0 ? <div className="rounded-xl border border-dashed p-12 text-center text-sm text-slate-500 dark:border-slate-700">No project tasks are assigned to you.</div> : <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[800px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="p-3">Task</th><th className="p-3">Project / WBS</th><th className="p-3">Due date</th><th className="p-3">Priority</th><th className="p-3">Progress</th><th className="p-3">Workflow</th></tr></thead><tbody>{sorted.map((task) => { const overdue = task.end_date && new Date(task.end_date) < new Date() && !["completed", "cancelled"].includes(task.status); return <tr key={task._id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3"><button className="text-left font-medium text-blue-700 hover:underline dark:text-blue-300" onClick={() => navigate(`/projects/${task._id}`)}>{task.name}</button><div className="font-mono text-xs text-slate-500">{task.wbs_code}</div></td><td className="p-3">{typeof task.parent_id === "object" ? task.parent_id.name : task.project_code}</td><td className={`p-3 ${overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>{task.end_date ? new Date(task.end_date).toLocaleDateString() : "No due date"}{overdue ? " · Overdue" : ""}</td><td className="p-3 capitalize">{task.priority}</td><td className="p-3">{Number(task.progress_percent || 0).toFixed(0)}%</td><td className="p-3"><Select disabled={busy === task._id} value={task.status} onValueChange={(status: Project["status"]) => void updateStatus(task, status)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["planned", "active", "blocked", "on_hold", "completed", "cancelled"].map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></td></tr>; })}</tbody></table></div>}
  </div></Layout>;
}
