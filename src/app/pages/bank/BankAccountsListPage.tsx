import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { bankAccountsApi, interestApi, type CashPosition } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layout } from "../../layout/Layout";
import DocumentCurrencySelect from "@/app/components/DocumentCurrencySelect";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Plus,
  Eye,
  Edit,
  RefreshCw,
  Loader2,
  Building2,
  Search,
  ArrowLeft,
  Trash2,
  ArrowRightLeft,
  Landmark,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
  LayoutGrid,
  List as ListIcon,
  Star,
  PiggyBank,
  TrendingUp,
  CalendarDays,
  CheckCircle,
  Calculator,
  Send,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { BankToCashTransferDialog } from "@/app/components/BankToCashTransferDialog";

export default function BankAccountsListPage() {
  const { t } = useTranslation();
  const { baseCurrency } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateMode = location.pathname === "/bank-accounts/new";
  const isEditMode =
    location.pathname.match(/\/bank-accounts\/[^/]+\/edit$/)?.[0] ===
    location.pathname;
  const editAccountId = isEditMode ? location.pathname.split("/")[2] : null;
  const [loading, setLoading] = useState(!isCreateMode);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [totals, setTotals] = useState<CashPosition | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [formData, setFormData] = useState({
    name: "",
    accountNumber: "",
    bankName: "",
    accountType: "bk_bank",
    currencyCode: "RWF",
    openingBalance: "0",
    interestRate: "",
    isDefault: false,
    isActive: true,
    // Interest fields
    interestAccountType: "current",
    interestCalculationMethod: "simple",
    interestCreditFrequency: "monthly",
    interestIncomeAccount: "4300",
    interestAccrualAccount: "1350",
    bankStatementReference: false,
    interestStartDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"accounts" | "fixed-deposits" | "interest-income">("accounts");
  const [fdSearch, setFdSearch] = useState("");
  const [showFdDialog, setShowFdDialog] = useState(false);
  const [fdForm, setFdForm] = useState({
    depositReference: "",
    bankName: "",
    principalAmount: "",
    interestRate: "",
    startDate: "",
    maturityDate: "",
    bankAccountId: "",
  });

  // Fixed Deposits data
  const queryClient = useQueryClient();
  const { data: fdData, isLoading: fdLoading } = useQuery({
    queryKey: ["fixed-deposits"],
    queryFn: async () => {
      const res = await interestApi.getFixedDeposits();
      return res.data || [];
    },
    enabled: activeTab === "fixed-deposits",
  });

  const placeMutation = useMutation({
    mutationFn: (id: string) => interestApi.placeFixedDeposit(id),
    onSuccess: () => { toast.success("Placement posted"); queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] }); },
    onError: (err: any) => toast.error(err.message || "Placement failed"),
  });

  const matureMutation = useMutation({
    mutationFn: (id: string) => interestApi.matureFixedDeposit(id),
    onSuccess: () => { toast.success("Maturity posted"); queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] }); },
    onError: (err: any) => toast.error(err.message || "Maturity failed"),
  });

  const createFdMutation = useMutation({
    mutationFn: (data: any) => interestApi.createFixedDeposit(data),
    onSuccess: () => {
      toast.success("Fixed deposit created");
      setShowFdDialog(false);
      setFdForm({ depositReference: "", bankName: "", principalAmount: "", interestRate: "", startDate: "", maturityDate: "", bankAccountId: "" });
      queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] });
    },
    onError: (err: any) => toast.error(err.message || "Create failed"),
  });

  // Interest Income state
  const [iiYear, setIiYear] = useState(new Date().getFullYear());
  const [iiMonth, setIiMonth] = useState(new Date().getMonth() + 1);

  const { data: iiSummary, isLoading: iiSummaryLoading } = useQuery({
    queryKey: ["interest-summary"],
    queryFn: async () => {
      const res = await interestApi.getSummary();
      return res.data || [];
    },
    enabled: activeTab === "interest-income",
  });

  const { data: iiAccruals, isLoading: iiAccrualsLoading } = useQuery({
    queryKey: ["interest-accruals", iiYear, iiMonth],
    queryFn: async () => {
      const res = await interestApi.getAccruals({ year: String(iiYear), month: String(iiMonth) });
      return res.data || [];
    },
    enabled: activeTab === "interest-income",
  });

  const previewMutation = useMutation({
    mutationFn: ({ id, y, m }: { id: string; y: number; m: number }) => interestApi.preview(id, y, m),
    onSuccess: (res) => toast.success(`Calculated interest: ${Number(res.data.calculatedInterest).toFixed(2)}`),
    onError: (err: any) => toast.error(err.message || "Preview failed"),
  });

  const postMutation = useMutation({
    mutationFn: ({ id, y, m }: { id: string; y: number; m: number }) => interestApi.post(id, y, m),
    onSuccess: () => { toast.success("Interest posted"); queryClient.invalidateQueries({ queryKey: ["interest-accruals"] }); },
    onError: (err: any) => toast.error(err.message || "Post failed"),
  });

  const confirmMutation = useMutation({
    mutationFn: (accrualId: string) => interestApi.confirmReceipt(accrualId),
    onSuccess: () => { toast.success("Receipt confirmed"); queryClient.invalidateQueries({ queryKey: ["interest-accruals"] }); },
    onError: (err: any) => toast.error(err.message || "Confirm failed"),
  });

  const reverseMutation = useMutation({
    mutationFn: (accrualId: string) => interestApi.reverse(accrualId),
    onSuccess: () => { toast.success("Reversed"); queryClient.invalidateQueries({ queryKey: ["interest-accruals"] }); },
    onError: (err: any) => toast.error(err.message || "Reverse failed"),
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "active") params.isActive = true;
      if (filter === "inactive") params.isActive = false;

      const response = await bankAccountsApi.getAll(params);
      console.log("[BankAccountsListPage] API Response:", response);

      if (response.success) {
        setAccounts(response.data as any[]);
        setTotals(response.totals ?? null);
      }
    } catch (error) {
      console.error("[BankAccountsListPage] Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // Handle edit mode - fetch account data
    if (isEditMode && editAccountId) {
      console.log(
        "[BankAccountsListPage] Fetching account for edit:",
        editAccountId,
      );
      setLoading(true);
      bankAccountsApi
        .getById(editAccountId)
        .then((response) => {
          if (response.success && response.data) {
            const account = response.data as any;
            setFormData({
              name: account.name || "",
              accountNumber: account.accountNumber || "",
              bankName: account.bankName || "",
              accountType: account.accountType || "bk_bank",
              currencyCode: account.currencyCode || baseCurrency,
              openingBalance: String(account.openingBalance || "0"),
              interestRate: account.interestRate ? String(account.interestRate) : "",
              isDefault: account.isDefault || false,
              isActive: account.isActive !== false,
              interestAccountType: account.interestAccountType || "current",
              interestCalculationMethod: account.interestCalculationMethod || "simple",
              interestCreditFrequency: account.interestCreditFrequency || "monthly",
              interestIncomeAccount: account.interestIncomeAccount || "4300",
              interestAccrualAccount: account.interestAccrualAccount || "1350",
              bankStatementReference: account.bankStatementReference || false,
              interestStartDate: account.interestStartDate ? new Date(account.interestStartDate).toISOString().split("T")[0] : "",
            });
          }
        })
        .catch((err) => console.error("Failed to fetch account:", err))
        .finally(() => setLoading(false));
      return;
    }
    if (!isCreateMode) {
      console.log("[BankAccountsListPage] Fetching accounts...");
      fetchAccounts();
    }
  }, [fetchAccounts, isCreateMode, isEditMode, editAccountId]);

  console.log(
    "[BankAccountsListPage] Render - accounts:",
    accounts.length,
    "loading:",
    loading,
  );

  const formatCurrency = (amount: any, currency: string = baseCurrency) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    // Handle MongoDB Decimal128 or regular numbers/strings
    let num: number;
    if (typeof amount === "object") {
      // Check for MongoDB Decimal128 format: { "$numberDecimal": "123.45" }
      if (amount.$numberDecimal) {
        num = parseFloat(amount.$numberDecimal);
      } else if (amount.toString && typeof amount.toString === "function") {
        // Try toString but handle [object Object] case
        const str = amount.toString();
        if (str === "[object Object]") {
          return "-"; // Cannot parse this object
        }
        num = parseFloat(str);
      } else {
        return "-";
      }
    } else if (typeof amount === "string") {
      num = parseFloat(amount);
    } else {
      num = amount;
    }
    if (isNaN(num)) return "-";
    const validCurrency = /^[A-Z]{3}$/.test(currency) ? currency : baseCurrency;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: validCurrency,
      }).format(num);
    } catch (e) {
      return `${validCurrency} ${num.toFixed(2)}`;
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.name.toLowerCase().includes(query) ||
      account.accountNumber.toLowerCase().includes(query) ||
      account.bankName.toLowerCase().includes(query)
    );
  });

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bk_bank: "BK Bank",
      equity_bank: "Equity Bank",
      im_bank: "I&M Bank",
      cogebanque: "Cogebanque",
      ecobank: "Ecobank",
      mtn_momo: "MTN MoMo",
      airtel_money: "Airtel Money",
      cash_in_hand: "Cash in Hand",
    };
    return labels[type] || type;
  };

  const getAccountTypeIcon = (type: string): ReactNode => {
    switch (type) {
      case "mtn_momo":
      case "airtel_money":
        return <Smartphone className="h-5 w-5" />;
      case "cash_in_hand":
        return <Banknote className="h-5 w-5" />;
      case "bk_bank":
      case "equity_bank":
      case "im_bank":
      case "cogebanque":
      case "ecobank":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      bk_bank: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
      equity_bank: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
      im_bank: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
      cogebanque: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
      ecobank: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60",
      mtn_momo: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
      airtel_money: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
      cash_in_hand: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    };
    return colors[type] || colors.bk_bank;
  };

  const getAccountTypeBarColor = (type: string) => {
    const colors: Record<string, string> = {
      bk_bank: "#3b82f6",
      equity_bank: "#0ea5e9",
      im_bank: "#6366f1",
      cogebanque: "#06b6d4",
      ecobank: "#14b8a6",
      mtn_momo: "#f59e0b",
      airtel_money: "#ef4444",
      cash_in_hand: "#10b981",
    };
    return colors[type] || "#3b82f6";
  };

  // Summary computations
  const bankAccountsTotal =
    (totals?.byType.bk_bank ?? 0) +
    (totals?.byType.equity_bank ?? 0) +
    (totals?.byType.im_bank ?? 0) +
    (totals?.byType.cogebanque ?? 0) +
    (totals?.byType.ecobank ?? 0);
  const mobileMoneyTotal =
    (totals?.byType.mtn_momo ?? 0) + (totals?.byType.airtel_money ?? 0);
  const cashTotal = totals?.byType.cash_in_hand ?? 0;
  const totalCash = totals?.total ?? 0;
  const activeCount = accounts.filter((a) => a.isActive).length;
  const inactiveCount = accounts.filter((a) => !a.isActive).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Log form data for debugging
      console.log("[BankAccountsListPage] Current formData:", formData);

      // Prepare data - convert openingBalance to number, but exclude it from updates (backend rule)
      const { openingBalance, ...updateDataWithoutOpeningBalance } = formData;

      const submitData = {
        ...updateDataWithoutOpeningBalance,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        interestRate: parseFloat(formData.interestRate) || 0,
        interestAccountType: formData.interestAccountType,
        interestCalculationMethod: formData.interestCalculationMethod,
        interestCreditFrequency: formData.interestCreditFrequency,
        interestIncomeAccount: formData.interestIncomeAccount,
        interestAccrualAccount: formData.interestAccrualAccount,
        bankStatementReference: formData.bankStatementReference,
        interestStartDate: formData.interestStartDate || null,
      };

      console.log(
        "[BankAccountsListPage] Submit data before cleanup:",
        submitData,
      );

      let response;
      if (isEditMode && editAccountId) {
        // For updates, remove openingBalance entirely per backend rules
        const { openingBalance: ob, ...updateData } = submitData;
        console.log(
          "[BankAccountsListPage] Updating account:",
          editAccountId,
          updateData,
        );
        response = await bankAccountsApi.update(
          editAccountId,
          updateData as any,
        );
      } else {
        console.log("[BankAccountsListPage] Creating account:", submitData);
        // Create new account - include openingBalance
        response = await bankAccountsApi.create(submitData as any);
      }
      console.log("[BankAccountsListPage] Save response:", response);
      if (response.success) {
        navigate("/bank-accounts");
      } else {
        alert((response as any).message || "Failed to save account");
      }
    } catch (error) {
      console.error("[BankAccountsListPage] Failed to save account:", error);
      alert("Failed to save account. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isCreateMode || isEditMode) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/bank-accounts")}
                className="h-10 w-10 dark:border-slate-700 dark:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {isEditMode
                    ? t("bankAccounts.editAccount.title", "Edit Bank Account")
                    : t("bankAccounts.addAccount.title", "Add Bank Account")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isEditMode
                    ? "Update account details and preferences"
                    : t(
                        "bankAccounts.addAccount.description",
                        "Create a new bank or cash account",
                      )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                      {isEditMode ? "Account Details" : "Account Information"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="name"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t("bankAccounts.addAccount.name", "Account Name")}{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder={t(
                              "bankAccounts.addAccount.namePlaceholder",
                              "e.g., Business Account",
                            )}
                            required
                            className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="accountNumber"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t("bankAccounts.accountNumber", "Account Number")}{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="accountNumber"
                            value={formData.accountNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                accountNumber: e.target.value,
                              })
                            }
                            placeholder={t(
                              "bankAccounts.addAccount.accountNumberPlaceholder",
                              "e.g., 1234567890",
                            )}
                            required
                            className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="bankName"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t("bankAccounts.addAccount.bankName", "Bank Name")}
                          </Label>
                          <Input
                            id="bankName"
                            value={formData.bankName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bankName: e.target.value,
                              })
                            }
                            placeholder={t(
                              "bankAccounts.addAccount.bankNamePlaceholder",
                              "e.g., BK Bank",
                            )}
                            className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="accountType"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t("bankAccounts.addAccount.type", "Account Type")}
                          </Label>
                          <Select
                            value={formData.accountType}
                            onValueChange={(v) =>
                              setFormData({ ...formData, accountType: v })
                            }
                          >
                            <SelectTrigger
                              id="accountType"
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            >
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                              <SelectItem value="bk_bank">
                                {t("bankAccounts.accountTypes.bk_bank", "BK Bank")}
                              </SelectItem>
                              <SelectItem value="equity_bank">
                                {t("bankAccounts.accountTypes.equity_bank", "Equity Bank")}
                              </SelectItem>
                              <SelectItem value="im_bank">
                                {t("bankAccounts.accountTypes.im_bank", "I&M Bank")}
                              </SelectItem>
                              <SelectItem value="cogebanque">
                                {t("bankAccounts.accountTypes.cogebanque", "Cogebanque")}
                              </SelectItem>
                              <SelectItem value="ecobank">
                                {t("bankAccounts.accountTypes.ecobank", "Ecobank")}
                              </SelectItem>
                              <SelectItem value="mtn_momo">
                                {t("bankAccounts.accountTypes.mtn_momo", "MTN MoMo")}
                              </SelectItem>
                              <SelectItem value="airtel_money">
                                {t("bankAccounts.accountTypes.airtel_money", "Airtel Money")}
                              </SelectItem>
                              <SelectItem value="cash_in_hand">
                                {t("bankAccounts.accountTypes.cash_in_hand", "Cash in Hand")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="currency"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t("bankAccounts.currentBalance", "Currency")}
                          </Label>
                          <DocumentCurrencySelect
                            value={formData.currencyCode}
                            showRate={false}
                            onChange={(currency) =>
                              setFormData((prev) => ({ ...prev, currencyCode: currency }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="openingBalance"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t(
                              "bankAccounts.addAccount.openingBalance",
                              "Opening Balance",
                            )}
                          </Label>
                          <Input
                            id="openingBalance"
                            type="number"
                            step="0.01"
                            value={formData.openingBalance}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                openingBalance: e.target.value,
                              })
                            }
                            className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                          />
                        </div>
                      </div>

                      {/* Interest Settings */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          Interest Settings
                        </h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="interestAccountType" className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Type for Interest</Label>
                            <Select
                              value={formData.interestAccountType}
                              onValueChange={(v) => setFormData({ ...formData, interestAccountType: v })}
                            >
                              <SelectTrigger id="interestAccountType" className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                <SelectItem value="current">Current Account (No Interest)</SelectItem>
                                <SelectItem value="savings">Savings Account</SelectItem>
                                <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                                <SelectItem value="call_account">Call Account</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.interestAccountType !== "current" && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="interestRate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Interest Rate (% p.a.)</Label>
                                <Input
                                  id="interestRate"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.interestRate}
                                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                  placeholder="e.g., 5.5"
                                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="interestCalculationMethod" className="text-sm font-medium text-slate-700 dark:text-slate-300">Calculation Method</Label>
                                <Select
                                  value={formData.interestCalculationMethod}
                                  onValueChange={(v) => setFormData({ ...formData, interestCalculationMethod: v })}
                                >
                                  <SelectTrigger id="interestCalculationMethod" className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                    <SelectValue placeholder="Select method" />
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                    <SelectItem value="simple">Simple Interest</SelectItem>
                                    <SelectItem value="compound_monthly">Compound Interest (Monthly)</SelectItem>
                                    <SelectItem value="compound_quarterly">Compound Interest (Quarterly)</SelectItem>
                                    <SelectItem value="daily_average">Daily Average Balance</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="interestCreditFrequency" className="text-sm font-medium text-slate-700 dark:text-slate-300">Credit Frequency</Label>
                                <Select
                                  value={formData.interestCreditFrequency}
                                  onValueChange={(v) => setFormData({ ...formData, interestCreditFrequency: v })}
                                >
                                  <SelectTrigger id="interestCreditFrequency" className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="annually">Annually</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="interestIncomeAccount" className="text-sm font-medium text-slate-700 dark:text-slate-300">Interest Income Account</Label>
                                <Input
                                  id="interestIncomeAccount"
                                  value={formData.interestIncomeAccount}
                                  onChange={(e) => setFormData({ ...formData, interestIncomeAccount: e.target.value })}
                                  placeholder="4300"
                                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="interestAccrualAccount" className="text-sm font-medium text-slate-700 dark:text-slate-300">Interest Accrual Account</Label>
                                <Input
                                  id="interestAccrualAccount"
                                  value={formData.interestAccrualAccount}
                                  onChange={(e) => setFormData({ ...formData, interestAccrualAccount: e.target.value })}
                                  placeholder="1350"
                                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="interestStartDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Interest Start Date</Label>
                                <Input
                                  id="interestStartDate"
                                  type="date"
                                  value={formData.interestStartDate}
                                  onChange={(e) => setFormData({ ...formData, interestStartDate: e.target.value })}
                                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <input
                                  type="checkbox"
                                  id="bankStatementReference"
                                  checked={formData.bankStatementReference}
                                  onChange={(e) => setFormData({ ...formData, bankStatementReference: e.target.checked })}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                                />
                                <Label htmlFor="bankStatementReference" className="text-sm font-normal text-slate-700 dark:text-slate-300">
                                  Wait for bank statement confirmation before posting interest
                                </Label>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={formData.isDefault}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isDefault: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                        />
                        <Label
                          htmlFor="isDefault"
                          className="text-sm font-normal text-slate-700 dark:text-slate-300"
                        >
                          {t(
                            "bankAccounts.addAccount.isPrimary",
                            "Set as Primary Account",
                          )}
                        </Label>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          type="submit"
                          disabled={saving}
                          className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("common.saving", "Saving...")}
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              {t("common.save", "Save")}
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/bank-accounts")}
                          className="h-10 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {t("common.cancel", "Cancel")}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      {t("bankAccounts.help", "Help")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                    <p>
                      A bank account represents any financial account you use to
                      track money. This can include physical bank accounts, mobile
                      money accounts, or cash on hand.
                    </p>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Account Types
                      </p>
                      <div className="space-y-2">
                        {[
                          { type: "bk_bank", label: "Bank Account", desc: "Traditional bank accounts" },
                          { type: "cash_in_hand", label: "Cash", desc: "Physical cash on hand" },
                          { type: "mtn_momo", label: "Mobile Money", desc: "Mobile money wallets" },
                        ].map((item) => (
                          <div key={item.type} className="flex items-start gap-2">
                            <div
                              className={`mt-0.5 rounded-md p-1 ${getAccountTypeColor(item.type)}`}
                            >
                              {getAccountTypeIcon(item.type)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 dark:text-slate-300">
                                {item.label}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const cashBreakdown = [
    { label: "Bank Accounts", value: bankAccountsTotal, color: "#2563eb", icon: <CreditCard className="h-4 w-4" /> },
    { label: "Mobile Money", value: mobileMoneyTotal, color: "#f59e0b", icon: <Smartphone className="h-4 w-4" /> },
    { label: "Cash on Hand", value: cashTotal, color: "#10b981", icon: <Banknote className="h-4 w-4" /> },
  ].filter((item) => item.value > 0);

  const breakdownTotal = cashBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <TooltipProvider>
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
            {/* Hero Header */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                      {t("bankAccount.title", "Bank Accounts")}
                    </h1>
                    <Badge variant="secondary" className="h-6">
                      {accounts.length} total
                    </Badge>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                    {t("bankAccount.description", "Manage your bank accounts, mobile money wallets, and cash positions")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      onClick={() => navigate("/bank-accounts/new")}
                      className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      {t("bankAccounts.actions.addAccount", "Create Bank Account")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTransferDialog(true)}
                      className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      {t("bankAccounts.actions.transfer", "Transfer")}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                    <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Inactive</p>
                    <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{inactiveCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Default</p>
                    <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                      {accounts.filter((a) => a.isDefault).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setActiveTab("accounts")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "accounts"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                Bank Accounts ({accounts.length})
              </button>
              <button
                onClick={() => setActiveTab("fixed-deposits")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "fixed-deposits"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                Fixed Deposits ({fdData?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("interest-income")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "interest-income"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                Interest Income
              </button>
            </div>

            {activeTab === "accounts" && (
              <>
                {/* Summary Metric Tiles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total Cash Position
                      </p>
                      <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                        {formatCurrency(totalCash)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <PiggyBank className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Bank Accounts
                      </p>
                      <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                        {formatCurrency(bankAccountsTotal)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Traditional banking institutions
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Mobile Money
                      </p>
                      <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                        {formatCurrency(mobileMoneyTotal)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                      <Smartphone className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    MTN MoMo & Airtel Money
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Cash on Hand
                      </p>
                      <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">
                        {formatCurrency(cashTotal)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Physical cash reserves
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cash Position Breakdown */}
            {breakdownTotal > 0 && (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Cash Position Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    {cashBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min((item.value / breakdownTotal) * 100, 100)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {cashBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(item.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Toolbar: Search, Filter, View Toggle, Refresh */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={t("bankAccount.searchPlaceholder", "Search accounts...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="h-10 w-[160px] dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    <SelectItem value="all">{t("bankAccount.allAccounts", "All Accounts")}</SelectItem>
                    <SelectItem value="active">{t("bankAccount.active", "Active")}</SelectItem>
                    <SelectItem value="inactive">{t("bankAccount.inactive", "Inactive")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAccounts}
                  disabled={loading}
                  className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {t("common.refresh", "Refresh")}
                </Button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
                <Button
                  variant={viewMode === "cards" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-8 gap-1.5"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 gap-1.5"
                >
                  <ListIcon className="h-4 w-4" />
                  Table
                </Button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-slate-200/80 dark:border-slate-800">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="mt-4 h-5 w-3/4" />
                      <Skeleton className="mt-2 h-4 w-1/2" />
                      <Skeleton className="mt-4 h-8 w-32" />
                      <Skeleton className="mt-4 h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                <Landmark className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">
                  {searchQuery
                    ? "No accounts match your search"
                    : t("bankAccount.noAccounts", "No bank accounts found")}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {searchQuery
                    ? "Try adjusting your search or filter"
                    : "Create your first account to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/bank-accounts/new")}
                    className="mt-4 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Account
                  </Button>
                )}
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAccounts.map((account) => {
                  const typeColor = getAccountTypeColor(account.accountType);
                  const barColor = getAccountTypeBarColor(account.accountType);
                  const balance = account.cachedBalance ?? account.openingBalance ?? 0;
                  return (
                    <Card
                      key={account._id}
                      className="group relative overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                    >
                      {/* Accent strip */}
                      <div
                        className="absolute left-0 top-0 h-full w-1"
                        style={{ backgroundColor: barColor }}
                      />
                      <CardContent className="p-5 pl-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`rounded-lg p-2.5 ring-1 ${typeColor}`}>
                            {getAccountTypeIcon(account.accountType)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {account.isDefault && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
                              >
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                Default
                              </Badge>
                            )}
                            <Badge
                              variant={account.isActive ? "secondary" : "outline"}
                              className={
                                account.isActive
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "text-slate-500 dark:text-slate-400"
                              }
                            >
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-4 min-w-0">
                          <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
                            {account.name}
                          </h3>
                          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                            {account.bankName || getAccountTypeLabel(account.accountType)}
                            {account.accountNumber ? ` · ${account.accountNumber}` : ""}
                          </p>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Current Balance
                          </p>
                          <p className="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-white">
                            {formatCurrency(balance, account.currencyCode || baseCurrency)}
                          </p>
                          <Badge variant="outline" className="mt-1.5 text-xs dark:border-slate-700 dark:text-slate-400">
                            {account.currencyCode || baseCurrency}
                          </Badge>
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/bank-accounts/${account._id}`)}
                            className="h-8 flex-1 gap-1 text-xs dark:border-slate-700 dark:text-slate-200"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/bank-accounts/${account._id}/reconcile`)}
                                className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reconcile</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/bank-accounts/${account._id}/edit`)}
                                className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (
                                    confirm(
                                      t(
                                        "bankAccounts.confirmations.deleteAccount",
                                        "Are you sure you want to delete this bank account?",
                                      ),
                                    )
                                  ) {
                                    bankAccountsApi.delete(account._id).then(() => fetchAccounts());
                                  }
                                }}
                                className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent dark:border-slate-800">
                        <TableHead className="text-slate-600 dark:text-slate-400">Name</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Number</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Bank</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Currency</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Type</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Balance</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-right text-slate-600 dark:text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow
                          key={account._id}
                          className="cursor-pointer dark:border-slate-800 dark:hover:bg-slate-900/50"
                          onClick={() => navigate(`/bank-accounts/${account._id}`)}
                        >
                          <TableCell className="font-medium text-slate-950 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className={`rounded-md p-1 ${getAccountTypeColor(account.accountType)}`}>
                                {getAccountTypeIcon(account.accountType)}
                              </div>
                              <span className="truncate">{account.name}</span>
                              {account.isDefault && (
                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {account.accountNumber || "-"}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {account.bankName || "-"}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {account.currencyCode || baseCurrency}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {getAccountTypeLabel(account.accountType)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(
                              account.cachedBalance ?? account.openingBalance ?? 0,
                              account.currencyCode || baseCurrency,
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={account.isActive ? "secondary" : "outline"}
                              className={
                                account.isActive
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "text-slate-500 dark:text-slate-400"
                              }
                            >
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/bank-accounts/${account._id}/edit`);
                                }}
                                className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      t(
                                        "bankAccounts.confirmations.deleteAccount",
                                        "Are you sure you want to delete this bank account?",
                                      ),
                                    )
                                  ) {
                                    bankAccountsApi.delete(account._id).then(() => fetchAccounts());
                                  }
                                }}
                                className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
              </>
            )}

            {activeTab === "fixed-deposits" && (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Fixed Deposits</CardTitle>
                    <Button size="sm" onClick={() => setShowFdDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" /> New Fixed Deposit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Search deposits..."
                    value={fdSearch}
                    onChange={(e) => setFdSearch(e.target.value)}
                    className="max-w-sm mb-4"
                  />
                  {fdLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                  ) : (fdData || []).filter((f: any) =>
                    f.depositReference?.toLowerCase().includes(fdSearch.toLowerCase()) ||
                    f.bankName?.toLowerCase().includes(fdSearch.toLowerCase())
                  ).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Landmark className="h-10 w-10 mb-2" />
                      <p>No fixed deposits found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {(fdData || []).filter((f: any) =>
                        f.depositReference?.toLowerCase().includes(fdSearch.toLowerCase()) ||
                        f.bankName?.toLowerCase().includes(fdSearch.toLowerCase())
                      ).map((f: any) => (
                        <div key={f._id} className="flex items-center justify-between py-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white">{f.depositReference}</p>
                            <p className="text-xs text-slate-500">{f.bankName} • Principal: {Number(f.principalAmount).toLocaleString()} • Rate: {f.interestRate}%</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(f.startDate).toLocaleDateString()} → {new Date(f.maturityDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              f.status === "active" ? "bg-blue-50 text-blue-700" :
                              f.status === "matured" ? "bg-emerald-50 text-emerald-700" :
                              f.status === "closed" ? "bg-slate-100 text-slate-700" :
                              "bg-amber-50 text-amber-700"
                            }>{f.status}</Badge>
                            {f.status === "active" && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => placeMutation.mutate(f._id)} disabled={placeMutation.isPending}>
                                  <TrendingUp className="mr-1 h-3.5 w-3.5" /> Place
                                </Button>
                                <Button size="sm" onClick={() => matureMutation.mutate(f._id)} disabled={matureMutation.isPending}>
                                  <CheckCircle className="mr-1 h-3.5 w-3.5" /> Mature
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "interest-income" && (
              <div className="space-y-6">
                {/* Period Selector */}
                <div className="flex gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex gap-1">
                    <Input type="number" value={iiYear} onChange={(e) => setIiYear(parseInt(e.target.value))} className="w-32 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                    <Input type="number" min={1} max={12} value={iiMonth} onChange={(e) => setIiMonth(parseInt(e.target.value))} className="w-28 dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                  </div>
                </div>

                {/* Interest-bearing Accounts */}
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                      <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      Interest-Bearing Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {iiSummaryLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : !(iiSummary || []).length ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <TrendingUp className="h-10 w-10 mb-2" />
                        <p>No interest-bearing accounts configured</p>
                        <p className="text-xs mt-1">Set an interest rate on a bank account to see it here</p>
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-slate-800">
                        {(iiSummary || []).map((acc: any) => (
                          <div key={acc._id} className="flex items-center justify-between py-4">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white">{acc.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Balance: {Number(acc.balance).toLocaleString()} • Rate: {acc.rate}% • Method: {acc.method}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => previewMutation.mutate({ id: acc._id, y: iiYear, m: iiMonth })} disabled={previewMutation.isPending} className="dark:border-slate-700 dark:text-slate-200">
                                <Calculator className="mr-1.5 h-3.5 w-3.5" /> Preview
                              </Button>
                              <Button size="sm" onClick={() => postMutation.mutate({ id: acc._id, y: iiYear, m: iiMonth })} disabled={postMutation.isPending}>
                                <Send className="mr-1.5 h-3.5 w-3.5" /> Post
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Accruals */}
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Interest Accruals ({iiMonth}/{iiYear})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {iiAccrualsLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : !(iiAccruals || []).length ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <CalendarDays className="h-10 w-10 mb-2" />
                        <p>No accruals for this period</p>
                        <p className="text-xs mt-1">Use Preview then Post to generate accruals</p>
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-slate-800">
                        {(iiAccruals || []).map((a: any) => (
                          <div key={a._id} className="flex items-center justify-between py-4">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white">{a.bankAccount?.name || "Fixed Deposit"}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Principal: {Number(a.principal).toLocaleString()} • Interest: {Number(a.calculatedInterest).toFixed(2)} • {a.method}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                a.status === "pending" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                                a.status === "posted" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" :
                                a.status === "confirmed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                                "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              }>{a.status}</Badge>
                              {a.status === "pending" && (
                                <Button variant="outline" size="sm" onClick={() => confirmMutation.mutate(a._id)} disabled={confirmMutation.isPending} className="dark:border-slate-700 dark:text-slate-200">
                                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Confirm
                                </Button>
                              )}
                              {a.status !== "reversed" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => reverseMutation.mutate(a._id)} disabled={reverseMutation.isPending}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Deposit Dialog */}
        <Dialog open={showFdDialog} onOpenChange={setShowFdDialog}>
          <DialogContent className="max-w-lg dark:border-slate-800 dark:bg-slate-950">
            <DialogHeader>
              <DialogTitle className="dark:text-white">New Fixed Deposit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Deposit Reference <span className="text-red-500">*</span></Label>
                <Input
                  value={fdForm.depositReference}
                  onChange={(e) => setFdForm({ ...fdForm, depositReference: e.target.value })}
                  placeholder="e.g., FD-2026-001"
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Bank Name <span className="text-red-500">*</span></Label>
                <Input
                  value={fdForm.bankName}
                  onChange={(e) => setFdForm({ ...fdForm, bankName: e.target.value })}
                  placeholder="e.g., Equity Bank"
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Principal Amount <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fdForm.principalAmount}
                    onChange={(e) => setFdForm({ ...fdForm, principalAmount: e.target.value })}
                    placeholder="0.00"
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Interest Rate (% p.a.) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fdForm.interestRate}
                    onChange={(e) => setFdForm({ ...fdForm, interestRate: e.target.value })}
                    placeholder="e.g., 8.5"
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Start Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={fdForm.startDate}
                    onChange={(e) => setFdForm({ ...fdForm, startDate: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Maturity Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={fdForm.maturityDate}
                    onChange={(e) => setFdForm({ ...fdForm, maturityDate: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Linked Bank Account <span className="text-red-500">*</span></Label>
                <Select
                  value={fdForm.bankAccountId}
                  onValueChange={(v) => setFdForm({ ...fdForm, bankAccountId: v })}
                >
                  <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    {accounts.filter((a) => a.isActive !== false).map((a) => (
                      <SelectItem key={a._id} value={a._id}>{a.name} ({a.currencyCode || baseCurrency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFdDialog(false)} className="dark:border-slate-700 dark:text-slate-200">Cancel</Button>
              <Button
                onClick={() => createFdMutation.mutate({
                  depositReference: fdForm.depositReference,
                  bankName: fdForm.bankName,
                  principalAmount: parseFloat(fdForm.principalAmount) || 0,
                  interestRate: parseFloat(fdForm.interestRate) || 0,
                  startDate: fdForm.startDate,
                  maturityDate: fdForm.maturityDate,
                  bankAccountId: fdForm.bankAccountId,
                })}
                disabled={!fdForm.depositReference || !fdForm.bankName || !fdForm.principalAmount || !fdForm.interestRate || !fdForm.startDate || !fdForm.maturityDate || !fdForm.bankAccountId || createFdMutation.isPending}
              >
                {createFdMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BankToCashTransferDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          bankAccounts={accounts.filter((a) => a.isActive !== false)}
          onSuccess={() => fetchAccounts()}
        />
      </Layout>
    </TooltipProvider>
  );
}
