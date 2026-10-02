import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { employeeAdvanceApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../../components/ui/table';
import {
  ArrowLeft, Loader2, Wallet, User, Calendar, Banknote,
  CheckCircle2, Clock, AlertCircle, FileText, Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface Repayment {
  amount: number;
  date: string;
  paymentMethod: string;
  notes: string;
  createdAt: string;
}

interface AdvanceDetail {
  _id: string;
  employee: { _id: string; firstName: string; lastName: string; employeeId: string; email?: string };
  referenceNo: string;
  description: string;
  amount: number;
  amountRepaid: number;
  balance: number;
  issueDate: string;
  dueDate?: string;
  status: string;
  paymentMethod: string;
  notes: string;
  repayments: Repayment[];
  createdAt: string;
}

export default function EmployeeAdvanceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [advance, setAdvance] = useState<AdvanceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAdvance();
  }, [id]);

  const fetchAdvance = async () => {
    setLoading(true);
    try {
      const response: any = await employeeAdvanceApi.getById(id!);
      if (response.success) {
        setAdvance(response.data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load advance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      issued: { className: 'bg-amber-100 text-amber-700', label: 'Issued' },
      partially_repaid: { className: 'bg-blue-100 text-blue-700', label: 'Partially Repaid' },
      fully_repaid: { className: 'bg-emerald-100 text-emerald-700', label: 'Fully Repaid' },
      written_off: { className: 'bg-red-100 text-red-700', label: 'Written Off' },
    };
    const cfg = config[status] || config.issued;
    return (
      <Badge variant="outline" className={`font-medium border-0 ${cfg.className}`}>
        {cfg.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </Layout>
    );
  }

  if (!advance) {
    return (
      <Layout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Advance not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Wallet className="h-6 w-6 text-indigo-500" />
                {advance.referenceNo}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Employee advance details
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(advance.status === 'issued' || advance.status === 'partially_repaid') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/employee-advances/${advance._id}/repayment`)}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Record Repayment
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/employee-advances/${advance._id}/settlement`)}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Settle
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Original Amount</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{advance.amount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Amount Repaid</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{advance.amountRepaid.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Remaining Balance</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{advance.balance.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Advance Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Advance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Employee</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {advance.employee?.firstName} {advance.employee?.lastName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{advance.employee?.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Status</p>
                  <div className="mt-1">{getStatusBadge(advance.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Issue Date</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(advance.issueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                {advance.dueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Due Date</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(advance.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Payment Method</p>
                <p className="text-sm font-medium mt-1 capitalize">{advance.paymentMethod?.replace('_', ' ')}</p>
              </div>
              {advance.description && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Description</p>
                  <p className="text-sm mt-1">{advance.description}</p>
                </div>
              )}
              {advance.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Notes</p>
                  <p className="text-sm mt-1">{advance.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repayment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Repayment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {advance.repayments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No repayments yet</p>
                </div>
              ) : (
                <>
                <div className="space-y-2 xl:hidden">{advance.repayments.map((rep, i) => <article key={`repayment-${i}`} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{new Date(rep.date).toLocaleDateString()}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{rep.paymentMethod?.replace("_", " ") || "Payment"}</p></div><p className="shrink-0 text-sm font-semibold text-emerald-600">{rep.amount.toLocaleString()}</p></div>{rep.notes && <p className="mt-2 break-words border-t pt-2 text-xs text-muted-foreground">{rep.notes}</p>}</article>)}</div>
                <div className="hidden overflow-x-auto xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advance.repayments.map((rep, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-sm">{new Date(rep.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm font-medium text-emerald-600">{rep.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-sm capitalize">{rep.paymentMethod?.replace('_', ' ')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{rep.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
