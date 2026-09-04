import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { pettyCashApi, bankAccountsApi, chartOfAccountsApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Plus,
  Eye,
  RefreshCw,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  Pencil,
  RotateCcw,
  Info,
  Calculator,
  ClipboardCheck,
  Scale,
  ArrowUpCircle,
  ScrollText,
  BadgeCheck,
  Banknote,
  PiggyBank,
  FileText,
  Receipt,
  Layers,
  Landmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Switch } from "@/app/components/ui/switch";
import { Checkbox } from "@/app/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function PettyCashListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<any[]>([]);
  const [fundPage, setFundPage] = useState(1);
  const [fundPages, setFundPages] = useState(1);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // ── Dialog visibility ────────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showReplenishDialog, setShowReplenishDialog] = useState(false);
  const [showCashCountDialog, setShowCashCountDialog] = useState(false);
  const [showReconciliationsDialog, setShowReconciliationsDialog] = useState(false);
  const [showImprestDialog, setShowImprestDialog] = useState(false);

  // ── Selected fund for dialogs ────────────────────────────────────────────────
  const [selectedFund, setSelectedFund] = useState<any | null>(null);

  // ── Create Fund form (no custodianId — backend defaults to req.user) ─────────
  const [newFundForm, setNewFundForm] = useState({
    name: "",
    floatAmount: 0,
    openingBalance: 0,
    imprestMode: true,
    notes: "",
  });

  // ── Edit Fund form ────────────────────────────────────────────────────────────
  const [editFundForm, setEditFundForm] = useState({
    name: "",
    floatAmount: 0,
    notes: "",
  });

  // ── Top-Up form ───────────────────────────────────────────────────────────────
  const [topUpForm, setTopUpForm] = useState({
    amount: 0,
    bank_account_id: "",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // ── Record Expense form ───────────────────────────────────────────────────────
  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expenseAccountId: "",
    description: "",
    receiptRef: "",
    transactionDate: new Date().toISOString().split("T")[0],
    category: "office_stationery" as
      | "office_stationery"
      | "travel_transport"
      | "meals_entertainment"
      | "maintenance_repairs"
      | "staff_welfare"
      | "marketing_sales"
      | "utilities_misc",
    subcategory: "",
    recipientType: "" as "" | "staff" | "client" | "mixed",
    isTaxable: false,
    isStaffAdvance: false,
    purpose: "",
    receiptUploadUrl: "",
    receiptUploadName: "",
  });
  const [expenseWarnings, setExpenseWarnings] = useState<string[]>([]);

  // ── Replenishment form ────────────────────────────────────────────────────────
  const [replenishForm, setReplenishForm] = useState({
    amount: 0,
    reason: "",
    bank_account_id: "",
  });

  // ── Cash Count form ───────────────────────────────────────────────────────────
  const [cashCountForm, setCashCountForm] = useState({
    countDate: new Date().toISOString().split("T")[0],
    denominations: [
      { denomination: 1000, count: 0, total: 0 },
      { denomination: 500, count: 0, total: 0 },
      { denomination: 200, count: 0, total: 0 },
      { denomination: 100, count: 0, total: 0 },
      { denomination: 50, count: 0, total: 0 },
      { denomination: 20, count: 0, total: 0 },
      { denomination: 10, count: 0, total: 0 },
      { denomination: 5, count: 0, total: 0 },
      { denomination: 1, count: 0, total: 0 },
      { denomination: 0.5, count: 0, total: 0 },
      { denomination: 0.25, count: 0, total: 0 },
    ],
    notes: "",
  });

  // ── Reconciliations list ───────────────────────────────────────────────────────
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loadingReconciliations, setLoadingReconciliations] = useState(false);

  // ── Replenishments list ────────────────────────────────────────────────────────
  const [showReplenishmentsDialog, setShowReplenishmentsDialog] = useState(false);
  const [replenishments, setReplenishments] = useState<any[]>([]);
  const [loadingReplenishments, setLoadingReplenishments] = useState(false);
  const [selectedReplenishment, setSelectedReplenishment] = useState<any | null>(null);
  const [showReplenishmentCompleteDialog, setShowReplenishmentCompleteDialog] = useState(false);
  const [replenishmentCompleteForm, setReplenishmentCompleteForm] = useState({
    actualAmount: 0,
    notes: "",
  });

  // ── Reconciliation Approval dialog ───────────────────────────────────────────────
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    status: "approved" as "approved" | "rejected",
    discrepancyExplanation: "",
  });

  // ── Imprest calculation ────────────────────────────────────────────────────────
  const [imprestCalculation, setImprestCalculation] = useState<any>(null);

  // ── Data fetchers ─────────────────────────────────────────────────────────────

  const fetchFunds = useCallback(
    async (overrideShowInactive?: boolean) => {
      setLoading(true);
      try {
        const inactive =
          overrideShowInactive !== undefined
            ? overrideShowInactive
            : showInactive;
        // When showing inactive, pass no isActive filter to get all funds.
        const params = inactive ? { page: fundPage, limit: 50 } : { isActive: true, page: fundPage, limit: 50 };
        const response = await pettyCashApi.getFunds(params);
        console.log("[PettyCashListPage] Funds API Response:", response);
        if (response.success && response.data) {
          setFunds(response.data);
          setFundPages(response.pagination?.pages || response.pages || 1);
        }
      } catch (error) {
        console.error("[PettyCashListPage] Failed to fetch funds:", error);
        toast.error("Failed to load funds");
      } finally {
        setLoading(false);
      }
    },
    [fundPage, showInactive],
  );

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error(
        "[PettyCashListPage] Failed to fetch bank accounts:",
        error,
      );
    }
  }, []);

  const fetchExpenseAccounts = useCallback(async () => {
    try {
      const response = await chartOfAccountsApi.getAll({
        type: "expense",
        isActive: true,
      });
      if (response.success && response.data && response.data.length > 0) {
        setExpenseAccounts(response.data);
        // Pre-select first available account
        setExpenseForm((prev) => ({
          ...prev,
          expenseAccountId: prev.expenseAccountId || response.data[0].code,
        }));
      }
    } catch (error) {
      // Non-fatal — fall back to hardcoded list
      console.warn(
        "[PettyCashListPage] Could not load expense accounts, using defaults:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    fetchFunds();
    fetchBankAccounts();
    fetchExpenseAccounts();
  }, [fetchFunds, fetchBankAccounts, fetchExpenseAccounts]);

  // ── Toggle inactive handler ───────────────────────────────────────────────────
  const handleToggleInactive = (checked: boolean) => {
    setShowInactive(checked);
    setFundPage(1);
    fetchFunds(checked);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredFunds = funds.filter(
    (fund) =>
      fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fund.custodian?.name &&
        fund.custodian.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleCreateFund = async () => {
    if (!newFundForm.name || newFundForm.floatAmount <= 0) {
      toast.error(
        "Please provide a fund name and a float amount greater than 0",
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await pettyCashApi.createFund({
        name: newFundForm.name,
        floatAmount: newFundForm.floatAmount,
        openingBalance: newFundForm.openingBalance || undefined,
        imprestMode: newFundForm.imprestMode,
        notes: newFundForm.notes || undefined,
      });
      if (response.success) {
        toast.success("Petty cash fund created successfully");
        setShowCreateDialog(false);
        setNewFundForm({
          name: "",
          floatAmount: 0,
          openingBalance: 0,
          imprestMode: true,
          notes: "",
        });
        fetchFunds();
      } else {
        toast.error("Failed to create fund");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Create fund error:", error);
      toast.error(error.response?.data?.message || "Failed to create fund");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFund = async () => {
    if (!editFundForm.name || editFundForm.floatAmount <= 0) {
      toast.error(
        "Please provide a fund name and a float amount greater than 0",
      );
      return;
    }
    setSubmitting(true);
    try {
      // updateFloat maps to PUT /petty-cash/floats/:id
      const response = await pettyCashApi.updateFloat(selectedFund?._id!, {
        name: editFundForm.name,
        notes: editFundForm.notes || undefined,
      });
      if (response.success) {
        toast.success("Fund updated successfully");
        setShowEditDialog(false);
        fetchFunds();
      } else {
        toast.error("Failed to update fund");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Edit fund error:", error);
      toast.error(error.response?.data?.message || "Failed to update fund");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUpForm.amount || topUpForm.amount <= 0) {
      toast.error("Please provide a valid amount");
      return;
    }
    if (!topUpForm.bank_account_id) {
      toast.error("Please select a bank account");
      return;
    }
    setSubmitting(true);
    try {
      const response = await pettyCashApi.topUp(selectedFund?._id!, {
        amount: topUpForm.amount,
        bank_account_id: topUpForm.bank_account_id,
        description: topUpForm.description || undefined,
        transactionDate: topUpForm.transactionDate,
      });
      if (response.success) {
        toast.success("Top-up successful");
        setShowTopUpDialog(false);
        setTopUpForm({
          amount: 0,
          bank_account_id: "",
          description: "",
          transactionDate: new Date().toISOString().split("T")[0],
        });
        fetchFunds();
        fetchBankAccounts();
      } else {
        toast.error("Failed to process top-up");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Top-up error:", error);
      toast.error(error.response?.data?.message || "Failed to process top-up");
    } finally {
      setSubmitting(false);
    }
  };

  // Category to default GL account mapping
  const getDefaultAccountForCategory = (
    category: string,
    subcategory: string,
    isStaffAdvance: boolean,
  ): string => {
    if (isStaffAdvance) {
      return "1250"; // Employee Advances
    }
    const sub = subcategory.toLowerCase();
    switch (category) {
      case "office_stationery":
        return "5610"; // Office Supplies
      case "travel_transport":
        // Use 5650 Travel & Local Transport for parking, taxi, fuel, bus
        // Use 5700 Transport & Delivery for courier, delivery, freight
        if (sub.includes("parking") || sub.includes("taxi") || sub.includes("moto") || sub.includes("fuel") || sub.includes("bus") || sub === "taxi_moto" || sub === "parking" || sub === "fuel" || sub === "bus_transport") {
          return "5650"; // Travel & Local Transport
        }
        if (sub.includes("courier") || sub.includes("delivery") || sub.includes("freight")) {
          return "5700"; // Transport & Delivery
        }
        return "5650"; // Default to Travel & Local Transport
      case "meals_entertainment":
        return "5930"; // Staff Welfare & Entertainment
      case "maintenance_repairs":
        return "5710"; // Repairs & Maintenance
      case "staff_welfare":
        return "5930"; // Staff Welfare & Entertainment
      case "marketing_sales":
        return "5850"; // Marketing & Advertising
      case "utilities_misc":
        if (sub.includes("momo") || sub.includes("mobile money")) {
          return "5920"; // Mobile Money Transaction Fees
        }
        if (sub.includes("airtime") || sub.includes("internet") || sub.includes("utilities")) {
          return "5600"; // Utilities
        }
        return "5910"; // Miscellaneous Expenses
      default:
        return expenseAccounts[0]?.code || FALLBACK_ACCOUNTS[0].code;
    }
  };

  // Auto-populate expense account when category changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const defaultAccount = getDefaultAccountForCategory(
      expenseForm.category,
      expenseForm.subcategory,
      expenseForm.isStaffAdvance,
    );
    setExpenseForm((prev) => ({ ...prev, expenseAccountId: defaultAccount }));
  }, [expenseForm.category, expenseForm.subcategory, expenseForm.isStaffAdvance]);

  // Reset subcategory when category changes to prevent invalid selections
  useEffect(() => {
    setExpenseForm((prev) => ({ ...prev, subcategory: "" }));
  }, [expenseForm.category]);

  const handleRecordExpense = async () => {
    if (!expenseForm.amount || expenseForm.amount <= 0) {
      toast.error("Please provide a valid expense amount");
      return;
    }
    if (!expenseForm.description.trim()) {
      toast.error("Please provide a description");
      return;
    }
    setSubmitting(true);
    setExpenseWarnings([]);
    try {
      const payload: any = {
        amount: expenseForm.amount,
        description: expenseForm.description || undefined,
        receiptRef: expenseForm.receiptRef || undefined,
        transactionDate: expenseForm.transactionDate,
        category: expenseForm.category,
        subcategory: expenseForm.subcategory || undefined,
        recipientType: expenseForm.recipientType || undefined,
        isTaxable: expenseForm.isTaxable || undefined,
        isStaffAdvance: expenseForm.isStaffAdvance || undefined,
        purpose: expenseForm.purpose || undefined,
        receiptUploadUrl: expenseForm.receiptUploadUrl || undefined,
        receiptUploadName: expenseForm.receiptUploadName || undefined,
      };
      // Only send expenseAccountId if user has overridden the default
      // Backend will auto-map if not provided
      if (expenseForm.expenseAccountId) {
        payload.expenseAccountId = expenseForm.expenseAccountId;
      }
      const response = await pettyCashApi.recordExpense(selectedFund?._id!, payload);
      if (response.success) {
        if (response.warnings && response.warnings.length > 0) {
          setExpenseWarnings(response.warnings);
          toast.warning("Expense recorded with warnings");
        } else {
          toast.success("Expense recorded successfully");
        }
        setShowExpenseDialog(false);
        setExpenseWarnings([]);
        const defaultCode =
          expenseAccounts.length > 0
            ? expenseAccounts[0].code
            : FALLBACK_ACCOUNTS[0].code;
        setExpenseForm({
          amount: 0,
          expenseAccountId: defaultCode,
          description: "",
          receiptRef: "",
          transactionDate: new Date().toISOString().split("T")[0],
          category: "office_stationery",
          subcategory: "",
          recipientType: "",
          isTaxable: false,
          isStaffAdvance: false,
          purpose: "",
          receiptUploadUrl: "",
          receiptUploadName: "",
        });
        fetchFunds();
      } else {
        toast.error("Failed to record expense");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Record expense error:", error);
      toast.error(error.response?.data?.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplenishment = async () => {
    if (!replenishForm.amount || replenishForm.amount <= 0) {
      toast.error("Please provide a valid replenishment amount");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        float: selectedFund?._id!,
        amount: replenishForm.amount,
        reason: replenishForm.reason || undefined,
      };
      if (replenishForm.bank_account_id) {
        payload.bank_account_id = replenishForm.bank_account_id;
      }
      // Create replenishment request
      const response = await pettyCashApi.createReplenishment(payload);
      if (response.success && response.data?._id) {
        const replenishmentId = response.data._id;

        // Auto-approve the replenishment
        await pettyCashApi.approveReplenishment(replenishmentId, {
          status: "approved",
          notes: "Auto-approved for imprest replenishment",
        });

        // Auto-complete the replenishment (this creates the transaction)
        await pettyCashApi.completeReplenishment(replenishmentId, {
          actualAmount: replenishForm.amount,
          notes: "Auto-completed for imprest replenishment",
        });

        toast.success("Replenishment completed successfully");
        setShowReplenishDialog(false);
        setReplenishForm({ amount: 0, reason: "", bank_account_id: "" });
        fetchFunds();
      } else {
        toast.error("Failed to create replenishment");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Replenishment error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to process replenishment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Dialog openers ────────────────────────────────────────────────────────────

  const openTopUpDialog = (fund: any) => {
    setSelectedFund(fund);
    setShowTopUpDialog(true);
  };

  const openExpenseDialog = (fund: any) => {
    setSelectedFund(fund);
    setShowExpenseDialog(true);
  };

  const openEditDialog = (fund: any) => {
    setSelectedFund(fund);
    setEditFundForm({
      name: fund.name ?? "",
      floatAmount: fund.floatAmount ?? fund.currentBalance ?? 0,
      notes: fund.notes ?? "",
    });
    setShowEditDialog(true);
  };

  const openReplenishDialog = (fund: any) => {
    setSelectedFund(fund);
    setReplenishForm({ amount: 0, reason: "", bank_account_id: "" });
    setShowReplenishDialog(true);
  };

  const viewTransactions = (fund: any) => {
    navigate(`/petty-cash/${fund._id}/transactions`);
  };

  // ── Cash Count handlers ───────────────────────────────────────────────────────

  const openCashCountDialog = (fund: any) => {
    setSelectedFund(fund);
    setCashCountForm({
      countDate: new Date().toISOString().split("T")[0],
      denominations: [
        { denomination: 1000, count: 0, total: 0 },
        { denomination: 500, count: 0, total: 0 },
        { denomination: 200, count: 0, total: 0 },
        { denomination: 100, count: 0, total: 0 },
        { denomination: 50, count: 0, total: 0 },
        { denomination: 20, count: 0, total: 0 },
        { denomination: 10, count: 0, total: 0 },
        { denomination: 5, count: 0, total: 0 },
        { denomination: 1, count: 0, total: 0 },
        { denomination: 0.5, count: 0, total: 0 },
        { denomination: 0.25, count: 0, total: 0 },
      ],
      notes: "",
    });
    setShowCashCountDialog(true);
  };

  const handleDenominationChange = (index: number, count: number) => {
    setCashCountForm((prev) => {
      const newDenominations = [...prev.denominations];
      newDenominations[index] = {
        ...newDenominations[index],
        count: count || 0,
        total: (count || 0) * newDenominations[index].denomination,
      };
      return { ...prev, denominations: newDenominations };
    });
  };

  const calculatePhysicalTotal = () => {
    return cashCountForm.denominations.reduce((sum, d) => sum + d.total, 0);
  };

  const handleSubmitCashCount = async () => {
    if (!selectedFund) return;
    setSubmitting(true);
    try {
      const physicalTotal = calculatePhysicalTotal();
      const cashDenominations = cashCountForm.denominations.filter(d => d.count > 0);

      const response = await pettyCashApi.createCashCount(selectedFund._id, {
        countDate: cashCountForm.countDate,
        cashDenominations,
        notes: cashCountForm.notes,
      });

      if (response.success) {
        const diff = response.data.difference;
        const diffType = response.data.differenceType;
        let message = `Cash count recorded: ${formatCurrency(physicalTotal)} physical cash`;
        if (diffType === "shortage") {
          message += `. Shortage of ${formatCurrency(Math.abs(diff))}`;
        } else if (diffType === "overage") {
          message += `. Overage of ${formatCurrency(diff)}`;
        } else {
          message += ". Balanced!";
        }
        toast.success(message);
        setShowCashCountDialog(false);
      } else {
        toast.error("Failed to record cash count");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Cash count error:", error);
      toast.error(error.response?.data?.message || "Failed to record cash count");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reconciliations handlers ──────────────────────────────────────────────────

  const openReconciliationsDialog = async (fund: any) => {
    setSelectedFund(fund);
    setShowReconciliationsDialog(true);
    setLoadingReconciliations(true);
    try {
      const response = await pettyCashApi.getReconciliations(fund._id, { limit: 10 });
      if (response.success) {
        setReconciliations(response.data);
      }
    } catch (error) {
      console.error("[PettyCashListPage] Failed to fetch reconciliations:", error);
      toast.error("Failed to load reconciliations");
    } finally {
      setLoadingReconciliations(false);
    }
  };

  const openApproveDialog = (reconciliation: any) => {
    setSelectedReconciliation(reconciliation);
    setApprovalForm({
      status: "approved",
      discrepancyExplanation: "",
    });
    setShowApproveDialog(true);
  };

  const handleApproveReconciliation = async () => {
    if (!selectedReconciliation) return;
    setSubmitting(true);
    try {
      const response = await pettyCashApi.approveReconciliation(
        selectedReconciliation._id,
        {
          status: approvalForm.status,
          discrepancyExplanation: approvalForm.discrepancyExplanation || undefined,
        }
      );
      if (response.success) {
        toast.success(`Reconciliation ${approvalForm.status} successfully`);
        setShowApproveDialog(false);
        // Refresh reconciliations list
        if (selectedFund) {
          const recsResponse = await pettyCashApi.getReconciliations(selectedFund._id, { limit: 10 });
          if (recsResponse.success) {
            setReconciliations(recsResponse.data);
          }
        }
      } else {
        toast.error("Failed to update reconciliation");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Approve reconciliation error:", error);
      toast.error(error.response?.data?.message || "Failed to update reconciliation");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Replenishments handlers ───────────────────────────────────────────────────

  const openReplenishmentsDialog = async (fund: any) => {
    setSelectedFund(fund);
    setShowReplenishmentsDialog(true);
    setLoadingReplenishments(true);
    try {
      const response = await pettyCashApi.getReplenishments(fund._id);
      if (response.success) {
        setReplenishments(response.data);
      }
    } catch (error) {
      console.error("[PettyCashListPage] Failed to fetch replenishments:", error);
      toast.error("Failed to load replenishments");
    } finally {
      setLoadingReplenishments(false);
    }
  };

  const handleApproveReplenishment = async (replenishment: any, status: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      const response = await pettyCashApi.approveReplenishment(replenishment._id, {
        status,
        notes: status === "approved" ? "Approved for replenishment" : "Replenishment rejected",
      });
      if (response.success) {
        toast.success(`Replenishment ${status} successfully`);
        // Refresh list
        if (selectedFund) {
          const resp = await pettyCashApi.getReplenishments(selectedFund._id);
          if (resp.success) setReplenishments(resp.data);
        }
      } else {
        toast.error("Failed to update replenishment");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Approve replenishment error:", error);
      toast.error(error.response?.data?.message || "Failed to update replenishment");
    } finally {
      setSubmitting(false);
    }
  };

  const openCompleteReplenishmentDialog = (replenishment: any) => {
    setSelectedReplenishment(replenishment);
    setReplenishmentCompleteForm({
      actualAmount: replenishment.amount,
      notes: "",
    });
    setShowReplenishmentCompleteDialog(true);
  };

  const handleCompleteReplenishment = async () => {
    if (!selectedReplenishment) return;
    setSubmitting(true);
    try {
      const response = await pettyCashApi.completeReplenishment(selectedReplenishment._id, {
        actualAmount: replenishmentCompleteForm.actualAmount,
        notes: replenishmentCompleteForm.notes || "Replenishment completed",
      });
      if (response.success) {
        toast.success("Replenishment completed successfully");
        setShowReplenishmentCompleteDialog(false);
        // Refresh list and funds
        if (selectedFund) {
          const resp = await pettyCashApi.getReplenishments(selectedFund._id);
          if (resp.success) setReplenishments(resp.data);
          fetchFunds();
        }
      } else {
        toast.error("Failed to complete replenishment");
      }
    } catch (error: any) {
      console.error("[PettyCashListPage] Complete replenishment error:", error);
      toast.error(error.response?.data?.message || "Failed to complete replenishment");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Imprest handlers ──────────────────────────────────────────────────────────

  const openImprestDialog = async (fund: any) => {
    setSelectedFund(fund);
    setShowImprestDialog(true);
    setImprestCalculation(null);
    try {
      const response = await pettyCashApi.getImprestCalculation(fund._id);
      if (response.success) {
        setImprestCalculation(response.data);
      }
    } catch (error) {
      console.error("[PettyCashListPage] Failed to fetch imprest calculation:", error);
      toast.error("Failed to load imprest calculation");
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: any, currency = "USD") => {
    let numAmount = 0;
    if (amount !== null && amount !== undefined && amount !== "") {
      if (typeof amount === "object") {
        if (amount.$numberDecimal) {
          numAmount = parseFloat(amount.$numberDecimal);
        } else if (typeof amount.toString === "function") {
          numAmount = parseFloat(amount.toString());
        }
      } else if (typeof amount === "string") {
        numAmount = parseFloat(amount);
      } else {
        numAmount = Number(amount);
      }
    }
    if (isNaN(numAmount)) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // ── Expense account list (dynamic with fallback) ──────────────────────────────

  const FALLBACK_ACCOUNTS = [
    { code: "5100", name: "Operating Expenses" },
    { code: "5200", name: "Administrative Expenses" },
    { code: "5300", name: "Marketing Expenses" },
    { code: "5400", name: "Travel & Entertainment" },
    { code: "5500", name: "Utilities" },
    { code: "5600", name: "Office Supplies" },
    { code: "5700", name: "Repairs & Maintenance" },
    { code: "5800", name: "Communication Expenses" },
    { code: "5900", name: "Miscellaneous Expenses" },
  ];

  // Petty cash specific GL accounts (filter to show only these)
  const PETTY_CASH_ACCOUNT_CODES = [
    "5610", // Office Supplies
    "5650", // Travel & Local Transport
    "5710", // Repairs & Maintenance
    "5910", // Miscellaneous Expenses
    "5920", // Mobile Money Transaction Fees
    "5930", // Staff Welfare & Entertainment
    "5700", // Transport & Delivery
    "5850", // Marketing & Advertising
    "5600", // Utilities
    "1250", // Employee Advances (for staff advances)
  ];

  const activeExpenseAccounts: { code: string; name: string }[] =
    expenseAccounts.length > 0
      ? expenseAccounts.filter((acct) => PETTY_CASH_ACCOUNT_CODES.includes(acct.code))
      : FALLBACK_ACCOUNTS.filter((acct) => PETTY_CASH_ACCOUNT_CODES.includes(acct.code));

  // Subcategory options for cascading dropdown based on category
  const SUBCATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
    office_stationery: [
      { value: "pens_pencils", label: "Pens, pencils, notebooks" },
      { value: "printer_ink", label: "Printer ink / toner" },
      { value: "printing", label: "Printing & photocopying" },
      { value: "stamps_postage", label: "Stamps & postage" },
      { value: "envelopes", label: "Envelopes, folders, files" },
      { value: "tape_staples", label: "Tape, staples, scissors" },
      { value: "whiteboard", label: "Whiteboard markers" },
      { value: "usb_drives", label: "USB drives / small peripherals" },
      { value: "other", label: "Other (specify)" },
    ],
    travel_transport: [
      { value: "taxi_moto", label: "Taxi / moto fares" },
      { value: "bus_transport", label: "Bus / public transport" },
      { value: "parking", label: "Parking fees" },
      { value: "fuel", label: "Fuel for short errands" },
      { value: "courier", label: "Courier / delivery fees" },
      { value: "airport", label: "Airport transfers (small)" },
      { value: "toll", label: "Toll charges" },
      { value: "other", label: "Other (specify)" },
    ],
    meals_entertainment: [
      { value: "team_lunch", label: "Team lunch / coffee" },
      { value: "client_tea", label: "Client tea / refreshments" },
      { value: "overtime_meals", label: "Working overtime meals" },
      { value: "birthday", label: "Staff birthday cakes" },
      { value: "drinking_water", label: "Office drinking water" },
      { value: "meeting_snacks", label: "Meeting snacks" },
      { value: "other", label: "Other (specify)" },
    ],
    maintenance_repairs: [
      { value: "light_bulb", label: "Light bulb replacement" },
      { value: "plumbing", label: "Minor plumbing fixes" },
      { value: "cleaning", label: "Cleaning supplies" },
      { value: "batteries", label: "Batteries for equipment" },
      { value: "extension_cords", label: "Extension cords / cables" },
      { value: "door_locks", label: "Door locks / keys" },
      { value: "hardware", label: "Small hardware items" },
      { value: "other", label: "Other (specify)" },
    ],
    staff_welfare: [
      { value: "staff_medical", label: "Staff medical (minor)" },
      { value: "emergency_loan", label: "Emergency loan advance" },
      { value: "uniform", label: "Uniform accessories" },
      { value: "safety_gear", label: "Safety gear (small)" },
      { value: "condolence", label: "Condolence / gift contributions" },
      { value: "transport_emergency", label: "Staff transport emergencies" },
      { value: "other", label: "Other (specify)" },
    ],
    marketing_sales: [
      { value: "flyers", label: "Printed flyers / posters" },
      { value: "business_cards", label: "Business card printing" },
      { value: "promotional_gifts", label: "Small promotional gifts" },
      { value: "banners", label: "Banners (small, local)" },
      { value: "name_tags", label: "Event name tags / badges" },
      { value: "newspaper", label: "Newspaper / notice fees" },
      { value: "other", label: "Other (specify)" },
    ],
    utilities_misc: [
      { value: "airtime", label: "Airtime / internet bundles" },
      { value: "momo_fees", label: "Mobile money fees" },
      { value: "bank_charges", label: "Bank charges (small)" },
      { value: "subscriptions", label: "Newspaper subscriptions" },
      { value: "government_filing", label: "Government filing fees" },
      { value: "sundries", label: "Miscellaneous sundries" },
      { value: "donations", label: "Donations (petty)" },
      { value: "other", label: "Other (specify)" },
    ],
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const totalBalance = funds.reduce((sum, f) => sum + (f.currentBalance || 0), 0);
  const activeFundsCount = funds.filter((f) => f.isActive).length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* ── Hero Header ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {t("pettyCash.title", "Petty Cash Funds")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("pettyCash.list.description", "Manage your petty cash funds and transactions")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-6 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                    {activeFundsCount} Active
                  </Badge>
                  <Badge variant="outline" className="h-6 border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                    {funds.length - activeFundsCount} Inactive
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                  {t("pettyCash.createFund", "Create Fund")}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Funds</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{funds.length}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Balance</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalBalance)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <Banknote className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active Funds</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{activeFundsCount}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Search + Inactive toggle ── */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder={t("pettyCash.search", "Search funds...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Switch id="show-inactive" checked={showInactive} onCheckedChange={handleToggleInactive} />
              <Label htmlFor="show-inactive" className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                Show inactive
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchFunds()} className="h-9 dark:border-slate-700 dark:text-slate-200">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* ── Funds Grid ── */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredFunds.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Wallet className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No petty cash funds found</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Create your first fund to get started</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4 h-9 gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                Create Fund
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {filteredFunds.map((fund) => (
                <Card key={fund._id} className="overflow-hidden border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="rounded-md bg-amber-50 p-1.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-base font-semibold leading-tight dark:text-white truncate">
                          {fund.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 dark:text-slate-300 dark:hover:bg-slate-800" title="Edit fund" onClick={() => openEditDialog(fund)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Badge variant="outline" className={`h-5 text-xs ${fund.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400'}`}>
                          {fund.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    {fund.custodian && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-8">
                        {t("pettyCash.custodian", "Custodian")}: {fund.custodian.name}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Balance Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Balance</p>
                        <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(fund.currentBalance)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Float Amount</p>
                        <p className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{formatCurrency(fund.floatAmount)}</p>
                      </div>
                    </div>

                    {/* Alerts */}
                    <div className="flex flex-wrap gap-2">
                      {fund.imprestMode && (
                        <Badge variant="outline" className="h-6 gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                          <Scale className="h-3 w-3" />
                          Imprest Mode
                        </Badge>
                      )}
                      {fund.replenishmentNeeded > 0 && (
                        <Badge variant="outline" className="h-6 gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          Replenish {formatCurrency(fund.replenishmentNeeded)}
                        </Badge>
                      )}
                      {fund.imprestMode && fund.imprestReplenishmentAmount > 0 && (
                        <Badge variant="outline" className="h-6 gap-1 border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400">
                          <Calculator className="h-3 w-3" />
                          Imprest {formatCurrency(fund.imprestReplenishmentAmount)}
                        </Badge>
                      )}
                    </div>

                    {/* Primary Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[70px] dark:border-slate-700 dark:text-slate-200" onClick={() => openTopUpDialog(fund)}>
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        Top Up
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[70px] dark:border-slate-700 dark:text-slate-200" onClick={() => openExpenseDialog(fund)}>
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        Expense
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[80px] dark:border-slate-700 dark:text-slate-200" onClick={() => openReplenishDialog(fund)}>
                        <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                        Replenish
                      </Button>
                      <Button variant="ghost" size="icon" title="View transactions" className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => viewTransactions(fund)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Advanced Actions */}
                    <div className="flex gap-2 flex-wrap border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[90px] dark:border-slate-700 dark:text-slate-200" onClick={() => openCashCountDialog(fund)}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Cash Count
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[100px] dark:border-slate-700 dark:text-slate-200" onClick={() => openReconciliationsDialog(fund)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reconciliations
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[100px] dark:border-slate-700 dark:text-slate-200" onClick={() => openReplenishmentsDialog(fund)}>
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        Replenishments
                      </Button>
                      {fund.imprestMode && (
                        <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 min-w-[90px] dark:border-slate-700 dark:text-slate-200" onClick={() => openImprestDialog(fund)}>
                          <Calculator className="h-3.5 w-3.5" />
                          Imprest
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {fundPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3" aria-label="Petty cash funds pagination">
              <Button variant="outline" size="sm" onClick={() => setFundPage((current) => Math.max(1, current - 1))} disabled={loading || fundPage === 1}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-slate-500 dark:text-slate-400">Page {fundPage} of {fundPages}</span>
              <Button variant="outline" size="sm" onClick={() => setFundPage((current) => Math.min(fundPages, current + 1))} disabled={loading || fundPage === fundPages}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

        {/* ══════════════════════════════════════════════════════════
            Create Fund Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                  <Plus className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">
                  {t("pettyCash.createFund", "Create New Fund")}
                </DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Create a new petty cash fund for your organization
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Custodian notice — Fix A */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
                <span>Custodian will be set to <strong>you</strong>. Contact an admin to change.</span>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-name" className="text-sm dark:text-slate-200">Fund Name *</Label>
                <Input
                  id="create-name"
                  value={newFundForm.name}
                  onChange={(e) => setNewFundForm({ ...newFundForm, name: e.target.value })}
                  placeholder="e.g., Main Office Petty Cash"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-float" className="text-sm dark:text-slate-200">Float Amount *</Label>
                <Input
                  id="create-float"
                  type="number"
                  min={0}
                  value={newFundForm.floatAmount}
                  onChange={(e) => setNewFundForm({ ...newFundForm, floatAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Target replenishment threshold"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-opening" className="text-sm dark:text-slate-200">Opening Balance</Label>
                <Input
                  id="create-opening"
                  type="number"
                  min={0}
                  value={newFundForm.openingBalance}
                  onChange={(e) => setNewFundForm({ ...newFundForm, openingBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="Initial cash on hand"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <Label className="text-sm dark:text-slate-200 font-medium">Imprest Mode</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Fixed float system with periodic replenishment</p>
                  </div>
                </div>
                <Switch checked={newFundForm.imprestMode} onCheckedChange={(checked) => setNewFundForm({ ...newFundForm, imprestMode: checked })} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-notes" className="text-sm dark:text-slate-200">Notes</Label>
                <Input
                  id="create-notes"
                  value={newFundForm.notes}
                  onChange={(e) => setNewFundForm({ ...newFundForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleCreateFund} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Fund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Edit Fund Dialog — Fix C
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                  <Pencil className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Edit Fund</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Update details for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-sm dark:text-slate-200">Fund Name *</Label>
                <Input
                  id="edit-name"
                  value={editFundForm.name}
                  onChange={(e) => setEditFundForm({ ...editFundForm, name: e.target.value })}
                  placeholder="Fund name"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-float" className="text-sm dark:text-slate-200">Float Amount *</Label>
                <Input
                  id="edit-float"
                  type="number"
                  min={0}
                  value={editFundForm.floatAmount}
                  onChange={(e) => setEditFundForm({ ...editFundForm, floatAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Target float amount"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-notes" className="text-sm dark:text-slate-200">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editFundForm.notes}
                  onChange={(e) => setEditFundForm({ ...editFundForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleEditFund} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Top Up Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">
                  {t("pettyCash.topUp", "Top Up Petty Cash")}
                </DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Add funds to {selectedFund?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Balance</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{selectedFund && formatCurrency(selectedFund.currentBalance)}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topup-amount" className="text-sm dark:text-slate-200">Amount *</Label>
                <Input
                  id="topup-amount"
                  type="number"
                  min={0}
                  value={topUpForm.amount}
                  onChange={(e) => setTopUpForm({ ...topUpForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Amount to add"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Source Bank Account *</Label>
                <Select value={topUpForm.bank_account_id} onValueChange={(value) => setTopUpForm({ ...topUpForm, bank_account_id: value })}>
                  <SelectTrigger className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.name} (
                        {formatCurrency(
                          account.cachedBalance ??
                            account.currentBalance ??
                            account.openingBalance ??
                            0,
                        )}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topup-desc" className="text-sm dark:text-slate-200">Description</Label>
                <Input
                  id="topup-desc"
                  value={topUpForm.description}
                  onChange={(e) => setTopUpForm({ ...topUpForm, description: e.target.value })}
                  placeholder="Optional description"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topup-date" className="text-sm dark:text-slate-200">Transaction Date</Label>
                <Input
                  id="topup-date"
                  type="date"
                  value={topUpForm.transactionDate}
                  onChange={(e) => setTopUpForm({ ...topUpForm, transactionDate: e.target.value })}
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTopUpDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleTopUp} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Top Up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Record Expense Dialog — Enhanced with 7 Categories
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogContent className="sm:max-w-lg dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-50 p-2 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">
                  <Receipt className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">
                  {t("pettyCash.recordExpense", "Record Expense")}
                </DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Record an expense from {selectedFund?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Available Balance</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{selectedFund && formatCurrency(selectedFund.currentBalance)}</p>
              </div>

              {/* Category Selection */}
              <div className="grid gap-2">
                <Label className="text-sm dark:text-slate-200">Category *</Label>
                <Select value={expenseForm.category} onValueChange={(value: any) => setExpenseForm({ ...expenseForm, category: value, subcategory: "", recipientType: "", isTaxable: false, isStaffAdvance: false })}>
                  <SelectTrigger className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select expense category" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="office_stationery">Office & Stationery</SelectItem>
                    <SelectItem value="travel_transport">Travel & Transport</SelectItem>
                    <SelectItem value="meals_entertainment">Meals & Entertainment</SelectItem>
                    <SelectItem value="maintenance_repairs">Maintenance & Repairs</SelectItem>
                    <SelectItem value="staff_welfare">Staff & Welfare</SelectItem>
                    <SelectItem value="marketing_sales">Marketing & Sales</SelectItem>
                    <SelectItem value="utilities_misc">Utilities & Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory - Cascading dropdown based on category */}
              <div className="grid gap-2">
                <Label htmlFor="exp-subcategory" className="text-sm dark:text-slate-200">
                  Subcategory / Details {expenseForm.subcategory === "other" && "*"}
                </Label>
                <Select value={expenseForm.subcategory} onValueChange={(value) => setExpenseForm({ ...expenseForm, subcategory: value })}>
                  <SelectTrigger id="exp-subcategory" className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800 max-h-60">
                    {SUBCATEGORY_OPTIONS[expenseForm.category]?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {expenseForm.subcategory === "other" && (
                  <p className="text-xs text-amber-500">
                    Please specify details in the Description field below
                  </p>
                )}
                {expenseForm.category === "utilities_misc" && expenseForm.subcategory === "momo_fees" && (
                  <p className="text-xs text-green-500">
                    ✓ MoMo fees detected - GL will auto-map to Mobile Money Transaction Fees (5920)
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="exp-amount" className="text-sm dark:text-slate-200">Amount *</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Expense amount"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              {/* Conditional: Purpose for Travel */}
              {expenseForm.category === "travel_transport" && (
                <div className="grid gap-2">
                  <Label htmlFor="exp-purpose" className="text-sm dark:text-slate-200">Trip Purpose</Label>
                  <Input
                    id="exp-purpose"
                    value={expenseForm.purpose}
                    onChange={(e) => setExpenseForm({ ...expenseForm, purpose: e.target.value })}
                    placeholder="e.g., Client meeting in Kigali"
                    className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* Conditional: Recipient Type for Meals & Entertainment */}
              {expenseForm.category === "meals_entertainment" && (
                <>
                  <div className="grid gap-2">
                    <Label className="dark:text-slate-200">Recipient Type</Label>
                    <Select value={expenseForm.recipientType} onValueChange={(value: any) => setExpenseForm({ ...expenseForm, recipientType: value })}>
                      <SelectTrigger className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                        <SelectValue placeholder="Who was this for?" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                        <SelectItem value="staff">Staff Only</SelectItem>
                        <SelectItem value="client">Client Only</SelectItem>
                        <SelectItem value="mixed">Staff & Client (Mixed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="exp-taxable"
                      checked={expenseForm.isTaxable}
                      onCheckedChange={(checked) =>
                        setExpenseForm({ ...expenseForm, isTaxable: checked === true })
                      }
                    />
                    <Label htmlFor="exp-taxable" className="text-sm dark:text-slate-200">
                      Taxable (for RRA reporting)
                    </Label>
                  </div>
                </>
              )}

              {/* Conditional: Staff Advance for Staff & Welfare */}
              {expenseForm.category === "staff_welfare" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <Checkbox id="exp-advance" checked={expenseForm.isStaffAdvance} onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, isStaffAdvance: checked === true })} />
                    <Label htmlFor="exp-advance" className="text-sm font-medium dark:text-slate-200">This is a staff advance (not an expense)</Label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 ml-6">Advances are posted to Staff Debtors (Employee Advances) and must be reconciled later</p>
                </div>
              )}

              {/* Maintenance Warning */}
              {expenseForm.category === "maintenance_repairs" &&
                selectedFund?.floatAmount &&
                expenseForm.amount >= selectedFund.floatAmount * 0.3 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/20 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-300"><strong>⚠️ Warning:</strong> This maintenance expense is large relative to the petty cash float. Consider routing through a purchase order instead.</p>
                  </div>
                )}

              {/* Display backend warnings */}
              {expenseWarnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:bg-yellow-950/20 dark:border-yellow-800">
                  {expenseWarnings.map((w, i) => (
                    <p key={i} className="text-sm text-yellow-800 dark:text-yellow-300">⚠️ {w}</p>
                  ))}
                </div>
              )}

              {/* Expense Account (auto-populated but overridable) */}
              <div className="grid gap-2">
                <Label className="text-sm dark:text-slate-200">GL Account</Label>
                <Select value={expenseForm.expenseAccountId} onValueChange={(value) => setExpenseForm({ ...expenseForm, expenseAccountId: value })}>
                  <SelectTrigger className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Auto-selected based on category" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800 max-h-60">
                    {activeExpenseAccounts.map((acct) => (
                      <SelectItem key={acct.code} value={acct.code}>
                        {acct.name} ({acct.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-500">Auto-populated from category. Select manually to override.</p>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="exp-desc" className="text-sm dark:text-slate-200">Description *</Label>
                <Input
                  id="exp-desc"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Brief description of the expense"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Receipt Reference */}
              <div className="grid gap-2">
                <Label htmlFor="exp-receipt" className="text-sm dark:text-slate-200">Receipt Reference</Label>
                <Input
                  id="exp-receipt"
                  value={expenseForm.receiptRef}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receiptRef: e.target.value })}
                  placeholder="Receipt number (optional)"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Transaction Date */}
              <div className="grid gap-2">
                <Label htmlFor="exp-date" className="text-sm dark:text-slate-200">Transaction Date</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expenseForm.transactionDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, transactionDate: e.target.value })}
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowExpenseDialog(false); setExpenseWarnings([]); }} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleRecordExpense} disabled={submitting} className="bg-red-600 hover:bg-red-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Request Replenishment Dialog — Fix D
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReplenishDialog} onOpenChange={setShowReplenishDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Request Replenishment</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Submit a replenishment request for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Balance</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{selectedFund && formatCurrency(selectedFund.currentBalance)}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="replenish-amount" className="text-sm dark:text-slate-200">Amount *</Label>
                <Input
                  id="replenish-amount"
                  type="number"
                  min={0}
                  value={replenishForm.amount}
                  onChange={(e) => setReplenishForm({ ...replenishForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Requested replenishment amount"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="replenish-reason" className="text-sm dark:text-slate-200">Reason</Label>
                <Input
                  id="replenish-reason"
                  value={replenishForm.reason}
                  onChange={(e) => setReplenishForm({ ...replenishForm, reason: e.target.value })}
                  placeholder="Reason for replenishment (optional)"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid gap-2">
                <Label className="dark:text-slate-200">Source Bank Account</Label>
                <Select value={replenishForm.bank_account_id} onValueChange={(value) => setReplenishForm({ ...replenishForm, bank_account_id: value })}>
                  <SelectTrigger className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select bank account (optional)" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.name} (
                        {formatCurrency(
                          account.cachedBalance ??
                            account.currentBalance ??
                            account.openingBalance ??
                            0,
                        )}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReplenishDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleReplenishment} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Cash Count Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showCashCountDialog} onOpenChange={setShowCashCountDialog}>
          <DialogContent className="sm:max-w-lg dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-purple-50 p-2 text-purple-700 ring-1 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900/60">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Cash Count</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Record physical cash count for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* System Balance Display */}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">System Balance</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{selectedFund && formatCurrency(selectedFund.currentBalance)}</p>
              </div>

              {/* Count Date */}
              <div className="grid gap-2">
                <Label htmlFor="count-date" className="text-sm dark:text-slate-200">Count Date</Label>
                <Input
                  id="count-date"
                  type="date"
                  value={cashCountForm.countDate}
                  onChange={(e) => setCashCountForm({ ...cashCountForm, countDate: e.target.value })}
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              {/* Denominations */}
              <div className="grid gap-2">
                <Label className="text-sm dark:text-slate-200">Cash Denominations</Label>
                <div className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/60">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Denomination</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Count</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {cashCountForm.denominations.map((denom, index) => (
                        <tr key={denom.denomination}>
                          <td className="px-3 py-2 text-sm dark:text-slate-300">{formatCurrency(denom.denomination)}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={denom.count || ""}
                              onChange={(e) => handleDenominationChange(index, parseInt(e.target.value) || 0)}
                              className="h-8 w-20 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium dark:text-slate-300">{formatCurrency(denom.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physical Total */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950/20 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Physical Cash Total</span>
                  <span className="text-xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(calculatePhysicalTotal())}</span>
                </div>
              </div>

              {/* Difference Preview */}
              {selectedFund && (
                <div className={`rounded-lg border p-3 ${calculatePhysicalTotal() === selectedFund.currentBalance ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : calculatePhysicalTotal() < selectedFund.currentBalance ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${calculatePhysicalTotal() === selectedFund.currentBalance ? 'text-green-800 dark:text-green-300' : calculatePhysicalTotal() < selectedFund.currentBalance ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                      {calculatePhysicalTotal() === selectedFund.currentBalance ? "Balanced ✓" : calculatePhysicalTotal() < selectedFund.currentBalance ? "Shortage" : "Overage"}
                    </span>
                    <span className={`text-lg font-bold ${calculatePhysicalTotal() === selectedFund.currentBalance ? 'text-green-800 dark:text-green-300' : calculatePhysicalTotal() < selectedFund.currentBalance ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                      {formatCurrency(calculatePhysicalTotal() - selectedFund.currentBalance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="count-notes" className="text-sm dark:text-slate-200">Notes</Label>
                <Input
                  id="count-notes"
                  value={cashCountForm.notes}
                  onChange={(e) => setCashCountForm({ ...cashCountForm, notes: e.target.value })}
                  placeholder="Optional notes about the count"
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCashCountDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleSubmitCashCount} disabled={submitting || calculatePhysicalTotal() === 0} className="bg-purple-600 hover:bg-purple-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Count
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Reconciliations Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReconciliationsDialog} onOpenChange={setShowReconciliationsDialog}>
          <DialogContent className="sm:max-w-2xl dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Cash Count Reconciliations</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                History of cash counts for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingReconciliations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : reconciliations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 py-10 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <RefreshCw className="h-6 w-6 text-slate-400" />
                  <p className="text-sm font-medium">No reconciliations recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reconciliations.map((rec) => (
                    <div key={rec._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{rec.reconciliationNumber}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(rec.countDate).toLocaleDateString()} • Counted by {rec.countedBy?.name}</p>
                        </div>
                        <Badge
                          variant={
                            rec.status === "approved"
                              ? "default"
                              : rec.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            rec.status === "approved"
                              ? "dark:bg-green-600 dark:text-white"
                              : rec.status === "rejected"
                              ? "dark:bg-red-600 dark:text-white"
                              : "dark:bg-slate-600 dark:text-slate-200"
                          }
                        >
                          {rec.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">System</p>
                          <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-200">{formatCurrency(rec.systemBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Physical</p>
                          <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-200">{formatCurrency(rec.physicalCashTotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Difference</p>
                          <p className={`mt-0.5 font-bold ${rec.differenceType === "balanced" ? "text-green-600 dark:text-green-400" : rec.differenceType === "shortage" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {rec.differenceType === "balanced" ? "✓" : rec.differenceType === "shortage" ? "-" : "+"}{formatCurrency(Math.abs(rec.difference))}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons for pending reconciliations with shortage/overage */}
                      {rec.status === "pending" && rec.differenceType !== "balanced" && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700 dark:text-green-400 dark:hover:bg-green-950/30" onClick={() => openApproveDialog(rec)}>
                            Approve {rec.differenceType === "shortage" ? "Shortage" : "Overage"}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => { setSelectedReconciliation(rec); setApprovalForm({ status: "rejected", discrepancyExplanation: "" }); setShowApproveDialog(true); }}>
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* Show journal entry info for approved reconciliations with difference */}
                      {rec.status === "approved" && rec.differenceType !== "balanced" && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {rec.differenceType === "shortage" ? "Shortage recorded as expense" : "Overage recorded as income"}{rec.approvedBy?.name && ` • Approved by ${rec.approvedBy.name}`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReconciliationsDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Imprest Calculation Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showImprestDialog} onOpenChange={setShowImprestDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60">
                  <Calculator className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Imprest Calculation</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                Fixed float replenishment calculation for <strong>{selectedFund?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {!imprestCalculation ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : !imprestCalculation.isImprest ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-300">This fund is not in imprest mode. Enable imprest mode to use fixed float replenishment.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20 dark:border-blue-800 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-800 dark:text-blue-300">Fixed Float Amount</span>
                      <span className="font-bold text-blue-800 dark:text-blue-300">{formatCurrency(imprestCalculation.floatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-800 dark:text-blue-300">Current Balance</span>
                      <span className="font-bold text-blue-800 dark:text-blue-300">{formatCurrency(imprestCalculation.currentBalance)}</span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Replenishment Needed</span>
                        <span className="text-lg font-bold text-blue-800 dark:text-blue-300">{formatCurrency(imprestCalculation.replenishmentAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-medium mb-1 text-slate-900 dark:text-white">How Imprest Works:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>The fund maintains a fixed float amount</li>
                      <li>Expenses reduce the current balance</li>
                      <li>Replenishment restores to the fixed amount</li>
                      <li>Prevents over-funding and improves control</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImprestDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Button>
              {imprestCalculation?.isImprest && imprestCalculation?.replenishmentAmount > 0 && (
                <Button onClick={() => { setShowImprestDialog(false); openReplenishDialog(selectedFund); setReplenishForm({ amount: imprestCalculation.replenishmentAmount, reason: "Imprest replenishment", bank_account_id: "" }); }} className="bg-cyan-600 hover:bg-cyan-700">
                  Create Replenishment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Reconciliation Approval Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-2 ring-1 ${selectedReconciliation?.differenceType === "shortage" ? 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60' : 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60'}`}>
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">
                  {selectedReconciliation?.differenceType === "shortage" ? "Approve Shortage" : selectedReconciliation?.differenceType === "overage" ? "Approve Overage" : "Approve Reconciliation"}
                </DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                {selectedReconciliation?.reconciliationNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Summary of the difference */}
              {selectedReconciliation && (
                <div className={`rounded-lg border p-4 ${selectedReconciliation.differenceType === "shortage" ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'}`}>
                  <div className="flex justify-between items-center">
                    <span className={selectedReconciliation.differenceType === "shortage" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}>
                      {selectedReconciliation.differenceType === "shortage" ? "Shortage Amount" : "Overage Amount"}
                    </span>
                    <span className={`font-bold text-lg ${selectedReconciliation.differenceType === "shortage" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
                      {formatCurrency(Math.abs(selectedReconciliation.difference))}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${selectedReconciliation.differenceType === "shortage" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {selectedReconciliation.differenceType === "shortage" ? "This will record the shortage as a miscellaneous expense." : "This will record the overage as other income."}
                  </p>
                </div>
              )}

              {/* Status selection */}
              <div className="grid gap-2">
                <Label className="text-sm dark:text-slate-200">Decision</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={approvalForm.status === "approved" ? "default" : "outline"} onClick={() => setApprovalForm({ ...approvalForm, status: "approved" })} className={`flex-1 ${approvalForm.status !== "approved" ? 'dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800' : ''}`}>
                    Approve
                  </Button>
                  <Button type="button" variant={approvalForm.status === "rejected" ? "destructive" : "outline"} onClick={() => setApprovalForm({ ...approvalForm, status: "rejected" })} className={`flex-1 ${approvalForm.status !== "rejected" ? 'dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800' : ''}`}>
                    Reject
                  </Button>
                </div>
              </div>

              {/* Explanation for discrepancy */}
              <div className="grid gap-2">
                <Label htmlFor="explanation" className="text-sm dark:text-slate-200">
                  Explanation / Notes {approvalForm.status === "approved" && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="explanation"
                  value={approvalForm.discrepancyExplanation}
                  onChange={(e) => setApprovalForm({ ...approvalForm, discrepancyExplanation: e.target.value })}
                  placeholder="Explain the reason for shortage/overage..."
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button
                onClick={handleApproveReconciliation}
                disabled={submitting || (approvalForm.status === "approved" && !approvalForm.discrepancyExplanation)}
                variant={approvalForm.status === "rejected" ? "destructive" : "default"}
                className={approvalForm.status === "rejected" ? "" : "bg-amber-600 hover:bg-amber-700"}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {approvalForm.status === "approved" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Replenishments List Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReplenishmentsDialog} onOpenChange={setShowReplenishmentsDialog}>
          <DialogContent className="sm:max-w-lg dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Replenishment Requests - {selectedFund?.name}</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                View and manage replenishment requests
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingReplenishments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : replenishments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 py-10 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <RotateCcw className="h-6 w-6 text-slate-400" />
                  <p className="text-sm font-medium">No replenishment requests found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {replenishments.map((rep) => (
                    <div key={rep._id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{rep.replenishmentNumber || rep._id.slice(-6)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(rep.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rep.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : rep.status === "approved"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : rep.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3 mt-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Requested</p>
                          <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-200">{formatCurrency(rep.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Actual</p>
                          <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-200">{rep.actualAmount ? formatCurrency(rep.actualAmount) : "-"}</p>
                        </div>
                      </div>

                      {rep.reason && <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Reason: {rep.reason}</p>}

                      {/* Action buttons */}
                      {rep.status === "pending" && (
                        <div className="flex gap-2 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700 dark:text-green-400 dark:hover:bg-green-950/30" onClick={() => handleApproveReplenishment(rep, "approved")} disabled={submitting}>Approve</Button>
                          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleApproveReplenishment(rep, "rejected")} disabled={submitting}>Reject</Button>
                        </div>
                      )}

                      {rep.status === "approved" && (
                        <div className="flex gap-2 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-blue-950/30" onClick={() => openCompleteReplenishmentDialog(rep)} disabled={submitting}>Complete</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReplenishmentsDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
            Complete Replenishment Dialog
        ══════════════════════════════════════════════════════════ */}
        <Dialog open={showReplenishmentCompleteDialog} onOpenChange={setShowReplenishmentCompleteDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="gap-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg dark:text-white">Complete Replenishment</DialogTitle>
              </div>
              <DialogDescription className="dark:text-slate-400">
                {selectedReplenishment?.replenishmentNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm dark:text-slate-200">Requested Amount</Label>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(selectedReplenishment?.amount || 0)}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="actualAmount" className="text-sm dark:text-slate-200">Actual Amount Received *</Label>
                <Input
                  id="actualAmount"
                  type="number"
                  value={replenishmentCompleteForm.actualAmount}
                  onChange={(e) => setReplenishmentCompleteForm({ ...replenishmentCompleteForm, actualAmount: parseFloat(e.target.value) || 0 })}
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="completeNotes" className="text-sm dark:text-slate-200">Notes</Label>
                <Input
                  id="completeNotes"
                  value={replenishmentCompleteForm.notes}
                  onChange={(e) => setReplenishmentCompleteForm({ ...replenishmentCompleteForm, notes: e.target.value })}
                  placeholder="Enter completion notes..."
                  className="h-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReplenishmentCompleteDialog(false)} className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={handleCompleteReplenishment} disabled={submitting || replenishmentCompleteForm.actualAmount <= 0} className="bg-blue-600 hover:bg-blue-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Replenishment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </Layout>
  );
}
