import { useEffect, useState } from "react";
import { projectsApi, productsApi, warehousesApi, type Project } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw } from "lucide-react";

type MaterialLineDraft = { product_id: string; warehouse_id: string; task_id: string; planned_quantity: string };
const newLine = (): MaterialLineDraft => ({ product_id: "", warehouse_id: "", task_id: "", planned_quantity: "1" });
const arrayData = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.products) ? value.products : Array.isArray(value?.warehouses) ? value.warehouses : [];
const flattenTasks = (nodes: any[]): Project[] => nodes.flatMap((node) => [node, ...flattenTasks(Array.isArray(node.children) ? node.children : [])]).filter((node) => node.type === "task");

export default function ProjectMaterialsPanel({ project }: { project: Project }) {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Project[]>([]);
  const [draft, setDraft] = useState<MaterialLineDraft[]>([newLine()]);
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [project._id]);

  const create = async () => {
    if (busyAction) return;
    const lines = draft.map((line) => ({ ...line, planned_quantity: Number(line.planned_quantity) })).filter((line) => line.product_id && line.warehouse_id && line.planned_quantity > 0);
    if (!lines.length) { toast.error("Choose a material, warehouse, and planned quantity"); return; }
    setBusyAction("create");
    try {
      await projectsApi.createMaterialRequisition(project._id, { lines, required_date: requiredDate || null, notes });
      toast.success("Material plan created"); setDraft([newLine()]); setNotes(""); setRequiredDate(""); await refresh();
    } catch (error: any) { toast.error(error?.message || "Could not create material plan"); }
    finally { setBusyAction(null); }
  };

  const runAction = async (key: string, action: (quantity: number) => Promise<unknown>, title: string, defaultQuantity = 1) => {
    if (busyAction) return;
    const raw = window.prompt(`${title} quantity`, String(defaultQuantity));
    if (raw === null) return;
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0) { toast.error("Enter a quantity greater than zero"); return; }
    setBusyAction(key);
    try { await action(quantity); toast.success(`${title} recorded`); await refresh(); }
    catch (error: any) { toast.error(error?.message || `Could not ${title.toLowerCase()}`); }
    finally { setBusyAction(null); }
  };

  const runRequisitionAction = async (key: string, action: () => Promise<unknown>, successMessage: string, errorMessage: string) => {
    if (busyAction) return;
    setBusyAction(key);
    try { await action(); toast.success(successMessage); await refresh(); }
    catch (error: any) { toast.error(error?.message || errorMessage); }
    finally { setBusyAction(null); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">Material planning & requisitions</h3><p className="text-sm text-muted-foreground">Plan materials by task, reserve stock, and record warehouse issues and returns.</p></div><Button className="min-h-10 shrink-0" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || !!busyAction}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button></div>
    <div className="space-y-3 rounded-lg border p-4">
      {draft.map((line, index) => <div key={index} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div><Label>Material</Label><Select value={line.product_id} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, product_id: value } : item))}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id}>{item.name} {item.sku ? `(${item.sku})` : ""}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Warehouse</Label><Select value={line.warehouse_id} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, warehouse_id: value } : item))}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Task (optional)</Label><Select value={line.task_id || "none"} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, task_id: value === "none" ? "" : value } : item))}><SelectTrigger><SelectValue placeholder="Project level" /></SelectTrigger><SelectContent><SelectItem value="none">Project level</SelectItem>{tasks.map((task) => <SelectItem key={task._id} value={task._id}>{task.wbs_code} · {task.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Planned quantity</Label><Input type="number" min="0.0001" step="0.0001" value={line.planned_quantity} onChange={(event) => setDraft((all) => all.map((item, i) => i === index ? { ...item, planned_quantity: event.target.value } : item))} /></div>
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
        </div></div>
        <div className="space-y-2">{requisition.lines.map((line: any) => {
          const unissued = Number(line.plannedQuantity) - Number(line.issuedQuantity);
          const unreturned = Number(line.issuedQuantity) - Number(line.returnedQuantity);
          const allocations = Array.isArray(line.trackingAllocations) ? line.trackingAllocations : [];
          const trackingLabel = allocations.filter((item: any) => item.kind === "serial").map((item: any) => item.serialNo || item.serialId).join(", ") || allocations.filter((item: any) => item.kind === "batch").map((item: any) => `${item.batchNo || item.batchId} (${Number(item.issuedQuantity || 0)}/${Number(item.quantity || 0)})`).join(", ");
          const issueKey = `issue:${line.id}`;
          const returnKey = `return:${line.id}`;
          return <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
            <div><div className="font-medium">{line.product?.name || line.productId} · {Number(line.issuedQuantity)} issued / {Number(line.plannedQuantity)} planned</div><div className="text-xs text-muted-foreground">{line.warehouse?.name || line.warehouseId}{line.task ? ` · ${line.task.wbsCode} ${line.task.name}` : ""} · {Number(line.returnedQuantity)} returned</div>{trackingLabel && <div className="mt-1 text-xs text-muted-foreground">{allocations[0]?.kind === "serial" ? "Serials" : "Batches"}: {trackingLabel}</div>}</div>
            <div className="flex gap-2">
              {["approved", "partially_issued"].includes(requisition.status) && unissued > 0 && <Button size="sm" variant="outline" disabled={!!busyAction} onClick={() => void runAction(issueKey, (qty) => projectsApi.issueProjectMaterial(project._id, requisition.id, line.id, qty), "Issue", unissued)}>{busyAction === issueKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === issueKey ? "Issuing..." : "Issue"}</Button>}
              {unreturned > 0 && Number(line.issuedQuantity) > 0 && <Button size="sm" variant="outline" disabled={!!busyAction} onClick={() => void runAction(returnKey, (qty) => projectsApi.returnProjectMaterial(project._id, requisition.id, line.id, qty), "Return", unreturned)}>{busyAction === returnKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busyAction === returnKey ? "Returning..." : "Return"}</Button>}
            </div>
          </div>;
        })}</div>
      </div>;
    })}{!loading && !rows.length && <p className="py-5 text-center text-sm text-muted-foreground">No project material plans yet.</p>}</div>
  </div>;
}
