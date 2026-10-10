import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { projectsApi, timesheetsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Pencil, Loader2, Calendar, Send, PencilLine } from "lucide-react";

const INTERNAL_TIME_CODES = [
  { value: "leave", label: "Leave" },
  { value: "administration", label: "Administration" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other non-project time" },
];

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [correction, setCorrection] = useState<{
    lineIndex: number;
    projectTaskId: string;
    internalCode: string;
    reason: string;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["timesheet", id],
    queryFn: async () => {
      const res = await timesheetsApi.getById(id!);
      return res.data;
    },
  });

  const { data: projectTasks } = useQuery({
    queryKey: ["project-tasks", "timesheet"],
    queryFn: async () => (await projectsApi.getAll({ type: "task" })).data || [],
  });

  const roleNames = [user?.role, ...(user?.roles || [])]
    .map((role) => typeof role === "string" ? role : role?.name || "")
    .map((role) => role.toLowerCase());
  const canCorrectAllocation = roleNames.some((role) =>
    ["admin", "accountant", "finance", "finance_manager", "project_controller"].includes(role),
  ) || (user?.permissions || []).some((permission) =>
    ["timesheets.correct", "timesheets:correct"].includes(permission),
  );

  const approveMutation = useMutation({
    mutationFn: () => timesheetsApi.approve(id!),
    onSuccess: () => { toast.success("Timesheet approved"); refetch(); },
    onError: (err: any) => toast.error(err.message || "Approval failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => timesheetsApi.reject(id!),
    onSuccess: () => { toast.success("Timesheet rejected"); refetch(); },
    onError: (err: any) => toast.error(err.message || "Rejection failed"),
  });

  const submitMutation = useMutation({
    mutationFn: () => timesheetsApi.submit(id!),
    onSuccess: () => { toast.success("Timesheet submitted"); refetch(); },
    onError: (err: any) => toast.error(err.message || "Submit failed"),
  });

  const correctMutation = useMutation({
    mutationFn: () => timesheetsApi.correctAllocation(id!, {
      lineIndex: correction!.lineIndex,
      projectTaskId: correction!.projectTaskId || undefined,
      internalCode: correction!.projectTaskId ? undefined : correction!.internalCode as "leave" | "administration" | "training" | "other",
      reason: correction!.reason.trim(),
    }),
    onSuccess: () => {
      toast.success("Timesheet allocation corrected");
      setCorrection(null);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Allocation correction failed"),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="p-6 text-center text-slate-500">Timesheet not found</div>
      </Layout>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    submitted: "bg-blue-50 text-blue-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };
  const unallocatedCount = (data.lines || []).filter((line: any) =>
    !line.projectTaskId && !line.internalCode,
  ).length;

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/timesheets")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{data.employeeName}</h1>
              <p className="text-sm text-slate-500">{data.period?.monthName} {data.period?.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[data.status] || "bg-slate-100"}>{data.status}</Badge>
            {data.status === "submitted" && (
              <>
                <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button>
              </>
            )}
            {data.status === "draft" && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate(`/timesheets/${id}/edit`)}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
                <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || unallocatedCount > 0}><Send className="mr-1 h-4 w-4" /> Submit</Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Total Hours</p><p className="text-2xl font-bold">{data.totalHours || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Direct Hours</p><p className="text-2xl font-bold text-emerald-600">{data.directHours || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Indirect Hours</p><p className="text-2xl font-bold text-blue-600">{data.indirectHours || 0}</p></CardContent></Card>
        </div>

        {unallocatedCount > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {unallocatedCount} entr{unallocatedCount === 1 ? "y has" : "ies have"} no project task or internal code. Assign each entry before approval.
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Work Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {(data.lines || []).map((line: any, i: number) => (
                <div key={i} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{line.date ? new Date(line.date).toLocaleDateString() : "—"}</span>
                      <Badge variant="outline" className="capitalize text-xs">{line.activityType?.replace("_", " ")}</Badge>
                      {line.projectTaskId && <span className="text-xs text-slate-500">Project task · {(projectTasks || []).find((task: any) => task._id === line.projectTaskId)?.name || line.projectTaskId} · labor {line.laborCost != null ? `${line.currencyCode || "RWF"} ${Number(line.laborCost).toLocaleString()}` : "cost set on approval"}</span>}
                      {!line.projectTaskId && line.internalCode && <span className="text-xs text-slate-500">Internal · {INTERNAL_TIME_CODES.find((code) => code.value === line.internalCode)?.label || line.internalCode}</span>}
                    </div>
                    <span className="font-semibold">{line.hoursWorked} hrs</span>
                  </div>
                  {data.status === "approved" && canCorrectAllocation && (
                    correction?.lineIndex === i ? (
                      <div className="space-y-3 rounded-md border bg-slate-50 p-3 dark:bg-slate-900">
                        <p className="text-sm font-medium">Employee, date, and hours are locked. Only this entry's allocation can change.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Project task</Label>
                            <Select
                              value={correction.projectTaskId || "__none__"}
                              onValueChange={(value) => setCorrection({ ...correction, projectTaskId: value === "__none__" ? "" : value, internalCode: "" })}
                            >
                              <SelectTrigger><SelectValue placeholder="Choose a project task" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">No project task</SelectItem>
                                {(projectTasks || []).map((task: any) => <SelectItem key={task._id} value={task._id}>{task.wbs_code} · {task.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Internal code</Label>
                            <Select
                              value={correction.internalCode || "__none__"}
                              onValueChange={(value) => setCorrection({ ...correction, internalCode: value === "__none__" ? "" : value, projectTaskId: "" })}
                            >
                              <SelectTrigger><SelectValue placeholder="Choose an internal code" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Not internal time</SelectItem>
                                {INTERNAL_TIME_CODES.map((code) => <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Correction reason (required)</Label>
                          <Input value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} maxLength={500} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => correctMutation.mutate()}
                            disabled={correctMutation.isPending || !correction.reason.trim() || (!correction.projectTaskId && !correction.internalCode)}
                          >
                            {correctMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save correction
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setCorrection(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCorrection({ lineIndex: i, projectTaskId: line.projectTaskId || "", internalCode: line.internalCode || "", reason: "" })}
                      >
                        <PencilLine className="mr-2 h-4 w-4" /> Correct allocation
                      </Button>
                    )
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
