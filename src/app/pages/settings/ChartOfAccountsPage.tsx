import { useState, useEffect, useCallback } from "react";
import { chartOfAccountsApi, ChartOfAccountItem } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Plus,
  RefreshCw,
  Loader2,
  BookOpen,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowDownUp,
  Landmark,
  Scale,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Package,
  BadgeCheck,
  AlertCircle,
  Layers,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// Account type colors (ring-based for badges)
const typeColorClasses: Record<string, string> = {
  asset: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  liability: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  equity: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
  revenue: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  expense: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
  cogs: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
};

// Account type bar/dot colors
const typeDotColors: Record<string, string> = {
  asset: "#3b82f6",
  liability: "#f59e0b",
  equity: "#6366f1",
  revenue: "#10b981",
  expense: "#ef4444",
  cogs: "#f43f5e",
};

// Account type labels
const typeLabels: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
  cogs: "Cost of Goods Sold",
};

// Account type icons
const typeIcons: Record<string, React.ReactNode> = {
  asset: <Landmark className="h-4 w-4" />,
  liability: <Scale className="h-4 w-4" />,
  equity: <PiggyBank className="h-4 w-4" />,
  revenue: <TrendingUp className="h-4 w-4" />,
  expense: <TrendingDown className="h-4 w-4" />,
  cogs: <Package className="h-4 w-4" />,
};

