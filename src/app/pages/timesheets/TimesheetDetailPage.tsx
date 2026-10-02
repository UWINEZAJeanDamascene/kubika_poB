import { useParams, useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { timesheetsApi } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Pencil, Loader2, Calendar, Send } from "lucide-react";

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["timesheet", id],
    queryFn: async () => {
      const res = await timesheetsApi.getById(id!);
      return res.data;
    },
  });

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
                <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}><Send className="mr-1 h-4 w-4" /> Submit</Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Total Hours</p><p className="text-2xl font-bold">{data.totalHours || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Direct Hours</p><p className="text-2xl font-bold text-emerald-600">{data.directHours || 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Indirect Hours</p><p className="text-2xl font-bold text-blue-600">{data.indirectHours || 0}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Work Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {(data.lines || []).map((line: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{line.date ? new Date(line.date).toLocaleDateString() : "—"}</span>
                    <Badge variant="outline" className="capitalize text-xs">{line.activityType?.replace("_", " ")}</Badge>
                  </div>
                  <span className="font-semibold">{line.hoursWorked} hrs</span>
                  {line.projectTaskId && <span className="text-xs text-slate-500">Project task · labor {line.laborCost != null ? `${line.currencyCode || "RWF"} ${Number(line.laborCost).toLocaleString()}` : "cost set on approval"}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
