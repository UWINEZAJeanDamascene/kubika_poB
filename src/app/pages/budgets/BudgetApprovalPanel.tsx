import { useState, useEffect } from "react";
import { budgetsApi, type BudgetApproval, type BudgetWorkflowConfig } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Progress } from "@/app/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, User, FileCheck, AlertCircle, GitPullRequest, CheckCircle2, History } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface BudgetApprovalPanelProps {
  budgetId: string;
  budgetStatus: string;
  budgetAmount: number;
  departmentId?: string | null;
  onApprovalChange: () => void;
}

export function BudgetApprovalPanel({ budgetId, budgetStatus, budgetAmount, departmentId, onApprovalChange }: BudgetApprovalPanelProps) {
  const currentUserId = useAuthStore(state => state.user?._id || state.user?.id || "");
  const [approvals, setApprovals] = useState<BudgetApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalLoadError, setApprovalLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [workflowMatch, setWorkflowMatch] = useState<BudgetWorkflowConfig | null>(null);
  const [workflowChecked, setWorkflowChecked] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<BudgetApproval | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [changesRequired, setChangesRequired] = useState("");

  useEffect(() => {
    fetchApprovals();
  }, [budgetId]);

  useEffect(() => {
    if (budgetStatus === "draft") {
      fetchWorkflowMatch();
    }
  }, [budgetStatus, budgetAmount, departmentId]);

  const fetchApprovals = async () => {
    setApprovalLoadError(null);
    try {
      const response = await budgetsApi.getApprovalHistory(budgetId);
      if (response.success) {
        setApprovals(response.data || []);
      } else {
        setApprovalLoadError("Could not load approval history.");
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
      setApprovalLoadError("Could not load approval history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowMatch = async () => {
    setWorkflowChecked(false);
    try {
      const response = await budgetsApi.testWorkflowMatch({
        workflow_type: "budget_creation",
        amount: budgetAmount,
        department_id: departmentId || null,
      });
      setWorkflowMatch(response.data?.workflow || null);
    } catch (error) {
      console.error("Failed to test budget workflow match:", error);
      setWorkflowMatch(null);
    } finally {
      setWorkflowChecked(true);
    }
  };

  const handleSubmitForApproval = async () => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.submitForApproval(budgetId, {
        workflow_type: "budget_creation",
        priority: "normal",
        comments,
      });
      if (response.success) {
        toast.success("Budget submitted for approval");
        setShowSubmitDialog(false);
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("APPROVAL_ALREADY_PENDING") || msg.includes("ALREADY_PENDING_APPROVAL")) {
        toast.error("An approval is already pending for this budget");
      } else {
        toast.error(error?.message || "Failed to submit for approval");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setApprovalError(null);
    setSubmitting(true);
    try {
      const response = await budgetsApi.approveStep(budgetId, selectedApproval._id, comments);
      if (response.success) {
        const result: any = response.data;
        toast.success(result?.step_complete === false
          ? `Approval recorded (${result.approvals_received}/${result.approvals_required} required)`
          : "Step approved successfully");
        setShowApproveDialog(false);
        setSelectedApproval(null);
        setComments("");
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      const msg = error?.message || "";
      const step = selectedApproval.steps[selectedApproval.current_step - 1];
      const requiredApprover = describeApprover(step);
      if (msg.includes("ALREADY_APPROVED")) {
        setApprovalError("You have already approved this step.");
      } else if (msg.includes("authorized") || msg.includes("APPROVER_NOT_AUTHORIZED")) {
        setApprovalError(`You are not authorized for this step. ${requiredApprover} Ask your administrator to check the workflow and the user's assigned role.`);
      } else if (msg.includes("BUDGET_SELF_APPROVAL_NOT_ALLOWED") || msg.toLowerCase().includes("cannot approve their own")) {
        setApprovalError(`You submitted this budget and cannot approve it. A different user must approve it. ${requiredApprover}`);
      } else {
        setApprovalError(error?.message || "The budget could not be approved. Please try again.");
      }
      toast.error("Budget approval failed", { description: approvalErrorMessage(msg, requiredApprover) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setSubmitting(true);
    try {
      const response = await budgetsApi.rejectApproval(budgetId, selectedApproval._id, rejectReason);
      if (response.success) {
        toast.success("Approval rejected");
        setShowRejectDialog(false);
        setSelectedApproval(null);
        setRejectReason("");
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedApproval || !changesRequired.trim()) return;
    setSubmitting(true);
    try {
      const response = await budgetsApi.requestChanges(budgetId, selectedApproval._id, changesRequired.trim());
      if (response.success) {
        toast.success("Changes requested; the budget is back in draft for the requester");
        setShowChangesDialog(false);
        setSelectedApproval(null);
        setChangesRequired("");
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to request changes");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async (approval: BudgetApproval) => {
    setSubmitting(true);
    try {
      const response = await budgetsApi.resubmitApproval(budgetId, approval._id, comments);
      if (response.success) {
        toast.success("Budget resubmitted to the approval workflow");
        setComments("");
        fetchApprovals();
        onApprovalChange();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to resubmit budget");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      pending: { className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/40", label: "Pending", icon: Clock },
      in_progress: { className: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40", label: "In Progress", icon: GitPullRequest },
      approved: { className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/40", label: "Approved", icon: CheckCircle2 },
      rejected: { className: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/40", label: "Rejected", icon: XCircle },
      changes_requested: { className: "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/40", label: "Changes Requested", icon: AlertCircle },
      cancelled: { className: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700", label: "Cancelled", icon: XCircle },
    };
    const configItem = config[status] || config.pending;
    const Icon = configItem.icon;
    return (
      <Badge variant="outline" className={`border-0 gap-1 text-xs font-medium ${configItem.className}`}>
        <Icon className="h-3 w-3" />
        {configItem.label}
      </Badge>
    );
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingApproval = approvals.find((a) => ["pending", "in_progress"].includes(a.status));
  const changesRequestedApproval = approvals.find((a) => a.status === "changes_requested");
  const latestChangeRequestAction = changesRequestedApproval?.actions.slice().reverse().find(action => action.action === "requested_changes");
  const changesRequesterId = typeof changesRequestedApproval?.requested_by === "object" ? changesRequestedApproval.requested_by?._id : changesRequestedApproval?.requested_by;
  const canSubmit = budgetStatus === "draft" && !pendingApproval && !changesRequestedApproval;
  const currentApprovalStep = pendingApproval?.steps[pendingApproval.current_step - 1];
  const requesterId = typeof pendingApproval?.requested_by === "object"
    ? pendingApproval.requested_by?._id
    : pendingApproval?.requested_by;
  const isRequester = Boolean(currentUserId && requesterId && String(currentUserId) === String(requesterId));

  function describeApprover(step: BudgetApproval["steps"][number] | undefined) {
    if (!step) return "No approver is configured for this step.";
    if (step.approver_type === "role") {
      const role = step.approver_role?.replace(/[_-]+/g, " ") || "unspecified role";
      return `This step requires a user assigned the "${role}" role.`;
    }
    if (step.approver_type === "department_head") {
      return "This step requires a Department Head assigned to the budget's department.";
    }
    if (step.approver_type === "any_manager") {
      return "This step requires a user with a manager-level role (for example Manager, Finance Manager, Director, CFO, CEO, or Admin).";
    }
    return "This step is assigned to a specific user; ask your administrator to check the selected approver.";
  }

  function approvalErrorMessage(message: string, requiredApprover: string) {
    if (message.includes("BUDGET_SELF_APPROVAL_NOT_ALLOWED") || message.toLowerCase().includes("cannot approve their own")) {
      return `You submitted this budget and cannot approve it. A different user must approve it. ${requiredApprover}`;
    }
    if (message.includes("authorized") || message.includes("APPROVER_NOT_AUTHORIZED")) {
      return `You are not authorized for this step. ${requiredApprover} Ask your administrator to check the workflow and the user's assigned role.`;
    }
    if (message.includes("ALREADY_APPROVED")) return "You have already approved this step.";
    return message || "The budget could not be approved. Please try again.";
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
            <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Approval Workflow</h3>
        </div>
        {canSubmit && (
          <Button onClick={() => setShowSubmitDialog(true)} size="sm" className="shrink-0 gap-2">
            <Clock className="h-4 w-4" />
            Submit for Approval
          </Button>
        )}
      </div>

      {budgetStatus === "draft" && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="py-4">
            {!workflowChecked ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking matching workflow...
              </div>
            ) : workflowMatch ? (
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-blue-500" />
                  Matched workflow: {workflowMatch.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {workflowMatch.steps.length} approval step{workflowMatch.steps.length !== 1 ? "s" : ""} will be copied when this budget is submitted.
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  No configured workflow matches this budget
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Submitting will use the system fallback approval steps. Create a matching workflow in Budget Workflow Settings for controlled routing.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Approval Status */}
      {pendingApproval ? (
        <Card className="overflow-hidden border-amber-200 bg-amber-50/30 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-amber-500" />
              Current Approval Status
              {getStatusBadge(pendingApproval.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">
                    Step {pendingApproval.current_step} of {pendingApproval.total_steps}
                  </span>
                </div>
                <Progress value={(pendingApproval.current_step / pendingApproval.total_steps) * 100} className="h-2" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current Step</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                    {currentApprovalStep?.step_name || "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Who can approve this step?</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                    {describeApprover(currentApprovalStep)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requested By</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                    {typeof pendingApproval.requested_by === "object" ? pendingApproval.requested_by.name : "-"}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requested At</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{formatDate(pendingApproval.requested_at)}</p>
                </div>
                {pendingApproval.request_comments && (
                  <div className="rounded-lg bg-white p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 sm:col-span-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Comments</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{pendingApproval.request_comments}</p>
                  </div>
                )}
              </div>
              {isRequester && (
                <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  You submitted this budget, so you cannot approve it. A different user must approve it. {describeApprover(currentApprovalStep)}
                </div>
              )}
              {approvalError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {approvalError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={isRequester}
                  onClick={() => {
                    setApprovalError(null);
                    setSelectedApproval(pendingApproval);
                    setShowApproveDialog(true);
                  }}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingApproval.steps[pendingApproval.current_step - 1]?.can_request_changes === false}
                  onClick={() => {
                    setSelectedApproval(pendingApproval);
                    setShowChangesDialog(true);
                  }}
                  className="gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  Request Changes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pendingApproval.steps[pendingApproval.current_step - 1]?.can_reject === false}
                  onClick={() => {
                    setSelectedApproval(pendingApproval);
                    setShowRejectDialog(true);
                  }}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : changesRequestedApproval ? (
        <Card className="overflow-hidden border-orange-200 bg-orange-50/30 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white"><AlertCircle className="h-4 w-4 text-orange-500" />Changes Requested {getStatusBadge("changes_requested")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">{latestChangeRequestAction?.comments || "Review the approval history for requested changes."}</p>
            {budgetStatus === "draft" && String(changesRequesterId || "") === String(currentUserId) && <Button size="sm" onClick={() => handleResubmit(changesRequestedApproval)} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Resubmit for Approval</Button>}
            {budgetStatus === "draft" && String(changesRequesterId || "") !== String(currentUserId) && <p className="text-xs text-slate-500">Waiting for the original requester to revise and resubmit this budget.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="py-10 text-center">
            {approvalLoadError ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/50">
                  <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">{approvalLoadError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchApprovals}>
                  Retry
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No pending approvals</p>
                {budgetStatus === "approved" && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">This budget has been approved</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {approvals.length > 0 && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              Approval History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div key={approval._id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/30 dark:bg-slate-900/30 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(approval.status)}
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {approval.workflow_name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(approval.requested_at)}
                    </span>
                  </div>
                  {approval.actions.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {approval.actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <User className="h-4 w-4 text-slate-400 mt-0.5 dark:text-slate-500" />
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {typeof action.action_by === "object" ? action.action_by.name : "-"}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400"> {action.action} </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              step {action.step_number}
                            </span>
                            {action.comments && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                                &quot;{action.comments}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              Submit this budget for multi-level approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional comments for approvers..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForApproval} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Budget Changes</DialogTitle><DialogDescription>Explain what must be revised. The request will return to draft for its requester.</DialogDescription></DialogHeader>
          <div className="py-4"><Textarea placeholder="Changes required..." value={changesRequired} onChange={event => setChangesRequired(event.target.value)}/></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowChangesDialog(false)}>Cancel</Button><Button onClick={handleRequestChanges} disabled={submitting || !changesRequired.trim()}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Request Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Step</DialogTitle>
            <DialogDescription>
              Approve the current step in the approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {approvalError && (
              <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {approvalError}
              </div>
            )}
            <Textarea
              placeholder="Optional comments..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Approval</DialogTitle>
            <DialogDescription>
              Reject this approval and provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting || !rejectReason}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
