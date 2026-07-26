import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { bankAccountsApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Upload,
  Calculator,
  Landmark,
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  Calendar,
  FileUp,
  PiggyBank,
  BadgeCheck,
  AlertCircle,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Badge } from "@/app/components/ui/badge";
import { useTranslation } from "react-i18next";
import BankReconciliationPage from "./BankReconciliationPage";

interface StatementLine {
  _id: string;
  transactionDate: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  isReconciled: boolean;
}

interface ReconciliationItem {
  _id: string;
  date: string;
  description: string;
  amount: number;
  matched: boolean;
}

const TODAY = new Date().toISOString().split("T")[0];

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

const BANK_INFLOW_TYPES = new Set(["deposit", "transfer_in", "opening", "debit"]);
const isLikelyObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

const isBankInflow = (type: string) => BANK_INFLOW_TYPES.has(type);

const getTransactionReference = (tx: any) =>
  tx.referenceNumber ||
  tx.sourceReference ||
  tx.journalEntryNumber ||
  (tx.reference && !isLikelyObjectId(tx.reference) ? tx.reference : null) ||
  "-";

const getDisplayType = (tx: any) => {
  if (tx.type === "debit") return "deposit";
  if (tx.type === "credit") return "withdrawal";
  if (
    String(tx.description || "").toLowerCase().includes("opening balance")
  ) {
    return "opening";
  }
  return tx.type;
};

