import { useEffect, useState } from "react";
import { projectsApi, productsApi, warehousesApi, type Project, type ProjectBudgetSummary } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

type MaterialLineDraft = { product_id: string; warehouse_id: string; task_id: string; planned_quantity: string; budget_line_id: string };
type MaterialQuantityAction = {
  key: string;
  action: (quantity: number) => Promise<unknown>;
  title: "Issue" | "Return";
  maximum: number;
};
const newLine = (): MaterialLineDraft => ({ product_id: "", warehouse_id: "", task_id: "", planned_quantity: "1", budget_line_id: "" });
const arrayData = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.products) ? value.products : Array.isArray(value?.warehouses) ? value.warehouses : [];
const flattenTasks = (nodes: any[]): Project[] => nodes.flatMap((node) => [node, ...flattenTasks(Array.isArray(node.children) ? node.children : [])]).filter((node) => node.type === "task");
const relationId = (value: any): string => typeof value === "string" ? value : String(value?._id || "");
const ACTIVE_BUDGET_STATUSES = new Set(["approved", "locked", "closed"]);

export default function ProjectMaterialsPanel({ project }: { project: Project }) {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Project[]>([]);
  const [budgetLines, setBudgetLines] = useState<ProjectBudgetSummary["budget_lines"]>([]);
  const [draft, setDraft] = useState<MaterialLineDraft[]>([newLine()]);
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [quantityAction, setQuantityAction] = useState<MaterialQuantityAction | null>(null);
  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [requisitions, productsResult, warehousesResult, tasksResult] = await Promise.all([
        projectsApi.getMaterialRequisitions(project._id),
        productsApi.getAll({ page: 1, limit: 500, status: "active" }),
        warehousesApi.getAll({ page: 1, limit: 500, isActive: true }),
        projectsApi.getTasks(project._id),
      ]);
      setRows(requisitions.data || []);
      setProducts(arrayData((productsResult.data as any)?.items || productsResult.data));
      setWarehouses(arrayData(warehousesResult.data));
      setTasks(flattenTasks(tasksResult.data || []));
    } catch (error: any) { toast.error(error?.message || "Could not load project materials"); }
    try {
      const budgetResult = await projectsApi.getBudgetSummary(project._id);
      setBudgetLines((budgetResult.data?.budget_lines || []).filter((line) =>
        typeof line.budget_id === "object" && ACTIVE_BUDGET_STATUSES.has(line.budget_id.status),
      ));
    } catch (error: any) {
      setBudgetLines([]);
      toast.error(error?.message || "Could not load project budget lines for material allocation");
    }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [project._id]);

  const create = async () => {
    if (busyAction) return;
    const lines = draft.map((line) => ({
      ...line,
      planned_quantity: Number(line.planned_quantity),
      budget_line_id: line.budget_line_id || undefined,
    })).filter((line) => line.product_id && line.warehouse_id && line.planned_quantity > 0);
    if (!lines.length) { toast.error("Choose a material, warehouse, and planned quantity"); return; }
    setBusyAction("create");
    try {
      await projectsApi.createMaterialRequisition(project._id, { lines, required_date: requiredDate || null, notes });
      toast.success("Material plan created"); setDraft([newLine()]); setNotes(""); setRequiredDate(""); await refresh();
    } catch (error: any) { toast.error(error?.message || "Could not create material plan"); }
    finally { setBusyAction(null); }
  };

  const openQuantityDialog = (key: string, action: (quantity: number) => Promise<unknown>, title: "Issue" | "Return", maximum: number) => {
    setQuantityAction({ key, action, title, maximum });
    setQuantity(String(maximum));
    setQuantityError("");
  };

  const submitQuantityAction = async () => {
    if (!quantityAction || busyAction) return;
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setQuantityError("Enter a quantity greater than zero.");
      return;
    }
    if (amount > quantityAction.maximum) {
      setQuantityError(`Quantity cannot exceed ${quantityAction.maximum}.`);
      return;
    }
    setBusyAction(quantityAction.key);
    try {
      const result = await quantityAction.action(amount);
      const payload = result && typeof result === "object" && "data" in result ? result.data : null;
      const warning = payload && typeof payload === "object" && "budgetWarning" in payload ? payload.budgetWarning : null;
      if (typeof warning === "string" && warning) toast.warning(warning);
      else toast.success(`${quantityAction.title} recorded`);
      setQuantityAction(null);
      await refresh();
    }
    catch (error: any) { toast.error(error?.message || `Could not ${quantityAction.title.toLowerCase()}`); }
    finally { setBusyAction(null); }
  };

  const runRequisitionAction = async (key: string, action: () => Promise<unknown>, successMessage: string, errorMessage: string) => {
    if (busyAction) return;
    setBusyAction(key);
    try { await action(); toast.success(successMessage); await refresh(); }
    catch (error: any) { toast.error(error?.message || errorMessage); }
    finally { setBusyAction(null); }
  };

  const deleteRequisition = async () => {
    if (!deleteTarget || busyAction) return;
    const target = deleteTarget;
    const deleteKey = `delete:${target.id}`;
    setBusyAction(deleteKey);
    try {
      const result = await projectsApi.deleteMaterialRequisition(project._id, target.id);
      const outcome = result.data.archived
        ? "Material requisition archived. Stock and accounting history were preserved."
        : "Material requisition deleted.";
      toast.success(outcome);
      setDeleteTarget(null);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Could not delete material requisition");
    } finally {
      setBusyAction(null);
    }
  };

  const reconcileBudgetActuals = async () => {
    if (busyAction || !window.confirm("Reconcile already-issued materials to approved project budget lines? This corrects missing or mismatched budget actuals and does not change stock.")) return;
    setBusyAction("reconcile");
    try {
      const result = await projectsApi.reconcileMaterialBudgetActuals(project._id);
      const { reconciledLines, skippedLines, amount, journalEntries, journalAmount } = result.data;
      const skippedNote = skippedLines ? ` ${skippedLines} line(s) had no approved project budget.` : "";
      const journalNote = journalEntries ? ` Posted ${journalEntries} missing journal entry/entries for ${Number(journalAmount).toLocaleString()} gross material movements.` : "";
      toast.success(`Reconciled ${reconciledLines} material line(s); net budget actual adjustment: ${Number(amount).toLocaleString()}.${journalNote}${skippedNote}`);
      await refresh();
    } catch (error: any) { toast.error(error?.message || "Could not reconcile material budget actuals"); }
    finally { setBusyAction(null); }
  };

  const getBudgetLinesForTask = (taskId: string) => budgetLines.filter((line) => {
    const lineProjectId = relationId(line.project_id);
    return lineProjectId === project._id || (taskId && lineProjectId === taskId);
  });

  const getBudgetLineLabel = (line: ProjectBudgetSummary["budget_lines"][number]) => {
    const account = typeof line.account_id === "object" ? line.account_id : null;
    const accountLabel = account ? `${account.code} - ${account.name}` : String(line.account_id);
    const budget = typeof line.budget_id === "object" ? line.budget_id.name : "Approved budget";
    const location = typeof line.project_id === "object"
      ? line.project_id.wbs_code || line.project_id.name
      : line.wbs_code || project.project_code;
    return `${accountLabel} · ${location} · ${line.period_month}/${line.period_year} · ${budget} · ${Number(line.budgeted_amount).toLocaleString()}`;
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">Material planning & requisitions</h3><p className="text-sm text-muted-foreground">Plan materials by task and reserve stock. Issues debit COGS and credit inventory, update budget actuals, and returns post the matching reversal.</p></div><div className="flex flex-wrap gap-2"><Button className="min-h-10 shrink-0" variant="outline" size="sm" onClick={() => void reconcileBudgetActuals()} disabled={loading || !!busyAction}>{busyAction === "reconcile" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === "reconcile" ? "Reconciling..." : "Reconcile prior issues"}</Button><Button className="min-h-10 shrink-0" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || !!busyAction}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button></div></div>
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">Select a budget line for each material if its product COGS account differs from the account on your project budget. Only approved, locked, or closed project budget lines are available.</p>
      {draft.map((line, index) => <div key={index} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div><Label>Material</Label><Select value={line.product_id} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, product_id: value } : item))}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id}>{item.name} {item.sku ? `(${item.sku})` : ""}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Warehouse</Label><Select value={line.warehouse_id} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, warehouse_id: value } : item))}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Task (optional)</Label><Select value={line.task_id || "none"} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, task_id: value === "none" ? "" : value } : item))}><SelectTrigger><SelectValue placeholder="Project level" /></SelectTrigger><SelectContent><SelectItem value="none">Project level</SelectItem>{tasks.map((task) => <SelectItem key={task._id} value={task._id}>{task.wbs_code} · {task.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Planned quantity</Label><Input type="number" min="0.0001" step="0.0001" value={line.planned_quantity} onChange={(event) => setDraft((all) => all.map((item, i) => i === index ? { ...item, planned_quantity: event.target.value } : item))} /></div>
        <div><Label>Budget line (optional)</Label><Select value={line.budget_line_id || "__auto__"} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, budget_line_id: value === "__auto__" ? "" : value } : item))}><SelectTrigger><SelectValue placeholder="Auto-match by COGS" /></SelectTrigger><SelectContent><SelectItem value="__auto__">Auto-match by COGS account</SelectItem>{getBudgetLinesForTask(line.task_id).map((budgetLine) => <SelectItem key={budgetLine._id} value={budgetLine._id}>{getBudgetLineLabel(budgetLine)}</SelectItem>)}</SelectContent></Select>{getBudgetLinesForTask(line.task_id).length ? !line.budget_line_id && <p className="mt-1 text-xs text-muted-foreground">Select a line to allocate actual costs when the product account differs.</p> : <p className="mt-1 text-xs text-muted-foreground">No approved budget lines are linked to this project/task. Create or approve one from the Budget Lines tab.</p>}</div>
      </div>)}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div><Label>Required date</Label><Input type="date" value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} /></div><div className="sm:col-span-2 xl:col-span-2"><Label>Notes</Label><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Purpose or delivery notes" /></div></div>
      <div className="grid gap-2 sm:flex"><Button className="min-h-11 w-full sm:w-auto" variant="outline" disabled={!!busyAction} onClick={() => setDraft((all) => [...all, newLine()])}><Plus className="mr-2 h-4 w-4" />Add material</Button><Button className="min-h-11 w-full sm:w-auto" onClick={() => void create()} disabled={!!busyAction}>{busyAction === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === "create" ? "Creating plan..." : "Create material plan"}</Button></div>
    </div>
    <div className="space-y-3">{rows.map((requisition) => {
      const approveKey = `approve:${requisition.id}`;
      const cancelKey = `cancel:${requisition.id}`;
      return <div key={requisition.id} className="rounded-lg border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">{requisition.requisitionNo}</h4><p className="text-xs text-muted-foreground">{requisition.status} · {requisition.requiredDate ? new Date(requisition.requiredDate).toLocaleDateString() : "No required date"}</p></div><div className="flex gap-2">
          {requisition.status === "planned" && <Button size="sm" disabled={!!busyAction} onClick={() => void runRequisitionAction(approveKey, () => projectsApi.approveMaterialRequisition(project._id, requisition.id), "Stock reserved for requisition", "Could not approve requisition")}>{busyAction === approveKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === approveKey ? "Reserving..." : "Approve & reserve"}</Button>}
          {["planned", "approved", "partially_issued"].includes(requisition.status) && <Button size="sm" variant="destructive" disabled={!!busyAction} onClick={() => void runRequisitionAction(cancelKey, () => projectsApi.cancelMaterialRequisition(project._id, requisition.id), "Material requisition cancelled", "Could not cancel requisition")}>{busyAction === cancelKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === cancelKey ? "Cancelling..." : "Cancel"}</Button>}
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={!!busyAction} onClick={() => setDeleteTarget(requisition)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
        </div></div>
        <div className="space-y-2">{requisition.lines.map((line: any) => {
          const currentlyIssued = Math.max(0, Number(line.issuedQuantity) - Number(line.returnedQuantity));
          const unissued = Math.max(0, Number(line.plannedQuantity) - currentlyIssued);
          const unreturned = currentlyIssued;
          const allocations = Array.isArray(line.trackingAllocations) ? line.trackingAllocations : [];
          const trackingLabel = allocations.filter((item: any) => item.kind === "serial").map((item: any) => item.serialNo || item.serialId).join(", ") || allocations.filter((item: any) => item.kind === "batch").map((item: any) => `${item.batchNo || item.batchId} (${Number(item.issuedQuantity || 0)}/${Number(item.quantity || 0)})`).join(", ");
          const issueKey = `issue:${line.id}`;
          const returnKey = `return:${line.id}`;
          return <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
            <div><div className="font-medium">{line.product?.name || line.productId} · {currentlyIssued} currently issued / {Number(line.plannedQuantity)} planned</div><div className="text-xs text-muted-foreground">{line.warehouse?.name || line.warehouseId}{line.task ? ` · ${line.task.wbsCode} ${line.task.name}` : ""} · {Number(line.returnedQuantity)} returned</div>{trackingLabel && <div className="mt-1 text-xs text-muted-foreground">{allocations[0]?.kind === "serial" ? "Serials" : "Batches"}: {trackingLabel}</div>}</div>
            <div className="flex gap-2">
              {["approved", "partially_issued", "issued"].includes(requisition.status) && unissued > 0 && <Button size="sm" variant="outline" disabled={!!busyAction} onClick={() => openQuantityDialog(issueKey, (qty) => projectsApi.issueProjectMaterial(project._id, requisition.id, line.id, qty), "Issue", unissued)}>{busyAction === issueKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === issueKey ? "Issuing..." : "Issue"}</Button>}
              {unreturned > 0 && Number(line.issuedQuantity) > 0 && <Button size="sm" variant="outline" disabled={!!busyAction} onClick={() => openQuantityDialog(returnKey, (qty) => projectsApi.returnProjectMaterial(project._id, requisition.id, line.id, qty), "Return", unreturned)}>{busyAction === returnKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === returnKey ? "Returning..." : "Return"}</Button>}
            </div>
          </div>;
        })}</div>
      </div>;
    })}{!loading && !rows.length && <p className="py-5 text-center text-sm text-muted-foreground">No project material plans yet.</p>}</div>
    <Dialog
      open={Boolean(quantityAction)}
      onOpenChange={(open) => {
        if (!open && !busyAction) {
          setQuantityAction(null);
          setQuantityError("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{quantityAction ? `${quantityAction.title} material` : "Material quantity"}</DialogTitle>
          <DialogDescription>
            Enter the quantity to {quantityAction?.title.toLowerCase()}. Maximum available: {quantityAction?.maximum}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="material-quantity">Quantity</Label>
          <Input
            id="material-quantity"
            type="number"
            min="0.0001"
            max={quantityAction?.maximum}
            step="any"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setQuantityError("");
            }}
            aria-invalid={Boolean(quantityError)}
            aria-describedby={quantityError ? "material-quantity-error" : undefined}
            autoFocus
          />
          {quantityError && <p id="material-quantity-error" className="text-sm text-destructive">{quantityError}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={!!busyAction} onClick={() => { setQuantityAction(null); setQuantityError(""); }}>Cancel</Button>
          <Button type="button" disabled={!quantityAction || !!busyAction} onClick={() => void submitQuantityAction()}>
            {busyAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {busyAction ? quantityAction?.title === "Issue" ? "Issuing..." : "Returning..." : quantityAction?.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !busyAction) setDeleteTarget(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete material requisition?</DialogTitle>
          <DialogDescription>
            {deleteTarget?.lines?.some((line: any) => Number(line.issuedQuantity) > 0 || Number(line.returnedQuantity) > 0)
              ? "This requisition has stock movement history. It will be archived and hidden from this panel; inventory, budget, journal, and audit history will be preserved."
              : "This will permanently delete this requisition and release any stock reserved for it."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={!!busyAction} onClick={() => setDeleteTarget(null)}>Keep requisition</Button>
          <Button type="button" variant="destructive" disabled={!deleteTarget || !!busyAction} onClick={() => void deleteRequisition()}>
            {busyAction?.startsWith("delete:") && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {busyAction?.startsWith("delete:") ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
