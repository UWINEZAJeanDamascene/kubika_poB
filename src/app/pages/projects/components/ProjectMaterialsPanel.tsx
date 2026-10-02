import { useEffect, useState } from "react";
import { projectsApi, productsApi, warehousesApi, type Project } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";

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
    const lines = draft.map((line) => ({ ...line, planned_quantity: Number(line.planned_quantity) })).filter((line) => line.product_id && line.warehouse_id && line.planned_quantity > 0);
    if (!lines.length) { toast.error("Choose a material, warehouse, and planned quantity"); return; }
    try {
      await projectsApi.createMaterialRequisition(project._id, { lines, required_date: requiredDate || null, notes });
      toast.success("Material plan created"); setDraft([newLine()]); setNotes(""); setRequiredDate(""); await refresh();
    } catch (error: any) { toast.error(error?.message || "Could not create material plan"); }
  };
  const runAction = async (action: (quantity: number) => Promise<unknown>, title: string, defaultQuantity = 1) => {
    const raw = window.prompt(`${title} quantity`, String(defaultQuantity));
    if (raw === null) return;
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0) { toast.error("Enter a quantity greater than zero"); return; }
    try { await action(quantity); toast.success(`${title} recorded`); await refresh(); }
    catch (error: any) { toast.error(error?.message || `Could not ${title.toLowerCase()}`); }
  };

  return <div className="space-y-5">
    <div className="flex items-center justify-between"><div><h3 className="font-semibold">Material planning & requisitions</h3><p className="text-sm text-muted-foreground">Plan materials by task, reserve stock, and record warehouse issues and returns.</p></div><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <div className="space-y-3 rounded-lg border p-4">
      {draft.map((line, index) => <div key={index} className="grid gap-3 md:grid-cols-4">
        <div><Label>Material</Label><Select value={line.product_id} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, product_id: value } : item))}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id}>{item.name} {item.sku ? `(${item.sku})` : ""}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Warehouse</Label><Select value={line.warehouse_id} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, warehouse_id: value } : item))}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Task (optional)</Label><Select value={line.task_id || "none"} onValueChange={(value) => setDraft((all) => all.map((item, i) => i === index ? { ...item, task_id: value === "none" ? "" : value } : item))}><SelectTrigger><SelectValue placeholder="Project level" /></SelectTrigger><SelectContent><SelectItem value="none">Project level</SelectItem>{tasks.map((task) => <SelectItem key={task._id} value={task._id}>{task.wbs_code} · {task.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Planned quantity</Label><Input type="number" min="0.0001" step="0.0001" value={line.planned_quantity} onChange={(event) => setDraft((all) => all.map((item, i) => i === index ? { ...item, planned_quantity: event.target.value } : item))} /></div>
      </div>)}
      <div className="grid gap-3 md:grid-cols-3"><div><Label>Required date</Label><Input type="date" value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} /></div><div className="md:col-span-2"><Label>Notes</Label><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Purpose or delivery notes" /></div></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setDraft((all) => [...all, newLine()])}><Plus className="mr-2 h-4 w-4" />Add material</Button><Button onClick={() => void create()}>Create material plan</Button></div>
    </div>
    <div className="space-y-3">{rows.map((requisition) => <div key={requisition.id} className="rounded-lg border p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">{requisition.requisitionNo}</h4><p className="text-xs text-muted-foreground">{requisition.status} · {requisition.requiredDate ? new Date(requisition.requiredDate).toLocaleDateString() : "No required date"}</p></div><div className="flex gap-2">{requisition.status === "planned" && <Button size="sm" onClick={async () => { try { await projectsApi.approveMaterialRequisition(project._id, requisition.id); toast.success("Stock reserved for requisition"); await refresh(); } catch (error: any) { toast.error(error?.message || "Could not approve requisition"); } }}>Approve & reserve</Button>}{["planned", "approved", "partially_issued"].includes(requisition.status) && <Button size="sm" variant="destructive" onClick={async () => { try { await projectsApi.cancelMaterialRequisition(project._id, requisition.id); toast.success("Material requisition cancelled"); await refresh(); } catch (error: any) { toast.error(error?.message || "Could not cancel requisition"); } }}>Cancel</Button>}</div></div>
        <div className="space-y-2">{requisition.lines.map((line: any) => { const unissued = Number(line.plannedQuantity) - Number(line.issuedQuantity); const unreturned = Number(line.issuedQuantity) - Number(line.returnedQuantity); return <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm"><div><div className="font-medium">{line.product?.name || line.productId} · {Number(line.issuedQuantity)} issued / {Number(line.plannedQuantity)} planned</div><div className="text-xs text-muted-foreground">{line.warehouse?.name || line.warehouseId}{line.task ? ` · ${line.task.wbsCode} ${line.task.name}` : ""} · {Number(line.returnedQuantity)} returned</div></div><div className="flex gap-2">{["approved", "partially_issued"].includes(requisition.status) && unissued > 0 && <Button size="sm" variant="outline" onClick={() => void runAction((qty) => projectsApi.issueProjectMaterial(project._id, requisition.id, line.id, qty), "Issue", unissued)}>Issue</Button>}{unreturned > 0 && Number(line.issuedQuantity) > 0 && <Button size="sm" variant="outline" onClick={() => void runAction((qty) => projectsApi.returnProjectMaterial(project._id, requisition.id, line.id, qty), "Return", unreturned)}>Return</Button>}</div></div>; })}</div></div>)}{!loading && !rows.length && <p className="py-5 text-center text-sm text-muted-foreground">No project material plans yet.</p>}</div>
  </div>;
}