export default function BankAccountDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statementLines, _setStatementLines] = useState<StatementLine[]>([]);

  // Fix B — initialise active tab from ?tab= URL query param
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "transactions",
  );

  // ── Reconciliation state ─────────────────────────────────────────────────────
  const [journalItems, _setJournalItems] = useState<ReconciliationItem[]>([]);
  const [bankItems, _setBankItems] = useState<ReconciliationItem[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  // Fix E — statement balance / date inputs + reconcile call state
  const [reconcileBalance, setReconcileBalance] = useState("");
  const [reconcileDate, setReconcileDate] = useState(TODAY);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);

  // Fix A — Deposit / Withdraw dialog state
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [txSaving, setTxSaving] = useState(false);
  const [txForm, setTxForm] = useState({
    amount: "",
    description: "",
    paymentMethod: "cash",
    referenceNumber: "",
    date: TODAY,
  });

  // Fix C — Transaction filter state
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Fix D — Import Statement dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interest accrual state
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestResult, setInterestResult] = useState<any>(null);

  // Fetch statement lines - ONLY show imported CSV data
  const fetchStatementLines = useCallback(async () => {
    // Statement lines are ONLY from CSV/Excel imports
    // We don't fetch journal transactions here
    // The statementLines state is populated only via handleImport
    console.log('[BankImport] StatementLines tab only shows imported CSV data');
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchAccount = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await bankAccountsApi.getById(id);
      if (response.success) {
        setAccount(response.data);
      }
    } catch (error) {
      console.error("[BankAccountDetailPage] Failed to fetch account:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fix C — fetchTransactions accepts optional filter params
  const fetchTransactions = useCallback(
    async (filters?: {
      startDate?: string;
      endDate?: string;
      type?: string;
    }) => {
      if (!id) return;
      try {
        const params: Record<string, string> = {};
        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        if (filters?.type && filters.type !== "all") params.type = filters.type;
        const response = await bankAccountsApi.getTransactions(id, params);
        if (response.success) {
          const txs = (response.data as any[]) || [];
          const sortedTxs = [...txs].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

          const openingBalance = Number(
            account?.openingBalance?.$numberDecimal ??
              account?.openingBalance ??
              0,
          );

          let runningBalance = 0;
          const txsWithBalance = sortedTxs.map((tx) => {
            const displayType = getDisplayType(tx);
            const storedBalance = tx.balance ?? tx.balanceAfter;
            if (storedBalance != null && !Number.isNaN(Number(storedBalance))) {
              runningBalance = Number(storedBalance);
              return { ...tx, type: displayType, runningBalance };
            }

            if (isBankInflow(tx.type) || displayType === "opening") {
              runningBalance += Number(tx.amount || 0);
            } else if (
              tx.type === "withdrawal" ||
              tx.type === "transfer_out" ||
              tx.type === "credit"
            ) {
              runningBalance -= Number(tx.amount || 0);
            } else if (tx.type === "adjustment") {
              runningBalance += Number(tx.amount || 0);
            }

            return { ...tx, type: displayType, runningBalance };
          });

          if (
            txsWithBalance.length === 1 &&
            getDisplayType(txsWithBalance[0]) === "opening" &&
            openingBalance > 0 &&
            txsWithBalance[0].runningBalance === 0
          ) {
            txsWithBalance[0].runningBalance = openingBalance;
          }

          setTransactions(
            txsWithBalance.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            ),
          );
        }
      } catch (error) {
        console.error(
          "[BankAccountDetailPage] Failed to fetch transactions:",
          error,
        );
      }
    },
    [id, account?.openingBalance],
  );

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (account) {
      fetchTransactions();
      fetchStatementLines();
    }
  }, [account, fetchTransactions, fetchStatementLines]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatCurrency = (amount: any, currency: string = "USD") => {
    if (amount === null || amount === undefined || amount === "") return "-";
    let num: number;
    if (typeof amount === "object") {
      if (amount.$numberDecimal) {
        num = parseFloat(amount.$numberDecimal);
      } else if (amount.toString && typeof amount.toString === "function") {
        const str = amount.toString();
        if (str === "[object Object]") return "-";
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
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
      }).format(num || 0);
    } catch {
      return `${currency} ${num.toFixed(2)}`;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const getDifference = () => {
    const journalAmount = unmatchedJournalItems.find((j) => j._id === selectedJournal)?.amount || 0;
    const bankAmount = unmatchedStatementItems.find((b) => b._id === selectedBank)?.amount || 0;
    return journalAmount - bankAmount;
  };

  // ── Fix A: deposit/withdrawal submit ────────────────────────────────────────
  const openTxDialog = (type: "deposit" | "withdrawal") => {
    setTxType(type);
    setTxForm({
      amount: "",
      description: "",
      paymentMethod: "cash",
      referenceNumber: "",
      date: TODAY,
    });
    setShowTxDialog(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setTxSaving(true);
    try {
      const response = await bankAccountsApi.addTransaction(id, {
        type: txType,
        amount: parseFloat(txForm.amount) || 0,
        description: txForm.description,
        paymentMethod: txForm.paymentMethod,
        referenceNumber: txForm.referenceNumber,
        date: txForm.date,
      } as any);
      if (response.success) {
        setShowTxDialog(false);
        setTxForm({
          amount: "",
          description: "",
          paymentMethod: "cash",
          referenceNumber: "",
          date: TODAY,
        });
        fetchTransactions({
          startDate: txStartDate,
          endDate: txEndDate,
          type: txTypeFilter,
        });
        fetchAccount();
      } else {
        alert("Failed to add transaction. Please try again.");
      }
    } catch (error) {
      console.error(
        "[BankAccountDetailPage] Failed to add transaction:",
        error,
      );
      alert("Failed to add transaction. Please try again.");
    } finally {
      setTxSaving(false);
    }
  };

  // ── Fix C: apply filter ──────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    fetchTransactions({
      startDate: txStartDate,
      endDate: txEndDate,
      type: txTypeFilter,
    });
  };

  // ── Fix D: import statement ──────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportMessage({
        ok: false,
        text: "Invalid file type. Please upload a CSV or Excel file.",
      });
      return;
    }
    
    setImportFile(file);
    setImportMessage(null);
    
    // Parse the file
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('[BankImport] CSV parsed:', results);
          const parsed = results.data as any[];
          const mapped = parsed.map((row: any) => ({
            date: row.date || row.Date || row.DATE || row.transactionDate || row['Transaction Date'] || '',
            description: row.description || row.Description || row.DESCRIPTION || row.desc || row['Description'] || '',
            reference: row.reference || row.Reference || row.REFERENCE || row.ref || row['Reference'] || '',
            debit: parseFloat(row.debit || row.Debit || row.DEBIT || row.dr || row['Debit'] || row.withdrawal || row.Withdrawal || 0),
            credit: parseFloat(row.credit || row.Credit || row.CREDIT || row.cr || row['Credit'] || row.deposit || row.Deposit || 0),
          })).filter((row: any) => row.date && (row.debit > 0 || row.credit > 0 || row.description));
          
          console.log('[BankImport] Mapped data:', mapped);
          setImportData(mapped);
          setImportMessage({
            ok: true,
            text: `Successfully parsed ${mapped.length} transactions from CSV.`,
          });
        },
        error: (error) => {
          console.error('[BankImport] CSV parse error:', error);
          setImportMessage({
            ok: false,
            text: `Failed to parse CSV: ${error.message}`,
          });
        },
      });
    } else {
      // Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          console.log('[BankImport] Excel parsed:', jsonData);
          
          const mapped = jsonData.map((row: any) => ({
            date: row.date || row.Date || row.DATE || row.transactionDate || row['Transaction Date'] || '',
            description: row.description || row.Description || row.DESCRIPTION || row.desc || row['Description'] || '',
            reference: row.reference || row.Reference || row.REFERENCE || row.ref || row['Reference'] || '',
            debit: parseFloat(row.debit || row.Debit || row.DEBIT || row.dr || row['Debit'] || row.withdrawal || row.Withdrawal || 0),
            credit: parseFloat(row.credit || row.Credit || row.CREDIT || row.cr || row['Credit'] || row.deposit || row.Deposit || 0),
          })).filter((row: any) => row.date && (row.debit > 0 || row.credit > 0 || row.description));
          
          console.log('[BankImport] Mapped data:', mapped);
          setImportData(mapped);
          setImportMessage({
            ok: true,
            text: `Successfully parsed ${mapped.length} transactions from Excel.`,
          });
        } catch (error) {
          console.error('[BankImport] Excel parse error:', error);
          setImportMessage({
            ok: false,
            text: "Failed to parse Excel file. Please check the format.",
          });
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleImport = async () => {
    if (!id || importData.length === 0) {
      setImportMessage({
        ok: false,
        text: "No data to import. Please select a file first.",
      });
      return;
    }
    
    console.log('[BankImport] Starting import:', { accountId: id, count: importData.length });
    setImportSaving(true);
    setImportMessage(null);
    
    try {
      const payload = {
        transactions: importData.map(tx => ({
          ...tx,
          type: tx.debit > 0 ? 'withdrawal' : 'deposit',
          amount: tx.debit > 0 ? tx.debit : tx.credit,
          source: 'statement_import',
          referenceType: 'statement',
        })),
      };
      
      console.log('[BankImport] Sending payload:', payload);
      
      const response = await bankAccountsApi.importCSV(id, payload);
      
      console.log('[BankImport] API response:', response);
      
      if (response.success) {
        const count = (response.data as any)?.imported ?? importData.length;
        setImportMessage({
          ok: true,
          text: `Successfully imported ${count} transaction(s).`,
        });
        
        // Add imported data to statementLines state (ONLY CSV data, not journal transactions)
        const newStatementLines: StatementLine[] = importData.map((tx, index) => ({
          _id: `imported-${Date.now()}-${index}`,
          transactionDate: tx.date,
          description: tx.description,
          reference: tx.reference || "",
          debit: tx.debit || 0,
          credit: tx.credit || 0,
          balance: 0, // Will be calculated
          isReconciled: false,
        }));
        
        _setStatementLines(prev => [...prev, ...newStatementLines]);
        
        setImportFile(null);
        setImportData([]);
        
        // Refresh transactions tab only
        await fetchTransactions({
          startDate: txStartDate,
          endDate: txEndDate,
          type: txTypeFilter,
        });
        await fetchAccount();
      } else {
        setImportMessage({
          ok: false,
          text: "Import failed — the server rejected the request.",
        });
      }
    } catch (error: any) {
      console.error("[BankImport] Import error:", error);
      setImportMessage({
        ok: false,
        text: error.message || "Import failed — please try again.",
      });
    } finally {
      setImportSaving(false);
    }
  };

  // ── Fix E: reconcile ─────────────────────────────────────────────────────────
  const handleReconcile = async () => {
    if (!id) return;
    setReconciling(true);
    setReconcileMessage(null);
    try {
      const response = await bankAccountsApi.reconcile(id, {
        statementBalance: parseFloat(reconcileBalance) || 0,
        statementDate: reconcileDate,
      });
      if (response.success) {
        setReconcileMessage("✓ Reconciliation completed successfully.");
        setSelectedJournal(null);
        setSelectedBank(null);
        // Refresh to get updated lists
        fetchTransactions({
          startDate: txStartDate,
          endDate: txEndDate,
          type: txTypeFilter,
        });
      } else {
        setReconcileMessage(
          "Reconciliation failed — please check your inputs and try again.",
        );
      }
    } catch (error) {
      console.error("[BankAccountDetailPage] Reconcile error:", error);
      setReconcileMessage("Reconciliation failed — please try again.");
    } finally {
      setReconciling(false);
    }
  };

  // ── Interest accrual ─────────────────────────────────────────────────────────
  const handleAccrueInterest = async () => {
    if (!id) return;
    setInterestLoading(true);
    try {
      const response = await bankAccountsApi.accrueInterest(id);
      if (response.success) {
        setInterestResult(response.data);
        setShowInterestDialog(true);
        toast.success(response.message);
        // Refresh account and transactions
        fetchAccount();
        fetchTransactions();
      } else {
        toast.error(response.message || "Interest accrual failed");
      }
    } catch (error: any) {
      console.error("[BankAccountDetailPage] Interest accrual error:", error);
      toast.error(error?.message || "Failed to accrue interest");
    } finally {
      setInterestLoading(false);
    }
  };

  // Prepare reconciliation data - journal items (transactions) vs statement items (imported)
  const unmatchedJournalItems = transactions.filter(tx => 
    !tx.isReconciled && 
    (tx.type === 'deposit' || tx.type === 'withdrawal' || tx.type === 'transfer_in' || tx.type === 'transfer_out')
  ).map(tx => ({
    _id: tx._id,
    date: tx.date,
    description: tx.description || tx.referenceNumber || tx.type,
    amount: tx.type === 'deposit' || tx.type === 'transfer_in' ? tx.amount : -tx.amount,
    matched: false,
  }));

  const unmatchedStatementItems = statementLines.filter(line => !line.isReconciled).map(line => ({
    _id: line._id,
    date: line.transactionDate,
    description: line.description,
    amount: line.credit > 0 ? line.credit : -line.debit,
    matched: false,
  }));

  // Compute actual statement balance from last imported line (for display)
  const computedStatementBalance = statementLines.length > 0
    ? statementLines[statementLines.length - 1].balance
    : parseFloat(reconcileBalance) || 0;
  const computedBookBalance = account?.currentBalance || 0;
  const computedDifference = computedStatementBalance - computedBookBalance;

  // ── Loading guard ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const accountType = account?.accountType || "bk_bank";
  const typeColor = getAccountTypeColor(accountType);
  const currencyCode = account?.currencyCode || "USD";

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_380px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/bank-accounts")}
                    className="h-10 w-10 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className={`rounded-lg p-2.5 ring-1 ${typeColor}`}>
                    {getAccountTypeIcon(accountType)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {account?.name || t("bankAccount.details", "Bank Account Details")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {account?.bankName || getAccountTypeLabel(accountType)}
                      {account?.accountNumber ? ` · ${account.accountNumber}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`gap-1.5 ${typeColor}`}
                  >
                    {getAccountTypeIcon(accountType)}
                    {getAccountTypeLabel(accountType)}
                  </Badge>
                  {account?.isDefault && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Default Account
                    </Badge>
                  )}
                  <Badge
                    variant={account?.isActive ? "secondary" : "outline"}
                    className={
                      account?.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {account?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current Balance
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                  {formatCurrency(account?.cachedBalance ?? account?.openingBalance ?? 0, currencyCode)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                    {currencyCode}
                  </Badge>
                  <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                    Opening: {formatCurrency(account?.openingBalance ?? 0, currencyCode)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Current Balance
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(account?.cachedBalance ?? 0, currencyCode)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Opening Balance
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(account?.openingBalance ?? 0, currencyCode)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Currency
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {currencyCode}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <Landmark className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Account Type
                    </p>
                    <p className="mt-3 text-xl font-bold text-slate-950 dark:text-white">
                      {getAccountTypeLabel(accountType)}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ring-1 ${typeColor}`}>
                    {getAccountTypeIcon(accountType)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 h-11 bg-slate-100 p-1 dark:bg-slate-900">
              <TabsTrigger
                value="transactions"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:text-white"
              >
                <TrendingUp className="h-4 w-4" />
                {t("bankAccount.transactions", "Transactions")}
              </TabsTrigger>
              <TabsTrigger
                value="reconciliation"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:text-white"
              >
                <Calculator className="h-4 w-4" />
                {t("bankAccount.professionalReconciliation", "Reconciliation")}
              </TabsTrigger>
            </TabsList>

            {/* ── Transactions Tab ──────────────────────────────────────────────── */}
            <TabsContent value="transactions">
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      {t("bankAccounts.journalTransactions", "Journal Transactions")}
                      <Badge variant="secondary" className="h-6">
                        {transactions.length}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTxDialog("deposit")}
                        className="h-9 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        <TrendingUp className="h-4 w-4" />
                        {t("bankAccount.deposit", "Deposit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTxDialog("withdrawal")}
                        className="h-9 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <TrendingDown className="h-4 w-4" />
                        {t("bankAccount.withdraw", "Withdraw")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          fetchTransactions({
                            startDate: txStartDate,
                            endDate: txEndDate,
                            type: txTypeFilter,
                          })
                        }
                        className="h-9 gap-1.5 dark:border-slate-700 dark:text-slate-200"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("common.refresh", "Refresh")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filter bar */}
                  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {t("bankAccount.dateFrom", "Date From")}
                      </Label>
                      <Input
                        type="date"
                        className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:border-slate-700"
                        value={txStartDate}
                        onChange={(e) => setTxStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {t("bankAccount.dateTo", "Date To")}
                      </Label>
                      <Input
                        type="date"
                        className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:border-slate-700"
                        value={txEndDate}
                        onChange={(e) => setTxEndDate(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {t("bankAccount.type", "Type")}
                      </Label>
                      <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                        <SelectTrigger className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                          <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                          <SelectItem value="deposit">{t("bankAccount.deposit", "Deposit")}</SelectItem>
                          <SelectItem value="withdrawal">{t("bankAccount.withdrawal", "Withdrawal")}</SelectItem>
                          <SelectItem value="transfer_in">{t("bankAccount.transferIn", "Transfer In")}</SelectItem>
                          <SelectItem value="transfer_out">{t("bankAccount.transferOut", "Transfer Out")}</SelectItem>
                          <SelectItem value="adjustment">{t("bankAccount.adjustment", "Adjustment")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" onClick={handleApplyFilters} className="h-9 bg-blue-600 hover:bg-blue-700">
                        {t("common.apply", "Apply")}
                      </Button>
                    </div>
                  </div>

                  {/* Transactions table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Reference</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Type</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-10 text-sm text-slate-500 dark:text-slate-400"
                            >
                              {t("bankAccount.noTransactions", "No transactions found")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactions.map((tx) => {
                            const inflow = isBankInflow(tx.type);
                            return (
                            <TableRow
                              key={tx._id}
                              className="dark:border-slate-800 dark:hover:bg-slate-900/50"
                            >
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                                {formatDate(tx.date)}
                              </TableCell>
                              <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                                {tx.description || "-"}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                {getTransactionReference(tx)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    inflow
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                  }
                                >
                                  {tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                <span
                                  className={
                                    inflow
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-red-600 dark:text-red-400"
                                  }
                                >
                                  {inflow ? "+" : "-"}
                                  {formatCurrency(tx.amount, currencyCode)}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {formatCurrency(tx.runningBalance, currencyCode)}
                              </TableCell>
                            </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Reconciliation Tab ───────────────────────────────────────────── */}
            <TabsContent value="reconciliation">
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                      <Calculator className="h-4 w-4 text-blue-500" />
                      {t("bankAccount.bankReconciliation", "Bank Reconciliation")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {id && (
                    <BankReconciliationPage
                      embedded
                      accountId={id}
                      accountData={account}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Fix A: Deposit / Withdraw Dialog ────────────────────────────────── */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {txType === "deposit"
                ? t("bankAccount.addDeposit", "Add Deposit")
                : t("bankAccount.addWithdrawal", "Add Withdrawal")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTxSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tx-amount" className="dark:text-slate-200">
                {t("bankAccount.amount", "Amount")} *
              </Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={txForm.amount}
                onChange={(e) =>
                  setTxForm({ ...txForm, amount: e.target.value })
                }
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-description" className="dark:text-slate-200">
                {t("bankAccount.description", "Description")}
              </Label>
              <Input
                id="tx-description"
                placeholder={t(
                  "bankAccount.descriptionPlaceholder",
                  "e.g., Payment received",
                )}
                value={txForm.description}
                onChange={(e) =>
                  setTxForm({ ...txForm, description: e.target.value })
                }
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-payment-method" className="dark:text-slate-200">
                {t("bankAccount.paymentMethod", "Payment Method")}
              </Label>
              <Select
                value={txForm.paymentMethod}
                onValueChange={(v) =>
                  setTxForm({ ...txForm, paymentMethod: v })
                }
              >
                <SelectTrigger id="tx-payment-method" className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="cash" className="dark:text-slate-200">
                    {t("bankAccount.cash", "Cash")}
                  </SelectItem>
                  <SelectItem value="bank_transfer" className="dark:text-slate-200">
                    {t("bankAccount.bankTransfer", "Bank Transfer")}
                  </SelectItem>
                  <SelectItem value="cheque" className="dark:text-slate-200">
                    {t("bankAccount.cheque", "Cheque")}
                  </SelectItem>
                  <SelectItem value="mobile_money" className="dark:text-slate-200">
                    {t("bankAccount.mobileMoney", "Mobile Money")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-reference" className="dark:text-slate-200">
                {t("bankAccount.referenceNumber", "Reference Number")}
              </Label>
              <Input
                id="tx-reference"
                placeholder={t(
                  "bankAccount.referencePlaceholder",
                  "e.g., REF-001",
                )}
                value={txForm.referenceNumber}
                onChange={(e) =>
                  setTxForm({ ...txForm, referenceNumber: e.target.value })
                }
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date" className="dark:text-slate-200">{t("bankAccount.date", "Date")}</Label>
              <Input
                id="tx-date"
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTxDialog(false)}
                disabled={txSaving}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={txSaving}
                className={
                  txType === "deposit"
                    ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                }
              >
                {txSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.saving", "Saving...")}
                  </>
                ) : txType === "deposit" ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {t("bankAccount.confirmDeposit", "Deposit")}
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-2 h-4 w-4" />
                    {t("bankAccount.confirmWithdrawal", "Withdraw")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Fix D: Import Statement Dialog ──────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {t("bankAccount.importStatement", "Import Bank Statement")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              {t(
                "bankAccount.importDescription",
                "Upload a CSV or Excel file containing bank statement transactions. The file should include columns for date, description, debit/credit amounts, and reference.",
              )}
            </p>
            <div className="space-y-2">
              <Label htmlFor="import-file" className="dark:text-slate-200">
                {t("bankAccount.selectFile", "Select File")}
              </Label>
              <Input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                {t("bankAccount.supportedFormats", "Supported formats: CSV, Excel (.xlsx, .xls)")}
              </p>
            </div>
            
            {importFile && (
              <div className="p-3 bg-muted rounded-md dark:bg-slate-700">
                <p className="text-sm font-medium dark:text-slate-200">{importFile.name}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
            
            {importData.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  {importData.length} transactions ready to import
                </p>
              </div>
            )}
            
            {importMessage && (
              <p
                className={`text-sm font-medium ${
                  importMessage.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {importMessage.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportData([]);
                setImportMessage(null);
              }}
              disabled={importSaving}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={importSaving || importData.length === 0}
              className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              {importSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("bankAccount.importing", "Importing...")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("bankAccount.import", "Import")} ({importData.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
