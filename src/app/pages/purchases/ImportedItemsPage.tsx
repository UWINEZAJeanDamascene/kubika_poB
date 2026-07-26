import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { DownloadCloud, Loader2, RefreshCw } from "lucide-react";
import { EmptyState } from "@/app/components/EmptyState";
import { toast } from "sonner";
import { ebmApi, productsApi, warehousesApi, suppliersApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

interface ImportedItem {
  _id: string;
  importTaskCode: string;
  importDeclarationNo?: string;
  importDate?: string;
  itemName: string;
  itemClassCode?: string;
  quantity: number;
  unitCode?: string;
  originCountryCode?: string;
  supplierName?: string;
  unitCost?: number;
  confirmationStatus: "pending" | "confirmed" | "rejected";
  confirmationError?: string | null;
  stockUpdated?: boolean;
  stockUpdateError?: string | null;
  grn?: { _id: string; referenceNo: string; status: string } | null;
}

interface OptionItem {
  _id: string;
  name: string;
  sku?: string;
  code?: string;
  rraBranchId?: string | null;
}

const statusClass: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export function ImportedItemsContent({ branchId }: { branchId?: string } = {}) {
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [products, setProducts] = useState<OptionItem[]>([]);
  const [warehouses, setWarehouses] = useState<OptionItem[]>([]);
  const [suppliers, setSuppliers] = useState<OptionItem[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncBranchId, setSyncBranchId] = useState<string>("00");
  const [selected, setSelected] = useState<
    Record<
      string,
      {
        productId?: string;
        warehouseId?: string;
        supplierId?: string;
        reason?: string;
      }
    >
  >({});

  const fetchImports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ebmApi.getImportedItems({
        status: status === "all" ? undefined : status,
      });
      setItems((res.data || []) as ImportedItem[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to load imported items");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  useEffect(() => {
    if (branchId) setSyncBranchId(branchId);
  }, [branchId]);

  useEffect(() => {
    Promise.all([
      productsApi.getAll({ limit: 500 }),
      warehousesApi.getAll({ limit: 200, isActive: true }),
      suppliersApi.getAll({ limit: 200 }),
    ])
      .then(([productRes, warehouseRes, supplierRes]) => {
        const productData = productRes.data as any;
        setProducts(
          (Array.isArray(productData)
            ? productData
            : productData?.data || []) as OptionItem[],
        );
        const warehouseData = warehouseRes.data as any;
        const warehouseList = (
          Array.isArray(warehouseData)
            ? warehouseData
            : warehouseData?.data || []
        ) as OptionItem[];
        setWarehouses(warehouseList);
        const firstBranch = warehouseList.find((w) => w.rraBranchId);
        if (firstBranch?.rraBranchId) setSyncBranchId(firstBranch.rraBranchId);
        const supplierData = supplierRes.data as any;
        setSuppliers(
          (Array.isArray(supplierData)
            ? supplierData
            : supplierData?.data || []) as OptionItem[],
        );
      })
      .catch(() => {
        toast.error("Failed to load product, warehouse, or supplier options");
      });
  }, []);

  const ebmBranches = useMemo(
    () => warehouses.filter((w) => w.rraBranchId),
    [warehouses],
  );

  const counts = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.confirmationStatus === "pending")
        .length,
      confirmed: items.filter((item) => item.confirmationStatus === "confirmed")
        .length,
      rejected: items.filter((item) => item.confirmationStatus === "rejected")
        .length,
    }),
    [items],
  );

  const updateSelected = (id: string, patch: Record<string, string>) => {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const syncImports = async () => {
    setSyncing(true);
    try {
      await ebmApi.syncImportedItems({ branchId: syncBranchId });
      toast.success("Imported items pulled from RRA");
      fetchImports();
    } catch (error: any) {
      toast.error(error.message || "Import sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const confirmImport = async (item: ImportedItem) => {
    const form = selected[item._id] || {};
    if (!form.productId || !form.warehouseId) {
      toast.error("Select a product and warehouse before confirming");
      return;
    }
    setBusyId(item._id);
    try {
      const selectedWarehouse = warehouses.find(
        (w) => w._id === form.warehouseId,
      );
      const branchId = selectedWarehouse?.rraBranchId || syncBranchId;
      await ebmApi.confirmImportedItem(item._id, {
        productId: form.productId,
        warehouseId: form.warehouseId,
        supplierId: form.supplierId,
        unitCost: item.unitCost,
        branchId,
      });
      toast.success("Import confirmed and GRN flow triggered");
      fetchImports();
    } catch (error: any) {
      toast.error(error.message || "Import confirmation failed");
    } finally {
      setBusyId(null);
    }
  };

  const rejectImport = async (item: ImportedItem) => {
    const reason = selected[item._id]?.reason || "";
    if (!reason.trim()) {
      toast.error("Enter a rejection reason first");
      return;
    }
    setBusyId(item._id);
    try {
      await ebmApi.rejectImportedItem(item._id, reason);
      toast.success("Imported item rejected");
      fetchImports();
    } catch (error: any) {
      toast.error(error.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
            Imported Goods
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pull customs-declared imports from RRA and receive confirmed goods
            through GRN.
          </p>
        </div>
          <div className="flex items-center gap-2">
            {ebmBranches.length > 0 ? (
              <Select value={syncBranchId} onValueChange={setSyncBranchId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ebmBranches.map((w) => (
                    <SelectItem key={w._id} value={w.rraBranchId!}>
                      {w.name} ({w.rraBranchId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-slate-500">
                Branch: {syncBranchId}
              </span>
            )}
            <Button onClick={syncImports} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloud className="mr-2 h-4 w-4" />
              )}
              Pull from RRA
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(counts).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {key}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">RRA Import Records</CardTitle>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                imports
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Declaration</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receiving mapping</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <p className="font-medium">
                            {item.importDeclarationNo || item.importTaskCode}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.importDate
                              ? new Date(item.importDate).toLocaleDateString()
                              : "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-slate-500">
                            {item.itemClassCode || "-"}{" "}
                            {item.supplierName ? `- ${item.supplierName}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          {item.quantity} {item.unitCode || ""}
                        </TableCell>
                        <TableCell>{item.originCountryCode || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusClass[item.confirmationStatus]}
                          >
                            {item.confirmationStatus}
                          </Badge>
                          {item.grn && (
                            <Link
                              to={`/grn/${item.grn._id}`}
                              className="mt-1 block text-xs text-blue-600 hover:underline"
                            >
                              {item.grn.referenceNo}
                            </Link>
                          )}
                          {item.stockUpdateError && (
                            <p className="mt-1 max-w-xs text-xs text-red-600">
                              {item.stockUpdateError}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="grid min-w-64 gap-2">
                            <Select
                              value={selected[item._id]?.productId || ""}
                              onValueChange={(value) =>
                                updateSelected(item._id, { productId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem
                                    key={product._id}
                                    value={product._id}
                                  >
                                    {product.name}{" "}
                                    {product.sku ? `(${product.sku})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={selected[item._id]?.warehouseId || ""}
                              onValueChange={(value) =>
                                updateSelected(item._id, { warehouseId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Warehouse" />
                              </SelectTrigger>
                              <SelectContent>
                                {warehouses.map((warehouse) => (
                                  <SelectItem
                                    key={warehouse._id}
                                    value={warehouse._id}
                                  >
                                    {warehouse.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={selected[item._id]?.supplierId || ""}
                              onValueChange={(value) =>
                                updateSelected(item._id, { supplierId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Supplier optional" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map((supplier) => (
                                  <SelectItem
                                    key={supplier._id}
                                    value={supplier._id}
                                  >
                                    {supplier.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.confirmationStatus === "pending" ? (
                            <div className="flex min-w-64 flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => confirmImport(item)}
                                disabled={busyId === item._id}
                              >
                                {busyId === item._id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Confirm
                              </Button>
                              <Input
                                placeholder="Rejection reason"
                                value={selected[item._id]?.reason || ""}
                                onChange={(event) =>
                                  updateSelected(item._id, {
                                    reason: event.target.value,
                                  })
                                }
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectImport(item)}
                                disabled={busyId === item._id}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">
                              No action
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="border-0 py-2">
                          <EmptyState
                            compact
                            icon={DownloadCloud}
                            title="No imported items yet"
                            description="EBM-imported stock items will appear here once goods are received via the EBM system."
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

export default function ImportedItemsPage() {
  return (
    <Layout>
      <ImportedItemsContent />
    </Layout>
  );
}
