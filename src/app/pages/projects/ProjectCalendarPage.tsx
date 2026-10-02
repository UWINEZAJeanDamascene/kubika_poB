import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { projectsApi, type ProjectCalendarItem } from "@/lib/api";
import { Layout } from "@/app/layout/Layout";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const sameDayKey = (value: string) => dateKey(new Date(value));

export default function ProjectCalendarPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [items, setItems] = useState<ProjectCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchItems = async () => {
    const from = dateKey(month);
    const to = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    setLoading(true);
    try { const response = await projectsApi.getCalendarItems(from, to); setItems(response.data || []); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not load project calendar"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void fetchItems(); }, [month]);
  const weeks = useMemo(() => {
    const firstWeekday = (month.getDay() + 6) % 7;
    const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = Array(firstWeekday).fill(null);
    for (let day = 1; day <= totalDays; day++) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    while (cells.length % 7) cells.push(null);
    const result: Array<Array<Date | null>> = [];
    for (let index = 0; index < cells.length; index += 7) result.push(cells.slice(index, index + 7));
    return result;
  }, [month]);
  const itemsByDay = useMemo(() => items.reduce<Record<string, ProjectCalendarItem[]>>((groups, item) => { const key = sameDayKey(item.date); (groups[key] ||= []).push(item); return groups; }, {}), [items]);
  return <Layout><div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => navigate("/projects")}><ArrowLeft className="mr-2 h-4 w-4" />Projects</Button><h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Project calendar</h1><p className="text-sm text-slate-500 dark:text-slate-400">Task and milestone due dates across your projects.</p></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button><div className="min-w-36 text-center font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div><Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" onClick={() => void fetchItems()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><div className="min-w-[800px]"><div className="grid grid-cols-7 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <div key={day} className="border-b border-r p-3 dark:border-slate-800">{day}</div>)}</div>{loading ? <div className="py-20 text-center text-sm text-slate-500">Loading calendar…</div> : <div>{weeks.map((week, index) => <div key={index} className="grid grid-cols-7">{week.map((day, dayIndex) => { const dayItems = day ? itemsByDay[dateKey(day)] || [] : []; return <div key={dayIndex} className="min-h-32 border-b border-r p-2 dark:border-slate-800"><div className={`mb-2 text-xs ${day?.getMonth() === month.getMonth() ? "text-slate-700 dark:text-slate-200" : "text-transparent"}`}>{day?.getDate() || " "}</div><div className="space-y-1">{dayItems.map((item) => <button key={`${item.type}-${item.id}`} onClick={() => item.project_id && navigate(`/projects/${item.project_id}`)} title={`${item.title} · ${item.project_name}`} className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] ${item.type === "milestone" ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"}`}><span className="font-semibold">{item.type === "milestone" ? "◆ " : "• "}</span>{item.title}</button>)}</div></div>; })}</div>)}</div>}</div></div>
    <div className="flex gap-4 text-xs text-slate-500"><span>• Task due date</span><span>◆ Milestone due date</span><span>{items.length} item(s) this month</span></div>
  </div></Layout>;
}
