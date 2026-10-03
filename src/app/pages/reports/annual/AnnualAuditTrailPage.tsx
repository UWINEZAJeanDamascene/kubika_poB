import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, ShieldCheck, Printer, FileSpreadsheet, Users, Activity, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";
import { useAnnualAuditTrail } from "@/lib/hooks/useAnnualReports";
import { annualReportsApi } from "@/lib/api.annualReports";
import { toast } from "sonner";

export default function AnnualAuditTrailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const { data: report, isLoading, error } = useAnnualAuditTrail(year);

  const handlePrint = () => window.print();
  const handleDownloadExcel = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadAuditTrailExcel(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };
  const handleDownloadPDF = async () => { try { toast.loading("Generating..."); await annualReportsApi.downloadAuditTrailPDF(year); toast.dismiss(); toast.success("Done"); } catch { toast.dismiss(); toast.error("Failed"); } };

  if (isLoading) return <Layout><div className="p-6 space-y-6"><Skeleton className="h-10 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card></div></Layout>;
  if (error) return <Layout><div className="p-6"><Card className="border-red-200 bg-red-50"><CardContent className="p-6"><p className="text-red-700">Error: {error.message}</p><Button variant="outline" className="mt-4" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></CardContent></Card></div></Layout>;
  if (!report) return null;

  const s = report.summary;

  return (
    <Layout>
      <div className="annual-report-detail p-6 space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/annual')}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" />Annual Audit Trail</h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><FileSpreadsheet className="w-4 h-4 mr-2" />PDF</Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
          </div>
        </div>

        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-bold">Annual Audit Trail Report</h1>
          <p className="text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" />Active Users</p><p className="text-2xl font-bold">{s.totalUsers}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><Activity className="w-4 h-4" />Total Actions</p><p className="text-2xl font-bold">{s.totalAuditEntries.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><RotateCcw className="w-4 h-4 text-amber-500" />Reversals</p><p className="text-2xl font-bold text-amber-600">{s.totalReversals}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Adjustments</p><p className="text-2xl font-bold text-blue-600">{s.totalAdjustments}</p></CardContent></Card>
        </div>

        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity Summary</CardTitle>
            <CardDescription>Actions by user</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Role</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Total Actions</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">First Activity</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {report.userActivity.map((u) => (
                    <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{u.name}</td>
                      <td className="py-2 px-4 text-sm">{u.email}</td>
                      <td className="py-2 px-4 text-sm capitalize">{u.role}</td>
                      <td className="text-right py-2 px-4 text-sm">{u.totalActions.toLocaleString()}</td>
                      <td className="py-2 px-4 text-sm">{u.firstActivity ? new Date(u.firstActivity).toLocaleDateString() : '-'}</td>
                      <td className="py-2 px-4 text-sm">{u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Reversals & Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle>Reversals & Adjustments</CardTitle>
            <CardDescription>Journal entry corrections and modifications</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Entry #</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Description</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm border-b">Amount</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm border-b">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Created By</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm border-b">Reversed By</th>
                  </tr>
                </thead>
                <tbody>
                  {report.reversalsAndAdjustments.map((r) => (
                    <tr key={r.entryId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm font-medium">{r.entryNumber}</td>
                      <td className="py-2 px-4 text-sm">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-sm max-w-xs truncate" title={r.description}>{r.description}</td>
                      <td className="text-right py-2 px-4 text-sm">{r.amount.toLocaleString('en-RW', { style: 'currency', currency: 'RWF' })}</td>
                      <td className="text-center py-2 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${r.type === 'reversal' ? 'bg-red-100 text-red-700' : r.type === 'adjustment' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm">{r.createdBy}</td>
                      <td className="py-2 px-4 text-sm">{r.reversedBy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <CardFooter className="text-xs text-muted-foreground justify-center print:hidden">
          Generated: {new Date(report.generatedAt).toLocaleString()} | Most Active: {s.mostActiveUser?.name || 'N/A'}
        </CardFooter>
      </div>
    </Layout>
  );
}
