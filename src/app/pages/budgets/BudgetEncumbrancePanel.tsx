import { useState, useEffect } from "react";
import { budgetsApi, BudgetLine, Encumbrance } from "@/lib/api";
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
  Lock,
  Loader2,
  Droplets,
  Unlock,
  Wallet,
  AlertTriangle,
  FileText,
  Calendar,
  Receipt,
  ArrowDownToLine,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useFormatCurrency } from '@/lib/currencyUtils';

interface BudgetEncumbrancePanelProps {
  budgetId: string;
  budgetLines: BudgetLine[];
  budgetStatus: string;
  canUpdate: boolean;
}

export function BudgetEncumbrancePanel({
  budgetId,
  budgetLines,
  budgetStatus,
  canUpdate,
}: BudgetEncumbrancePanelProps) {
  const [encumbrances, setEncumbrances] = useState<Encumbrance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedEncumbrance, setSelectedEncumbrance] = useState<Encumbrance | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [budgetLineId, setBudgetLineId] = useState("");
  const [sourceType, setSourceType] = useState<"purchase_order" | "goods_received_note" | "expense_request" | "manual">("purchase_order");
  const [sourceNumber, setSourceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchEncumbrances();
  }, [budgetId]);

  const fetchEncumbrances = async () => {
    try {
      const [encResponse, sumResponse] = await Promise.all([
        budgetsApi.getEncumbrances(budgetId),
        budgetsApi.getEncumbranceSummary(budgetId),
      ]);
      if (encResponse.success) {
        setEncumbrances(encResponse.data || []);
      }
      if (sumResponse.success) {
        setSummary(sumResponse.data);
      }
    } catch (error) {
      console.error("Failed to fetch encumbrances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEncumbrance = async () => {
    if (!budgetLineId || !sourceNumber || !amount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const selectedLine = budgetLines.find((line) => line._id === budgetLineId);
      const selectedAccountId = selectedLine
        ? typeof selectedLine.account_id === "object"
          ? selectedLine.account_id._id
          : selectedLine.account_id
        : "";

      if (!selectedLine || !selectedAccountId) {
        toast.error("Please select a valid budget line");
        setSubmitting(false);
        return;
      }

      const response = await budgetsApi.createEncumbrance(budgetId, {
        budget_line_id: budgetLineId,
        account_id: selectedAccountId,
        source_type: sourceType,
        source_id: `${sourceType}_${Date.now()}`,
        source_number: sourceNumber,
        description,
        amount: numAmount,
        expected_liquidation_date: expectedDate || undefined,
        notes: notes || undefined,
      });

      if (response.success) {
        toast.success("Encumbrance created successfully");
        setShowCreateDialog(false);
        resetForm();
        fetchEncumbrances();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("INSUFFICIENT_BUDGET")) {
        toast.error("Insufficient available budget for this encumbrance");
      } else if (msg.includes("ENCUMBRANCE_ALREADY_EXISTS")) {
        toast.error("An encumbrance already exists for this source document");
      } else {
        toast.error(error?.message || "Failed to create encumbrance");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedEncumbrance) return;

    setSubmitting(true);
    try {
      const response = await budgetsApi.releaseEncumbrance(
        selectedEncumbrance.source_type,
        selectedEncumbrance.source_id,
        releaseReason
      );
      if (response.success) {
        toast.success("Encumbrance released successfully");
        setShowReleaseDialog(false);
        setSelectedEncumbrance(null);
        setReleaseReason("");
        fetchEncumbrances();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to release encumbrance");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setBudgetLineId("");
    setSourceType("purchase_order");
    setSourceNumber("");
    setAmount("");
    setDescription("");
    setExpectedDate("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      active: { className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/40", label: "Active", icon: Lock },
      partially_liquidated: { className: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40", label: "Partially Liquidated", icon: Droplets },
      fully_liquidated: { className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/40", label: "Fully Liquidated", icon: Wallet },
      released: { className: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700", label: "Released", icon: Unlock },
      cancelled: { className: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/40", label: "Cancelled", icon: AlertTriangle },
    };
    const configItem = config[status] || config.active;
    const Icon = configItem.icon;
    return (
      <Badge variant="outline" className={`border-0 gap-1 text-xs font-medium ${configItem.className}`}>
        <Icon className="h-3 w-3" />
        {configItem.label}
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

  const toAmount = (value: unknown) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  };

  const originalEncumbered = encumbrances.reduce(
    (sum, enc) => sum + toAmount(enc.encumbered_amount),
    0,
  );
  const openCommitted = encumbrances.reduce(
    (sum, enc) => sum + toAmount(enc.remaining_amount),
    0,
  );
  const liquidatedAmount = encumbrances.reduce(
    (sum, enc) => sum + toAmount(enc.liquidated_amount),
    0,
  );
  const activeEncumbranceCount = encumbrances.filter((enc) =>
    ["active", "partially_liquidated"].includes(enc.status),
  ).length;
  const summaryOriginalEncumbered = encumbrances.length
    ? originalEncumbered
    : toAmount(summary?.totalEncumbered ?? summary?.total_encumbered);
  const summaryOpenCommitted = encumbrances.length
    ? openCommitted
    : toAmount(summary?.totalRemaining ?? summary?.total_remaining);
  const summaryActiveCount = encumbrances.length
    ? activeEncumbranceCount
    : Number(summary?.byStatus?.active?.count || summary?.by_status?.active || 0);

  const getLineLabel = (lineId: string) => {
    const line = budgetLines.find((l) => l._id === lineId);
    if (!line) return "Unknown";
    const account = typeof line.account_id === "object" ? line.account_id : null;
    const project =
      line.project_id && typeof line.project_id === "object"
        ? ` - ${line.project_id.wbs_code || line.wbs_code || line.project_id.project_code}`
        : line.wbs_code
          ? ` - ${line.wbs_code}`
          : "";
    return `${account?.code || ""} - ${account?.name || "Unknown"}${project}`;
  };

  const canCreateEncumbrance =
    canUpdate && ["approved", "active", "locked"].includes(budgetStatus);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      {(summary || encumbrances.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Original Encumbrances</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(summaryOriginalEncumbered)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50">
                  <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Open Commitments</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{formatCurrency(summaryOpenCommitted)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Liquidated to Actual</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">{formatCurrency(liquidatedAmount)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50">
                  <ArrowDownToLine className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Active Encumbrances</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{summaryActiveCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Budget Encumbrances</h3>
          {encumbrances.length > 0 && (
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{encumbrances.length}</Badge>
          )}
        </div>
        {canCreateEncumbrance && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="shrink-0 gap-2">
            <Lock className="h-4 w-4" />
            Reserve Budget
          </Button>
        )}
      </div>

      {/* Encumbrances List */}
      {encumbrances.length === 0 ? (
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
              <Lock className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No budget encumbrances yet</p>
            {canCreateEncumbrance && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click "Reserve Budget" to commit budget for upcoming expenses
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-0">
            <div className="space-y-3 p-3 xl:hidden">{encumbrances.map((enc) => <article key={enc._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-3.5 w-3.5 shrink-0 text-slate-400"/><span className="truncate">{enc.source_number}</span></p><p className="mt-1 text-xs text-muted-foreground">{enc.source_type.replace("_", " ")} · {formatDate(enc.encumbrance_date)}</p><p className="mt-1 break-words text-xs text-muted-foreground">{enc.description}</p></div>{getStatusBadge(enc.status)}</div><p className="mt-2 text-xs text-muted-foreground">{typeof enc.account_id === "object" ? `${enc.account_id.code} · ${enc.account_id.name}` : enc.account_id}</p><div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs dark:border-slate-800"><span className="text-muted-foreground">Original<b className="mt-1 block text-sm text-foreground">{formatCurrency(enc.encumbered_amount)}</b></span><span className="text-muted-foreground">Liquidated<b className="mt-1 block text-sm text-foreground">{formatCurrency(enc.liquidated_amount)}</b></span><span className="text-muted-foreground">Open<b className="mt-1 block text-sm text-foreground">{formatCurrency(enc.remaining_amount)}</b></span></div>{["active", "partially_liquidated"].includes(enc.status) && canUpdate && <Button className="mt-3 min-h-10 w-full" variant="outline" onClick={() => { setSelectedEncumbrance(enc); setShowReleaseDialog(true); }} disabled={submitting}><Unlock className="mr-2 h-4 w-4"/>Release commitment</Button>}</article>)}</div>
            <div className="hidden overflow-x-auto xl:block"><Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Source</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Account</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Original</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Liquidated</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Open</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Created</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encumbrances.map((enc) => (
                  <TableRow key={enc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1">
                          <FileText className="h-3 w-3 text-slate-400" />
                          {enc.source_number}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {enc.source_type.replace("_", " ")}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                          {enc.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                      {typeof enc.account_id === "object"
                        ? `${enc.account_id.code} - ${enc.account_id.name}`
                        : enc.account_id}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-right text-slate-900 dark:text-white">
                      {formatCurrency(enc.encumbered_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-slate-600 dark:text-slate-300">
                      {formatCurrency(enc.liquidated_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-slate-600 dark:text-slate-300">
                      {formatCurrency(enc.remaining_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(enc.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(enc.encumbrance_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Release button for active/partial encumbrances */}
                        {["active", "partially_liquidated"].includes(enc.status) && canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedEncumbrance(enc);
                              setShowReleaseDialog(true);
                            }}
                            disabled={submitting}
                            title="Release Encumbrance"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                        {!["active", "partially_liquidated"].includes(enc.status) && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            No open commitment
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

      {/* Create Encumbrance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reserve Budget (Create Encumbrance)</DialogTitle>
            <DialogDescription>
              Commit budget for upcoming expenses. This reserves the amount so it cannot be spent elsewhere.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source Type */}
            <div className="space-y-2">
              <Label>Source Type *</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => setSourceType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  <SelectItem value="goods_received_note">Goods Received Note</SelectItem>
                  <SelectItem value="expense_request">Expense Request</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Number */}
            <div className="space-y-2">
              <Label>Source Number *</Label>
              <Input
                value={sourceNumber}
                onChange={(e) => setSourceNumber(e.target.value)}
                placeholder="e.g., PO-2024-001"
              />
            </div>

            {/* Budget Line */}
            <div className="space-y-2">
              <Label>Budget Line *</Label>
              <Select value={budgetLineId} onValueChange={setBudgetLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget line" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((line) => {
                    const account =
                      typeof line.account_id === "object"
                        ? line.account_id
                        : null;
                    const project =
                      line.project_id && typeof line.project_id === "object"
                        ? line.project_id.wbs_code || line.wbs_code || line.project_id.project_code
                        : line.wbs_code;
                    const available =
                      Number(line.budgeted_amount || 0) -
                      Number(line.encumbered_amount || 0) -
                      Number(line.actual_amount || 0);
                    return (
                      <SelectItem key={line._id} value={line._id}>
                        {account?.code || ""} - {account?.name || "Unknown"}
                        {project ? ` - ${project}` : ""} ({formatCurrency(available)} available)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {budgetLineId && (
                <p className="text-xs text-muted-foreground">
                  Selected: {getLineLabel(budgetLineId)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount to Reserve *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={0}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Office supplies for Q1"
              />
            </div>

            {/* Expected Liquidation Date */}
            <div className="space-y-2">
              <Label>Expected Payment Date</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEncumbrance}
              disabled={submitting || !budgetLineId || !sourceNumber || !amount || !description}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reserve Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Release Encumbrance</DialogTitle>
            <DialogDescription>
              Release the remaining committed budget. This will free up the reserved amount.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="Enter reason for release (e.g., PO cancelled, order changed)..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRelease}
              disabled={submitting || !releaseReason}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
