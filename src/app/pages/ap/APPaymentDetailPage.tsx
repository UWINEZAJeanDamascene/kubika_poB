import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { apPaymentsApi } from "@/lib/api";
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

interface APPaymentDetail {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  paymentDate: string;
  paymentMethod: string;
  amountPaid: string;
  unallocatedAmount?: string;
  currencyCode: string;
  exchangeRate: string;
  reference?: string;
  status: "draft" | "posted" | "reversed";
  notes?: string;
  postedAt?: string;
  postedBy?: {
    name: string;
  };
  reversedAt?: string;
  reversedBy?: {
    name: string;
  };
  reversalReason?: string;
  bankAccount?: {
    name: string;
    accountNumber: string;
  };
  journalEntry?: {
    _id: string;
    entryNumber: string;
  };
  allocations: Array<{
    _id: string;
    grn: {
      _id: string;
      referenceNo: string;
      totalAmount: string;
      balance: string;
      paymentStatus?: string;
    };
    amountAllocated: string;
  }>;
}

export default function APPaymentDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<APPaymentDetail | null>(null);

  useEffect(() => {
    if (id) {
      fetchPayment();
    }
  }, [id]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await apPaymentsApi.getById(id!);
      if (response.success) {
        // Combine payment data with allocations from separate field
        const paymentData: APPaymentDetail = {
          ...response.data,
          exchangeRate: (response.data as any).exchangeRate || "1",
          allocations: (response.allocations ||
            []) as APPaymentDetail["allocations"],
          unallocatedAmount: (response.data as any).unallocatedAmount || "0",
        };
        setPayment(paymentData);
      }
    } catch (error) {
      console.error("Failed to fetch payment:", error);
      toast({
        title: t("common.error"),
        description: t(
          "apPayment.fetchError",
          "Failed to fetch payment details",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [posting, setPosting] = useState(false);
  const [reversing, setReversing] = useState(false);

  const handlePost = async () => {
    if (!id || posting) return;
    setPosting(true);
    try {
      await apPaymentsApi.post(id);
      toast({
        title: t("common.success"),
        description: t(
          "apPayment.postSuccess",
          "Payment recorded successfully",
        ),
      });
      fetchPayment();
    } catch (error) {
      console.error("Failed to post payment:", error);
      toast({
        title: t("common.error"),
        description: t("apPayment.postError", "Failed to post payment"),
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleReverse = async () => {
    if (!id || reversing) return;
    const reason = window.prompt(
      t("apPayment.enterReversalReason", "Enter reversal reason:"),
    );
    if (!reason) return;
    setReversing(true);
    try {
      await apPaymentsApi.reverse(id, reason);
      toast({
        title: t("common.success"),
        description: t(
          "apPayment.reverseSuccess",
          "Payment reversed successfully",
        ),
      });
      fetchPayment();
    } catch (error) {
      console.error("Failed to reverse payment:", error);
      toast({
        title: t("common.error"),
        description: t("apPayment.reverseError", "Failed to reverse payment"),
        variant: "destructive",
      });
    } finally {
      setReversing(false);
    }
  };

  const formatCurrency = (
    amount: string | number | any,
    currency: string = "USD",
  ) => {
    // Handle MongoDB Decimal128 format: { $numberDecimal: "1000000" }
    if (amount && typeof amount === "object" && "$numberDecimal" in amount) {
      amount = amount.$numberDecimal;
    }
    const num =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return `${currency} 0.00`;
    return `${currency} ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: any;
        label: string;
      }
    > = {
      draft: {
        variant: "secondary",
        icon: Clock,
        label: t("apPayment.status.draft", "Draft"),
      },
      posted: {
        variant: "default",
        icon: CheckCircle,
        label: t("apPayment.status.posted", "Posted"),
      },
      reversed: {
        variant: "destructive",
        icon: XCircle,
        label: t("apPayment.status.reversed", "Reversed"),
      },
    };
    const config = configs[status] || configs.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: t(
        "apPayment.paymentMethods.bankTransfer",
        "Bank Transfer",
      ),
      cash: t("apPayment.paymentMethods.cash", "Cash"),
      cheque: t("apPayment.paymentMethods.cheque", "Cheque"),
      other: t("apPayment.paymentMethods.other", "Other"),
    };
    return labels[method] || method;
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

  if (!payment) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-semibold">
            {t("apPayment.notFound", "Payment not found")}
          </h2>
          <Button onClick={() => navigate("/ap-payments")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("apPayment.backToList", "Back to Payments")}
          </Button>
        </div>
      </Layout>
    );
  }

  const allocatedTotal = payment.allocations.reduce(
    (sum, alloc) => sum + parseFloat(alloc.amountAllocated),
    0,
  );
  const unallocatedAmount =
    parseFloat(payment.unallocatedAmount || "0") ||
    parseFloat(payment.amountPaid) - allocatedTotal;

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ap-payments")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {t("apPayment.paymentDetails", "Payment Details")}
              </h1>
              <p className="text-muted-foreground">{payment.referenceNo}</p>
            </div>
            {getStatusBadge(payment.status)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              {t("common.print", "Print")}
            </Button>
            {payment.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ap-payments/${payment._id}/edit`)}
                >
                  {t("common.edit", "Edit")}
                </Button>
                <Button onClick={handlePost} disabled={posting}>
                  {posting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {posting
                    ? t("apPayment.posting", "Recording...")
                    : t("apPayment.post", "Record Payment")}
                </Button>
              </>
            )}
            {payment.status === "posted" && (
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
                  ? t("apPayment.reversing", "Reversing...")
                  : t("apPayment.reverse", "Reverse")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {t("apPayment.paymentInfo", "Payment Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("apPayment.supplier", "Supplier")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {payment.supplier?.name || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("apPayment.paymentDate", "Payment Date")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDate(payment.paymentDate)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("apPayment.paymentMethod", "Payment Method")}
                    </label>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getPaymentMethodLabel(payment.paymentMethod)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("apPayment.bankAccount", "Bank Account")}
                    </label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {payment.bankAccount?.name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("apPayment.amountPaid", "Amount Paid")}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {formatCurrency(
                          payment.amountPaid,
                          payment.currencyCode,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      {t("apPayment.unallocated", "Unallocated")}
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${unallocatedAmount > 0 ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {formatCurrency(
                          unallocatedAmount,
                          payment.currencyCode,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {payment.reference && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">
                        {t("apPayment.reference", "Reference")}
                      </label>
                      <p className="font-medium">{payment.reference}</p>
                    </div>
                  </>
                )}

                {payment.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">
                        {t("apPayment.notes", "Notes")}
                      </label>
                      <p className="text-sm">{payment.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Allocations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("apPayment.allocations", "GRN Allocations")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payment.allocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>
                      {t("apPayment.noAllocations", "No allocations to GRNs")}
                    </p>
                    {payment.status === "draft" && (
                      <p className="text-sm mt-2">
                        {t(
                          "apPayment.editToAllocate",
                          "Edit the payment to allocate to GRNs",
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payment.allocations.map((alloc) => (
                      <div
                        key={alloc._id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {alloc.grn?.referenceNo || "-"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("apPayment.grnTotal", "GRN Total")}:{" "}
                            {formatCurrency(
                              alloc.grn?.totalAmount || 0,
                              payment.currencyCode,
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("apPayment.remainingBalance", "Remaining")}:{" "}
                            {formatCurrency(
                              alloc.grn?.balance || 0,
                              payment.currencyCode,
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-lg">
                            {formatCurrency(
                              alloc.amountAllocated,
                              payment.currencyCode,
                            )}
                          </p>
                          <Badge
                            variant={
                              alloc.grn?.paymentStatus === "paid"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {alloc.grn?.paymentStatus || "pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {t("apPayment.totalAllocated", "Total Allocated")}
                      </span>
                      <span className="font-bold text-lg">
                        {formatCurrency(allocatedTotal, payment.currencyCode)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("apPayment.statusHistory", "Status History")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="font-medium text-sm">
                      {t("apPayment.created", "Created")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                </div>

                {payment.status !== "draft" && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">
                        {t("apPayment.posted", "Posted")}
                      </p>
                      {payment.postedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.postedAt)}
                        </p>
                      )}
                      {payment.postedBy && (
                        <p className="text-xs text-muted-foreground">
                          {t("apPayment.byUser", "by {{name}}", {
                            name: payment.postedBy.name,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {payment.status === "reversed" && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">
                        {t("apPayment.reversed", "Reversed")}
                      </p>
                      {payment.reversedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.reversedAt)}
                        </p>
                      )}
                      {payment.reversedBy && (
                        <p className="text-xs text-muted-foreground">
                          {t("apPayment.byUser", "by {{name}}", {
                            name: payment.reversedBy.name,
                          })}
                        </p>
                      )}
                      {payment.reversalReason && (
                        <p className="text-xs text-red-600 mt-1">
                          {payment.reversalReason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Journal Entry */}
            {payment.journalEntry && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("apPayment.journalEntry", "Journal Entry")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {payment.journalEntry.entryNumber ||
                        payment.journalEntry._id}
                    </span>
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm mt-2"
                    onClick={() =>
                      navigate(`/journal/${payment.journalEntry?._id}`)
                    }
                  >
                    {t("apPayment.viewJournalEntry", "View Journal Entry")}
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
