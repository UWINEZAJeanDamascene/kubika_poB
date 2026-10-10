import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Plus, Search, ClipboardList, Send, CheckCircle, XCircle, Pencil } from "lucide-react";
import { timesheetsApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TimesheetsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data, isLoading } = useQuery({
    queryKey: ["timesheets", period],
    queryFn: async () => {
      const res = await timesheetsApi.getAll({ period });
      return res.data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.submit(id),
    onSuccess: () => {
      toast.success("Timesheet submitted");
      queryClient.invalidateQueries({ queryKey: ["timesheets", period] });
    },
    onError: (err: any) => toast.error(err.message || "Submit failed"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.approve(id),
    onSuccess: () => {
      toast.success("Timesheet approved");
      queryClient.invalidateQueries({ queryKey: ["timesheets", period] });
    },
    onError: (err: any) => toast.error(err.message || "Approval failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.reject(id),
    onSuccess: () => {
      toast.success("Timesheet rejected");
      queryClient.invalidateQueries({ queryKey: ["timesheets", period] });
    },
    onError: (err: any) => toast.error(err.message || "Rejection failed"),
  });

  const timesheets = (data || []).filter((t: any) =>
    t.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    submitted: "bg-blue-50 text-blue-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Timesheets</h1>
            <p className="text-sm text-slate-500">Employee work hour tracking</p>
          </div>
          <Button onClick={() => navigate("/timesheets/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Timesheet
          </Button>
        </div>

        <div className="flex gap-3">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-44"
          />
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">All Timesheets</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : timesheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <ClipboardList className="h-10 w-10 mb-2" />
                <p>No timesheets found for this period</p>
              </div>
            ) : (
              <div className="divide-y">
                {timesheets.map((t: any) => {
                  const unallocatedCount = (t.lines || []).filter((line: any) =>
                    !line.projectTaskId && !line.internalCode,
                  ).length;
                  return (
                    <div key={t._id} className="flex items-center justify-between py-3 px-4 -mx-4 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <div className="flex-1 cursor-pointer min-w-0" onClick={() => navigate(`/timesheets/${t._id}`)}>
                        <p className="font-medium text-slate-900 dark:text-white">{t.employeeName}</p>
                        <p className="text-xs text-slate-500">{t.period?.monthName} {t.period?.year} • {t.totalHours} hrs total</p>
                        {unallocatedCount > 0 && <p className="text-xs text-amber-700">{unallocatedCount} {unallocatedCount === 1 ? "entry needs" : "entries need"} a project task or internal code</p>}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-slate-500 hidden sm:inline">{t.directHours || 0} direct / {t.indirectHours || 0} indirect</span>
                        <Badge className={statusColors[t.status] || "bg-slate-100"}>{t.status}</Badge>
                        {t.status === "draft" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={(e) => { e.stopPropagation(); navigate(`/timesheets/${t._id}/edit`); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Submit" onClick={(e) => { e.stopPropagation(); submitMutation.mutate(t._id); }} disabled={submitMutation.isPending || unallocatedCount > 0}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {t.status === "submitted" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" title="Reject" onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(t._id); }} disabled={rejectMutation.isPending}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Approve" onClick={(e) => { e.stopPropagation(); approveMutation.mutate(t._id); }} disabled={approveMutation.isPending || unallocatedCount > 0}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
