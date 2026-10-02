import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { arReceiptsApi } from "@/lib/api";
import { Layout } from "@/app/layout/Layout";
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Calendar,
  Building2,
  FileText,
  XCircle,
  CheckCircle,
  Clock,
  Receipt,
  AlertCircle,
  RefreshCw,
  Edit,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

interface ARReceiptDetail {
  _id: string;
  receiptNumber: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  receiptDate: string;
  paymentMethod: string;
  bankAccount?: {
    _id: string;
    name: string;
    accountNumber?: string;
  };
  amountReceived: string;
  currencyCode: string;
  reference?: string;
  notes?: string;
  status: "draft" | "posted" | "reversed";
  postedAt?: string;
  postedBy?: {
    name: string;
  };
  reversedAt?: string;
  reversedBy?: {
    name: string;
  };
  reversalReason?: string;
  journalEntry?: {
    _id: string;
    entryNumber: string;
  };
  allocations: Array<{
    _id: string;
    invoice: {
      _id: string;
      invoiceNumber: string;
      referenceNo: string;
    };
    amountAllocated: string;
  }>;
  unallocatedAmount: string;
  createdAt: string;
}

export default function ARReceiptDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [receipt, setReceipt] = useState<ARReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReceipt();
    }
  }, [id]);

  const fetchReceipt = async () => {
    setLoading(true);
    try {
      const response = await arReceiptsApi.getById(id!);
      if (response.success && response.data) {
        const receiptData = response.data;
        setReceipt({
          ...receiptData,
          receiptNumber: receiptData.referenceNo,
          allocations: response.allocations || [],
          unallocatedAmount: response.data.unallocatedAmount || "0",
        });
      }
    } catch (error) {
      console.error("Failed to fetch receipt:", error);
      toast({
        title: t("common.error"),
        description: t(
          "arReceipt.fetchError",
          "Failed to fetch receipt details",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!id || posting) return;
    setPosting(true);
    try {
      await arReceiptsApi.post(id);
      toast({
        title: t("common.success"),
        description: t(
          "arReceipt.postSuccess",
          "Receipt recorded successfully",
        ),
      });
      fetchReceipt();
    } catch (error) {
      console.error("Failed to post receipt:", error);
      toast({
        title: t("common.error"),
        description: t("arReceipt.postError", "Failed to post receipt"),
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleReverse = async () => {
    if (!id || reversing) return;
    const reason = window.prompt(
      t("arReceipt.enterReversalReason", "Enter reversal reason:"),
    );
    if (!reason) return;
    setReversing(true);
    try {
      await arReceiptsApi.reverse(id, reason);
      toast({
        title: t("common.success"),
        description: t(
          "arReceipt.reverseSuccess",
          "Receipt reversed successfully",
        ),
      });
      fetchReceipt();
    } catch (error) {
      console.error("Failed to reverse receipt:", error);
      toast({
        title: t("common.error"),
        description: t("arReceipt.reverseError", "Failed to reverse receipt"),
        variant: "destructive",
      });
    } finally {
      setReversing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("arReceipt.status.draft", "Draft")}
          </Badge>
        );
      case "posted":
        return (
          <Badge
            variant="default"
            className="flex items-center gap-1 bg-green-600"
          >
            <CheckCircle className="h-3 w-3" />
            {t("arReceipt.status.posted", "Posted")}
          </Badge>
        );
      case "reversed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {t("arReceipt.status.reversed", "Reversed")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      bank_transfer: t(
        "arReceipt.paymentMethods.bank_transfer",
        "Bank Transfer",
      ),
      cash: t("arReceipt.paymentMethods.cash", "Cash"),
      cheque: t("arReceipt.paymentMethods.cheque", "Cheque"),
      card: t("arReceipt.paymentMethods.card", "Card"),
      other: t("arReceipt.paymentMethods.other", "Other"),
    };
    return methods[method] || method;
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(num);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  if (!receipt) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("arReceipt.notFound", "Receipt not found")}
            </p>
            <Button onClick={() => navigate("/ar-receipts")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.back", "Back to Receipts")}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/ar-receipts")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.back", "Back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {t("arReceipt.receiptDetails", "Receipt Details")}
              </h1>
              <p className="text-muted-foreground">{receipt.receiptNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              {t("common.print", "Print")}
            </Button>
            {receipt.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ar-receipts/${receipt._id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("common.edit", "Edit")}
                </Button>
                <Button onClick={handlePost} disabled={posting}>
                  {posting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {posting
                    ? t("arReceipt.posting", "Recording...")
                    : t("arReceipt.post", "Record Receipt")}
                </Button>
              </>
            )}
            {receipt.status === "posted" && (
              <Button
                variant="destructive"
                onClick={handleReverse}
                disabled={reversing}
              >
                {reversing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                {reversing
                  ? t("arReceipt.reversing", "Reversing...")
                  : t("arReceipt.reverse", "Reverse")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {t("arReceipt.receiptInfo", "Receipt Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(receipt.status)}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("arReceipt.client", "Client")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {receipt.client?.name}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("arReceipt.receiptDate", "Receipt Date")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDate(receipt.receiptDate)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("arReceipt.paymentMethod", "Payment Method")}
                    </label>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getPaymentMethodLabel(receipt.paymentMethod)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("arReceipt.bankAccount", "Bank Account")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {receipt.bankAccount?.name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("arReceipt.amountReceived", "Amount Received")}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {formatCurrency(
                          receipt.amountReceived,
                          receipt.currencyCode,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("arReceipt.currency", "Currency")}
                    </label>
                    <span className="font-medium">{receipt.currencyCode}</span>
                  </div>
                </div>

                {receipt.reference && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">
                        {t("arReceipt.reference", "Reference")}
                      </label>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{receipt.reference}</span>
                      </div>
                    </div>
                  </>
                )}

                {receipt.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">
                        {t("arReceipt.notes", "Notes")}
                      </label>
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {receipt.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Allocations */}
            {receipt.allocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("arReceipt.allocations", "Invoice Allocations")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 xl:hidden">{receipt.allocations.map((alloc) => <article key={alloc._id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium">{alloc.invoice?.invoiceNumber || '-'}</p><p className="break-words text-sm text-muted-foreground">{alloc.invoice?.referenceNo || '-'}</p></div><span className="shrink-0 text-right text-sm font-semibold">{formatCurrency(alloc.amountAllocated, receipt.currencyCode)}</span></div></article>)}</div>
                  <div className="hidden overflow-x-auto xl:block"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("arReceipt.invoice", "Invoice")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("arReceipt.amountAllocated", "Amount Allocated")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipt.allocations.map((alloc) => (
                        <TableRow key={alloc._id}>
                          <TableCell>
                            <div className="font-medium">
                              {alloc.invoice?.invoiceNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {alloc.invoice?.referenceNo}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              alloc.amountAllocated,
                              receipt.currencyCode,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("arReceipt.summary", "Summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("arReceipt.amountReceived", "Amount Received")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      receipt.amountReceived,
                      receipt.currencyCode,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("arReceipt.totalAllocated", "Total Allocated")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      receipt.allocations.reduce(
                        (sum, a) => sum + parseFloat(a.amountAllocated),
                        0,
                      ),
                      receipt.currencyCode,
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">
                    {t("arReceipt.unallocated", "Unallocated")}
                  </span>
                  <span
                    className={`font-bold ${parseFloat(receipt.unallocatedAmount) !== 0 ? "text-amber-600" : "text-green-600"}`}
                  >
                    {formatCurrency(
                      receipt.unallocatedAmount,
                      receipt.currencyCode,
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Audit Info */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("common.auditInfo", "Audit Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {receipt.postedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      {t(
                        "arReceipt.postedOn",
                        "Posted on {{date}} by {{user}}",
                        {
                          date: formatDate(receipt.postedAt),
                          user: receipt.postedBy?.name || "-",
                        },
                      )}
                    </span>
                  </div>
                )}
                {receipt.reversedAt && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>
                      {t(
                        "arReceipt.reversedOn",
                        "Reversed on {{date}} by {{user}}",
                        {
                          date: formatDate(receipt.reversedAt),
                          user: receipt.reversedBy?.name || "-",
                        },
                      )}
                    </span>
                  </div>
                )}
                {receipt.reversalReason && (
                  <div className="bg-muted p-2 rounded">
                    <span className="text-muted-foreground">
                      {t("arReceipt.reversalReason", "Reason")}:{" "}
                    </span>
                    {receipt.reversalReason}
                  </div>
                )}
                <Separator />
                <div className="text-muted-foreground">
                  {t("common.createdAt", "Created")}:{" "}
                  {formatDate(receipt.createdAt)}
                </div>
              </CardContent>
            </Card>

            {/* Journal Entry */}
            {receipt.journalEntry && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("arReceipt.journalEntry", "Journal Entry")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      navigate(`/journal/${receipt.journalEntry?._id}`)
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {t("arReceipt.viewJournalEntry", "View {{entryNumber}}", {
                      entryNumber: receipt.journalEntry.entryNumber,
                    })}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
