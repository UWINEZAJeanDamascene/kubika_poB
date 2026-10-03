import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { projectsApi, timesheetsApi } from "@/lib/api";
import { employeeApi } from "@/lib/api.employees";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

const ACTIVITY_TYPES = [
  { value: "production", label: "Production" },
  { value: "assembly", label: "Assembly" },
  { value: "quality_control", label: "Quality Control" },
  { value: "packing_warehouse", label: "Packing / Warehouse" },
  { value: "administration", label: "Administration" },
  { value: "sales_support", label: "Sales Support" },
  { value: "other", label: "Other" },
];

export default function TimesheetFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== "new";

  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [lines, setLines] = useState<any[]>([{ date: "", hoursWorked: "", activityType: "", notes: "" }]);
  const { data: projectTasks } = useQuery({ queryKey: ["project-tasks", "timesheet"], queryFn: async () => (await projectsApi.getAll({ type: "task" })).data || [] });

  const { data: employees } = useQuery({
    queryKey: ["employees", "active"],
    queryFn: async () => {
      const res = await employeeApi.getAll({ status: "active" });
      return res.data || [];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["timesheet", id],
    queryFn: async () => {
      if (!isEdit) return null;
      const res = await timesheetsApi.getById(id!);
      return res.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      const emp = existing.employee as any;
      setEmployeeId(emp?._id || emp || "");
      setPeriod(`${existing.period?.year}-${String(existing.period?.month).padStart(2, "0")}`);
      setLines((existing.lines || []).map((l: any) => ({
        ...l,
        date: l.date ? l.date.split("T")[0] : "",
        hoursWorked: String(l.hoursWorked),
      })));
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [year, month] = period.split("-").map(Number);
      const payload = {
        employeeId,
        period: { month, year },
        lines: lines.map((l) => ({
          date: l.date,
          hoursWorked: parseFloat(l.hoursWorked) || 0,
          activityType: l.activityType,
          notes: l.notes || undefined,
          projectTaskId: l.projectTaskId || undefined,
        })).filter((l) => l.date && l.hoursWorked > 0 && l.activityType),
      };
      if (isEdit) {
        return timesheetsApi.update(id!, payload);
      }
      return timesheetsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Timesheet updated" : "Timesheet created");
      navigate("/timesheets");
    },
    onError: (err: any) => toast.error(err.message || "Save failed"),
  });

  const addLine = () => setLines([...lines, { date: "", hoursWorked: "", activityType: "", notes: "" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string) => {
    const next = [...lines];
    next[i][field] = value;
    setLines(next);
  };

  const totalHours = lines.reduce((s, l) => s + (parseFloat(l.hoursWorked) || 0), 0);

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/timesheets")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{isEdit ? "Edit Timesheet" : "New Timesheet"}</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Employee & Period</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees || []).map((e: any) => (
                    <SelectItem key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Work Entries</CardTitle><p className="mt-1 text-xs text-slate-500">Approved task hours are costed from the employee salary effective on the work date, using 173.33 standard hours per month.</p></div><span className="text-sm text-slate-500">Total: {totalHours.toFixed(1)} hrs</span></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 items-end border p-3 rounded-md bg-slate-50 dark:bg-slate-900">
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={line.date} onChange={(e) => updateLine(i, "date", e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">Hours</Label>
                  <Input type="number" min={0} max={24} step={0.5} value={line.hoursWorked} onChange={(e) => updateLine(i, "hoursWorked", e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">Activity</Label>
                  <Select value={line.activityType} onValueChange={(v) => updateLine(i, "activityType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Project task (optional)</Label><Select value={line.projectTaskId || "__none__"} onValueChange={(value) => updateLine(i, "projectTaskId", value === "__none__" ? "" : value)}><SelectTrigger><SelectValue placeholder="No project task" /></SelectTrigger><SelectContent><SelectItem value="__none__">No project task</SelectItem>{(projectTasks || []).map((task) => <SelectItem key={task._id} value={task._id}>{task.wbs_code} · {task.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex gap-2 sm:col-span-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addLine}><Plus className="mr-2 h-4 w-4" /> Add Entry</Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/timesheets")}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !employeeId}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
    </Layout>
  );
}
