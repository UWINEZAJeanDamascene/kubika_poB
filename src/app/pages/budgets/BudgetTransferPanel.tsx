import { useState, useEffect } from "react";
import { budgetsApi, BudgetLine, BudgetTransfer } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  Ban,
  User,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useFormatCurrency } from '@/lib/currencyUtils';

interface BudgetTransferPanelProps {
  budgetId: string;
  budgetLines: BudgetLine[];
  budgetStatus: string;
  canApprove: boolean;
  canUpdate: boolean;
}

export function BudgetTransferPanel({
  budgetId,
  budgetLines,
  budgetStatus,
  canApprove,
  canUpdate,
}: BudgetTransferPanelProps) {
  const [transfers, setTransfers] = useState<BudgetTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<BudgetTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fromLineId, setFromLineId] = useState("");
  const [toLineId, setToLineId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchTransfers();
  }, [budgetId]);

  const fetchTransfers = async () => {
    try {
      const response = await budgetsApi.getTransfers(budgetId);
      if (response.success) {
        setTransfers(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!fromLineId || !toLineId || !amount || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fromLineId === toLineId) {
      toast.error("Cannot transfer to the same budget line");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const response = await budgetsApi.createTransfer(budgetId, {
        from_line_id: fromLineId,
        to_line_id: toLineId,
        amount: numAmount,
        transfer_date: transferDate,
        reason,
      });

      if (response.success) {
        toast.success("Transfer request created successfully");
        setShowCreateDialog(false);
        resetForm();
        fetchTransfers();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("TRANSFER_ALREADY_PENDING")) {
        toast.error("A transfer between these lines is already pending");
      } else if (msg.includes("TRANSFER_INSUFFICIENT_BUDGET")) {
        toast.error("Insufficient budget in source line");
      } else {
        toast.error(error?.message || "Failed to create transfer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (transfer: BudgetTransfer) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.approveTransfer(budgetId, transfer._id);
      if (response.success) {
        toast.success("Transfer approved successfully");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecute = async (transfer: BudgetTransfer) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.executeTransfer(budgetId, transfer._id);
      if (response.success) {
        toast.success("Transfer executed successfully");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to execute transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer) return;

    setSubmitting(true);
    try {
      const response = await budgetsApi.rejectTransfer(
        budgetId,
        selectedTransfer._id,
        rejectReason
      );
      if (response.success) {
        toast.success("Transfer rejected");
        setShowRejectDialog(false);
        setSelectedTransfer(null);
        setRejectReason("");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (transfer: BudgetTransfer) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.cancelTransfer(budgetId, transfer._id);
      if (response.success) {
        toast.success("Transfer cancelled");
        fetchTransfers();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to cancel transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFromLineId("");
    setToLineId("");
    setAmount("");
    setReason("");
    setTransferDate(new Date().toISOString().split("T")[0]);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      pending: { className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/40", label: "Pending", icon: Clock },
      approved: { className: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40", label: "Approved", icon: CheckCircle2 },
      rejected: { className: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/40", label: "Rejected", icon: XCircle },
      executed: { className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/40", label: "Executed", icon: CheckCircle },
      cancelled: { className: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700", label: "Cancelled", icon: Ban },
    };
    const { className, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`border-0 gap-1 text-xs font-medium ${className}`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const formatCurrency = useFormatCurrency();

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLineLabel = (lineId: string) => {
    const line = budgetLines.find((l) => l._id === lineId);
    if (!line) return "Unknown";
    const account = typeof line.account_id === "object" ? line.account_id : null;
    return `${account?.code || ""} - ${account?.name || "Unknown"} (${formatCurrency(
      line.budgeted_amount
    )})`;
  };

  const canCreateTransfer =
    canUpdate && ["draft", "approved", "locked"].includes(budgetStatus);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {transfers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Transfers", value: transfers.length, icon: ArrowRightLeft, color: "indigo" },
            { label: "Pending", value: transfers.filter((t) => t.status === "pending").length, icon: Clock, color: "amber" },
            { label: "Executed", value: transfers.filter((t) => t.status === "executed").length, icon: CheckCircle, color: "emerald" },
            { label: "Total Amount", value: formatCurrency(transfers.reduce((sum, t) => sum + (typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount) || 0), 0)), icon: TrendingUp, color: "blue" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = {
              indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
              amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
              emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
              blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
            };
            return (
              <Card key={idx} className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[stat.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
            <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Budget Transfers</h3>
          {transfers.length > 0 && (
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{transfers.length}</Badge>
          )}
        </div>
        {canCreateTransfer && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="shrink-0 gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Request Transfer
          </Button>
        )}
      </div>

      {/* Transfers List */}
      {transfers.length === 0 ? (
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
              <ArrowRightLeft className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No budget transfers yet</p>
            {canCreateTransfer && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click "Request Transfer" to move budget between accounts
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-0">
            <div className="space-y-3 p-3 xl:hidden">{transfers.map((transfer) => <article key={transfer._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold">{transfer.from_account_code} → {transfer.to_account_code}</p><p className="mt-1 text-xs text-muted-foreground">{typeof transfer.requested_by === "object" ? transfer.requested_by.name : "Unknown"} · {formatDate(transfer.transfer_date)}</p></div>{getStatusBadge(transfer.status)}</div><p className="mt-3 text-lg font-semibold">{formatCurrency(transfer.amount)}</p>{transfer.status === "rejected" && transfer.rejection_reason && <p className="mt-2 break-words text-xs text-red-600 dark:text-red-400">{transfer.rejection_reason}</p>}<div className="mt-3 flex flex-wrap gap-2 border-t pt-3 dark:border-slate-800">{transfer.status === "pending" && canApprove && <Button size="sm" variant="outline" onClick={() => handleApprove(transfer)} disabled={submitting}><CheckCircle className="mr-1.5 h-4 w-4"/>Approve</Button>}{transfer.status === "approved" && canApprove && <Button size="sm" variant="outline" onClick={() => handleExecute(transfer)} disabled={submitting}><Play className="mr-1.5 h-4 w-4"/>Execute</Button>}{["pending", "approved"].includes(transfer.status) && canApprove && <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(transfer); setShowRejectDialog(true); }} disabled={submitting}><XCircle className="mr-1.5 h-4 w-4"/>Reject</Button>}{transfer.status === "pending" && <Button size="sm" variant="ghost" onClick={() => handleCancel(transfer)} disabled={submitting}><Ban className="mr-1.5 h-4 w-4"/>Cancel</Button>}</div></article>)}</div>
            <div className="hidden overflow-x-auto xl:block"><Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">From → To</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Requested By</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {transfer.from_account_code}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          → {transfer.to_account_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white">
                      {formatCurrency(transfer.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                        <User className="h-3 w-3 text-slate-400" />
                        {typeof transfer.requested_by === "object"
                          ? transfer.requested_by.name
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transfer.transfer_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Approve button for pending transfers */}
                        {transfer.status === "pending" && canApprove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(transfer)}
                            disabled={submitting}
                            title="Approve"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Execute button for approved transfers */}
                        {transfer.status === "approved" && canApprove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExecute(transfer)}
                            disabled={submitting}
                            title="Execute Transfer"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Reject button for pending/approved transfers */}
                        {["pending", "approved"].includes(transfer.status) &&
                          canApprove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setShowRejectDialog(true);
                              }}
                              disabled={submitting}
                              title="Reject"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}

                        {/* Cancel button for pending transfers (requester only) */}
                        {transfer.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancel(transfer)}
                            disabled={submitting}
                            title="Cancel"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900/50"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Show reason for rejected transfers */}
                        {transfer.status === "rejected" &&
                          transfer.rejection_reason && (
                            <span
                              className="text-xs text-red-600 max-w-[150px] truncate dark:text-red-400"
                              title={transfer.rejection_reason}
                            >
                              {transfer.rejection_reason}
                            </span>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          </CardContent>
        </Card>
      )}

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Budget Transfer</DialogTitle>
            <DialogDescription>
              Move budgeted amount from one account to another within this budget.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* From Line */}
            <div className="space-y-2">
              <Label>From Account (Source) *</Label>
              <Select value={fromLineId} onValueChange={setFromLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((line) => {
                    const account =
                      typeof line.account_id === "object"
                        ? line.account_id
                        : null;
                    return (
                      <SelectItem key={line._id} value={line._id}>
                        {account?.code || ""} - {account?.name || "Unknown"}{" "}
                        ({formatCurrency(line.budgeted_amount)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* To Line */}
            <div className="space-y-2">
              <Label>To Account (Destination) *</Label>
              <Select value={toLineId} onValueChange={setToLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((line) => {
                    const account =
                      typeof line.account_id === "object"
                        ? line.account_id
                        : null;
                    return (
                      <SelectItem key={line._id} value={line._id}>
                        {account?.code || ""} - {account?.name || "Unknown"}{" "}
                        ({formatCurrency(line.budgeted_amount)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount to Transfer *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={0}
              />
              {fromLineId && (
                <p className="text-xs text-muted-foreground">
                  Available: {getLineLabel(fromLineId)}
                </p>
              )}
            </div>

            {/* Transfer Date */}
            <div className="space-y-2">
              <Label>Transfer Date *</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason for Transfer *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Reallocating unused marketing budget to operations"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={
                submitting ||
                !fromLineId ||
                !toLineId ||
                !amount ||
                !reason ||
                fromLineId === toLineId
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Transfer</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transfer request.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectReason}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