export default function ChartOfAccountsPage() {
  useTranslation();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, ChartOfAccountItem[]>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<ChartOfAccountItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<any>(null);
  const [filterType, setFilterType] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Expanded sections in tree view
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    asset: true,
    liability: true,
    equity: true,
    revenue: true,
    expense: true,
    cogs: true,
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    type: "expense",
    subtype: "",
    normal_balance: "debit",
    allow_direct_posting: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    subtype: "",
    normal_balance: "debit",
    allow_direct_posting: true,
    isActive: true,
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (showInactive) params.includeInactive = "true";

      const response = await chartOfAccountsApi.getAll(params);
      if (response.success) {
        setAccounts(response.data || []);
        setGrouped(response.grouped || {});
      }
    } catch (error) {
      console.error("[ChartOfAccountsPage] Failed to fetch accounts:", error);
      toast.error("Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  }, [filterType, showInactive]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!createForm.code || !createForm.name || !createForm.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.create({
        code: createForm.code,
        name: createForm.name,
        type: createForm.type,
        subtype: createForm.subtype || undefined,
        normal_balance: createForm.normal_balance,
        allow_direct_posting: createForm.allow_direct_posting,
      });

      if (response.success) {
        toast.success("Account created successfully");
        setShowCreateDialog(false);
        setCreateForm({
          code: "",
          name: "",
          type: "expense",
          subtype: "",
          normal_balance: "debit",
          allow_direct_posting: true,
        });
        fetchAccounts();
      } else {
        toast.error(response.message || "Failed to create account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Create error:", error);
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to create account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.update(selectedAccount._id, {
        name: editForm.name,
        subtype: editForm.subtype || undefined,
        normal_balance: editForm.normal_balance,
        allow_direct_posting: editForm.allow_direct_posting,
        isActive: editForm.isActive,
      });

      if (response.success) {
        toast.success("Account updated successfully");
        setShowEditDialog(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        toast.error("Failed to update account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Update error:", error);
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to update account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.delete(selectedAccount._id);

      if (response.success) {
        if (response.softDelete) {
          toast.warning(
            response.message || "Account deactivated (has journal entries)",
          );
        } else {
          toast.success("Account deleted successfully");
        }
        setShowDeleteDialog(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Delete error:", error);
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to delete account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (account: ChartOfAccountItem) => {
    setSubmitting(true);
    try {
      const response = await chartOfAccountsApi.reactivate(account._id);
      if (response.success) {
        toast.success("Account reactivated successfully");
        fetchAccounts();
      } else {
        toast.error("Failed to reactivate account");
      }
    } catch (error: any) {
      console.error("[ChartOfAccountsPage] Reactivate error:", error);
      toast.error(error.message || "Failed to reactivate account");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (account: ChartOfAccountItem) => {
    setSelectedAccount(account);
    setEditForm({
      name: account.name,
      subtype: account.subtype || "",
      normal_balance: account.normal_balance,
      allow_direct_posting: account.allow_direct_posting,
      isActive: account.isActive,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (account: ChartOfAccountItem) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  // ── Sync accounts ─────────────────────────────────────────────────
  const handleSyncPreview = async () => {
    setSyncing(true);
    setSyncPreview(null);
    try {
      const res = await chartOfAccountsApi.syncAccounts(true); // dry_run = true
      setSyncPreview(res.data);
      setShowSyncDialog(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to preview sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncApply = async () => {
    setSyncing(true);
    try {
      const res = await chartOfAccountsApi.syncAccounts(false); // apply
      const { inserted, updated, errors } = res.data;
      if (errors && errors.length > 0) {
        toast.warning(
          `Sync complete with ${errors.length} error(s). Inserted: ${inserted.length}, Updated: ${updated.length}`,
        );
      } else {
        toast.success(
          res.message ||
            `Sync complete. Inserted: ${inserted.length}, Updated: ${updated.length}`,
        );
      }
      setShowSyncDialog(false);
      setSyncPreview(null);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply sync");
    } finally {
      setSyncing(false);
    }
  };

  const toggleSection = (type: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Filter accounts by search query
  const filterBySearch = (accountList: ChartOfAccountItem[]) => {
    if (!searchQuery) return accountList;
    const query = searchQuery.toLowerCase();
    return accountList.filter(
      (acc) =>
        acc.code.toLowerCase().includes(query) ||
        acc.name.toLowerCase().includes(query),
    );
  };

  const renderAccountRow = (account: ChartOfAccountItem) => (
    <TableRow
      key={account._id}
      className={!account.isActive ? "opacity-50 dark:opacity-60" : "dark:border-slate-800 dark:hover:bg-slate-900/50"}
    >
      <TableCell className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{account.code}</TableCell>
      <TableCell className="text-sm font-medium text-slate-800 dark:text-slate-200">{account.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`gap-1 text-xs ${typeColorClasses[account.type] || "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/30 dark:text-slate-400 dark:ring-slate-800"}`}>
          {typeIcons[account.type]}
          {account.type}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-slate-600 dark:text-slate-400">{account.subtype || "-"}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            account.normal_balance === "debit"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
          }
        >
          {account.normal_balance}
        </Badge>
      </TableCell>
      <TableCell>
        {account.allow_direct_posting ? (
          <BadgeCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        )}
      </TableCell>
      <TableCell>
        {account.isActive ? (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
            Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(account)}
            title="Edit"
            className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          {account.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(account)}
              title="Deactivate"
              className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleReactivate(account)}
              title="Reactivate"
              className="h-8 w-8 text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderSection = (type: string) => {
    const sectionAccounts = filterBySearch(grouped[type] || []);
    if (sectionAccounts.length === 0) return null;

    const isExpanded = expandedSections[type];
    const totalCount = sectionAccounts.length;
    const activeCount = sectionAccounts.filter((a) => a.isActive).length;
    const inactiveCount = totalCount - activeCount;

    return (
      <div key={type} className="mb-4">
        <div
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          onClick={() => toggleSection(type)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          )}
          <div className={`rounded-md p-1.5 ring-1 ${typeColorClasses[type] || ""}`}>
            {typeIcons[type]}
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {typeLabels[type] || type}
          </span>
          <Badge variant="secondary" className="h-6 text-xs">
            {totalCount}
          </Badge>
          {inactiveCount > 0 && (
            <Badge variant="outline" className="h-6 text-xs border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {inactiveCount} inactive
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: typeDotColors[type] || "#94a3b8" }} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeCount} active
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-800">
            <div className="space-y-2 p-3 xl:hidden">
              {sectionAccounts.map((account) => (
                <div key={account._id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">{account.code}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{account.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{account.subtype || account.type}</p></div>
                    <Badge variant="outline" className={account.isActive ? "shrink-0 border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400" : "shrink-0 text-slate-500"}>{account.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><Badge variant="outline" className={account.normal_balance === "debit" ? "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-400" : "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"}>{account.normal_balance} balance</Badge><Badge variant="outline">{account.allow_direct_posting ? "Direct posting" : "Parent account"}</Badge></div>
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"><Button variant="outline" size="sm" onClick={() => openEditDialog(account)} className="min-h-10 flex-1"><Edit className="mr-2 h-4 w-4"/>Edit</Button>{account.isActive ? <Button variant="outline" size="sm" onClick={() => openDeleteDialog(account)} className="min-h-10 flex-1 text-red-600"><Trash2 className="mr-2 h-4 w-4"/>Deactivate</Button> : <Button variant="outline" size="sm" onClick={() => handleReactivate(account)} className="min-h-10 flex-1 text-emerald-600"><RefreshCw className="mr-2 h-4 w-4"/>Reactivate</Button>}</div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto xl:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="w-24 text-xs font-semibold text-slate-600 dark:text-slate-400">Code</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Subtype</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Normal Bal.</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Direct Post</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{sectionAccounts.map(renderAccountRow)}</TableBody>
            </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Chart of Accounts</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Manage your accounting structure · {accounts.length} total accounts
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-6 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                    {accounts.filter((a) => a.isActive).length} Active
                  </Badge>
                  <Badge variant="outline" className="h-6 border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                    {accounts.filter((a) => !a.isActive).length} Inactive
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncPreview}
                  disabled={syncing}
                  className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownUp className="h-4 w-4" />
                  )}
                  Sync Accounts
                </Button>
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {[
              { key: "asset", label: "Assets", icon: Landmark },
              { key: "liability", label: "Liabilities", icon: Scale },
              { key: "equity", label: "Equity", icon: PiggyBank },
              { key: "revenue", label: "Revenue", icon: TrendingUp },
              { key: "expense", label: "Expenses", icon: TrendingDown },
              { key: "cogs", label: "COGS", icon: Package },
            ].map((item) => {
              const count = (grouped[item.key] || []).length;
              const active = (grouped[item.key] || []).filter((a) => a.isActive).length;
              const Icon = item.icon;
              return (
                <Card
                  key={item.key}
                  className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => toggleSection(item.key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                          {count}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {active} active
                        </p>
                      </div>
                      <div className={`rounded-lg p-2 ring-1 ${typeColorClasses[item.key] || ""}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-full sm:w-44 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="cogs">COGS</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 cursor-pointer h-9">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Show Inactive</span>
            </label>
            <Button variant="outline" size="sm" onClick={fetchAccounts} className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Tree View */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Layers className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No accounts found</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Click "Add Account" to create your first chart of account</p>
            </div>
          ) : (
            <div>
              {["asset", "liability", "equity", "revenue", "expense", "cogs"].map(renderSection)}
            </div>
          )}

        {/* Create Account Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <Plus className="h-5 w-5 text-indigo-500" />
                Add New Account
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Create a new chart of account. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Code *</Label>
                  <Input
                    placeholder="e.g., 6100"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type *</Label>
                  <Select value={createForm.type} onValueChange={(v) => setCreateForm({ ...createForm, type: v, normal_balance: ["asset", "expense", "cogs"].includes(v) ? "debit" : "credit" })}>
                    <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="cogs">COGS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name *</Label>
                <Input
                  placeholder="Account name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subtype</Label>
                  <Input
                    placeholder="e.g., current, operating"
                    value={createForm.subtype}
                    onChange={(e) => setCreateForm({ ...createForm, subtype: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Normal Balance</Label>
                  <Select value={createForm.normal_balance} onValueChange={(v) => setCreateForm({ ...createForm, normal_balance: v })}>
                    <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="allowDirectPosting"
                  checked={createForm.allow_direct_posting}
                  onChange={(e) => setCreateForm({ ...createForm, allow_direct_posting: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                />
                <Label htmlFor="allowDirectPosting" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  Allow Direct Posting
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <Edit className="h-5 w-5 text-blue-500" />
                Edit Account
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Update account details. Code cannot be changed.
              </DialogDescription>
            </DialogHeader>
            {selectedAccount && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Code</Label>
                    <Input value={selectedAccount.code} disabled className="bg-slate-50 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</Label>
                    <Input value={selectedAccount.type} disabled className="bg-slate-50 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subtype</Label>
                    <Input value={editForm.subtype} onChange={(e) => setEditForm({ ...editForm, subtype: e.target.value })} className="dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Normal Balance</Label>
                    <Select value={editForm.normal_balance} onValueChange={(v) => setEditForm({ ...editForm, normal_balance: v })}>
                      <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.allow_direct_posting} onChange={(e) => setEditForm({ ...editForm, allow_direct_posting: e.target.checked })} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Allow Direct Posting</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
                  </label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <Trash2 className="h-5 w-5 text-red-500" />
                Deactivate Account
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {selectedAccount && (
                  <>
                    Are you sure you want to deactivate account{" "}
                    <strong className="text-slate-900 dark:text-slate-200">
                      {selectedAccount.code} — {selectedAccount.name}
                    </strong>
                    ?
                    <br />
                    <br />
                    If this account has journal entries, it will be deactivated instead of deleted. You can reactivate it later.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sync Accounts Dialog */}
        <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <ArrowDownUp className="h-5 w-5 text-indigo-500" />
                Sync Chart of Accounts
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Preview of changes that will be applied from the system chart of accounts definition.
              </DialogDescription>
            </DialogHeader>

            {syncPreview && (
              <div className="space-y-4 py-2">
                {/* Summary badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1">
                    {syncPreview.inserted?.length ?? 0} to insert
                  </Badge>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1">
                    {syncPreview.updated?.length ?? 0} to update
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400 px-3 py-1">
                    {syncPreview.skipped ?? 0} already current
                  </Badge>
                  {syncPreview.errors?.length > 0 && (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 px-3 py-1">
                      {syncPreview.errors.length} errors
                    </Badge>
                  )}
                </div>

                {/* Accounts to insert */}
                {syncPreview.inserted?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> New accounts to add
                    </h4>
                    <div className="rounded-lg border border-slate-200 divide-y text-sm dark:border-slate-800 dark:divide-slate-800">
                      {syncPreview.inserted.map((item: any) => (
                        <div key={item.code} className="flex items-center justify-between px-3 py-2 dark:bg-slate-950/30">
                          <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400 w-16">{item.code}</span>
                          <span className="flex-1 text-slate-700 dark:text-slate-300">{item.name}</span>
                          {item.subtype && (
                            <Badge variant="outline" className="text-xs ml-2 dark:border-slate-700 dark:text-slate-400">
                              {item.subtype}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accounts to update */}
                {syncPreview.updated?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <Edit className="h-4 w-4" /> Accounts to update
                    </h4>
                    <div className="rounded-lg border border-slate-200 divide-y text-sm dark:border-slate-800 dark:divide-slate-800">
                      {syncPreview.updated.map((item: any) => (
                        <div key={item.code} className="px-3 py-2 dark:bg-slate-950/30">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-amber-700 dark:text-amber-400 w-16">{item.code}</span>
                            <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                          </div>
                          {item.changes && Object.entries(item.changes).map(([field, change]: [string, any]) => (
                            <div key={field} className="pl-18 text-xs text-slate-500 dark:text-slate-400 ml-16">
                              <span className="font-medium">{field}:</span>{" "}
                              <span className="line-through text-red-400">{String(change.from ?? "null")}</span>
                              {" → "}
                              <span className="text-emerald-600 dark:text-emerald-400">{String(change.to ?? "null")}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nothing to do */}
                {syncPreview.inserted?.length === 0 && syncPreview.updated?.length === 0 && (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">All accounts are already up-to-date!</p>
                    <p className="text-sm mt-1">No changes needed.</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowSyncDialog(false); setSyncPreview(null); }} className="dark:border-slate-700 dark:text-slate-200">
                Cancel
              </Button>
              {syncPreview && (syncPreview.inserted?.length > 0 || syncPreview.updated?.length > 0) && (
                <Button onClick={handleSyncApply} disabled={syncing} className="bg-indigo-600 hover:bg-indigo-700">
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownUp className="mr-2 h-4 w-4" />}
                  Apply {(syncPreview.inserted?.length ?? 0) + (syncPreview.updated?.length ?? 0)} changes
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </Layout>
  );
}
