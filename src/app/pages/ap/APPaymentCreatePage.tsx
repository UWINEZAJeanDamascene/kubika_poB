import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  apPaymentsApi,
  suppliersApi,
  bankAccountsApi,
  grnApi,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
import DocumentCurrencySelect from "@/app/components/DocumentCurrencySelect";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Calculator,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

interface GRN {
  _id: string;
  referenceNo: string;
  grnDate: string;
  totalAmount: string;
  balance: string;
}

interface Allocation {
  grn: string;
  amount: number;
}

interface BankAccount {
  _id: string;
  accountName: string;
  accountCode: string;
  accountNumber: string;
}

interface APPaymentFormData {
  supplierId: string;
  paymentDate: string;
  paymentMethod: string;
  bankAccountId: string;
  amountPaid: number;
  currencyCode: string;
  reference: string;
  notes: string;
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function APPaymentCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const [formData, setFormData] = useState<APPaymentFormData>({
    supplierId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    bankAccountId: "",
    amountPaid: 0,
    currencyCode: "RWF",
    reference: "",
    notes: "",
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
    }
  }, []);

  const fetchGRNs = useCallback(async (supplierId: string) => {
    try {
      // Get GRNs for this supplier with pending balance
      const response = await grnApi.getAll({
        supplier_id: supplierId,
        status: "received",
        limit: 100,
      });
      if (response.success && Array.isArray(response.data)) {
        // Filter to only show GRNs with balance > 0
        const grnsWithBalance = (response.data as any[]).filter(
          (grn) => parseFloat(grn.balance || grn.totalAmount) > 0,
        );
        setGRNs(grnsWithBalance as GRN[]);
      }
    } catch (error) {
      console.error("Failed to fetch GRNs:", error);
    }
  }, []);

  const fetchPayment = useCallback(
    async (paymentId: string) => {
      setLoading(true);
      try {
        const response = await apPaymentsApi.getById(paymentId);
        if (response.success && response.data) {
          const payment = response.data;
          setFormData({
            supplierId: payment.supplier?._id || "",
            paymentDate:
              payment.paymentDate?.split("T")[0] ||
              new Date().toISOString().split("T")[0],
            paymentMethod: payment.paymentMethod || "bank_transfer",
            bankAccountId: payment.bankAccount?._id || "",
            amountPaid: parseFloat(payment.amountPaid) || 0,
            currencyCode: payment.currencyCode || "RWF",
            reference: payment.reference || "",
            notes: payment.notes || "",
          });

          // Fetch GRNs for this supplier
          if (payment.supplier?._id) {
            fetchGRNs(payment.supplier._id);
          }

          // Fetch existing allocations
          if (response.allocations && response.allocations.length > 0) {
            const existingAllocations = response.allocations.map((alloc: any) => ({
              grn: alloc.grn._id,
              amount: parseFloat(alloc.amountAllocated),
            }));
            setAllocations(existingAllocations);
          }
        }
      } catch (error) {
        console.error("Failed to fetch payment:", error);
      } finally {
        setLoading(false);
      }
    },
    [fetchGRNs],
  );

  useEffect(() => {
    fetchSuppliers();
    fetchBankAccounts();
  }, [fetchSuppliers, fetchBankAccounts]);

  useEffect(() => {
    if (isEdit && id) {
      fetchPayment(id);
    }
  }, [isEdit, id, fetchPayment]);

  useEffect(() => {
    if (formData.supplierId) {
      fetchGRNs(formData.supplierId);
    }
  }, [formData.supplierId, fetchGRNs]);

  const handleInputChange = (
    field: keyof APPaymentFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAllocation = () => {
    if (grns.length > 0) {
      setAllocations((prev) => [...prev, { grn: grns[0]._id, amount: 0 }]);
    }
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAllocationChange = (
    index: number,
    field: keyof Allocation,
    value: string | number,
  ) => {
    setAllocations((prev) =>
      prev.map((alloc, i) =>
        i === index ? { ...alloc, [field]: value } : alloc,
      ),
    );
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
  };

  const getGRNBalance = (grnId: string) => {
    const grn = grns.find((g) => g._id === grnId);
    return grn ? parseFloat(grn.balance || grn.totalAmount) : 0;
  };

  const handleSubmit = async (e: React.FormEvent, draft: boolean = true) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        allocations: allocations.filter((a) => a.amount > 0),
      };

      if (isEdit && id) {
        await apPaymentsApi.update(id, payload);
      } else {
        await apPaymentsApi.create(payload);
      }

      navigate("/ap-payments");
    } catch (error) {
      console.error("Failed to save payment:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await apPaymentsApi.post(id);
      navigate("/ap-payments");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          t("apPayment.postError", "Failed to record payment"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ap-payments")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit
                ? t("apPayment.editPayment", "Edit Payment")
                : t("apPayment.createPayment", "New Payment")}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? t("apPayment.editDescription", "Update payment details")
                : t(
                    "apPayment.createDescription",
                    "Create a new supplier payment",
                  )}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, true)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("apPayment.basicInfo", "Basic Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t("apPayment.supplier", "Supplier")} *</Label>
                      <Select
                        value={formData.supplierId}
                        onValueChange={(value) =>
                          handleInputChange("supplierId", value)
                        }
                        disabled={isEdit}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "apPayment.selectSupplier",
                              "Select supplier",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier._id} value={supplier._id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>
                        {t("apPayment.paymentDate", "Payment Date")}
                      </Label>
                      <Input
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) =>
                          handleInputChange("paymentDate", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label>
                        {t("apPayment.paymentMethod", "Payment Method")} *
                      </Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) =>
                          handleInputChange("paymentMethod", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {t(
                                `apPayment.paymentMethods.${method.value}`,
                                method.label,
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>
                        {t("apPayment.bankAccount", "Bank Account")} *
                      </Label>
                      <Select
                        value={formData.bankAccountId}
                        onValueChange={(value) =>
                          handleInputChange("bankAccountId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "apPayment.selectBank",
                              "Select bank account",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account._id} value={account._id}>
                              {account.accountName} ({account.accountNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t("apPayment.amount", "Amount")} *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amountPaid}
                        onChange={(e) =>
                          handleInputChange(
                            "amountPaid",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>{t("apPayment.currency", "Currency")}</Label>
                      <DocumentCurrencySelect
                        value={formData.currencyCode}
                        date={formData.paymentDate}
                        onChange={(currency) =>
                          handleInputChange("currencyCode", currency)
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>{t("apPayment.reference", "Reference")}</Label>
                      <Input
                        value={formData.reference}
                        onChange={(e) =>
                          handleInputChange("reference", e.target.value)
                        }
                        placeholder={t(
                          "apPayment.referencePlaceholder",
                          "Payment reference number",
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GRN Allocations */}
              <Card className="mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    {t("apPayment.allocations", "GRN Allocations")}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAllocation}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("apPayment.addAllocation", "Add Allocation")}
                  </Button>
                </CardHeader>
                <CardContent>
                  {allocations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      {t(
                        "apPayment.noAllocations",
                        'No allocations yet. Click "Add Allocation" to allocate payment to GRNs.',
                      )}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("apPayment.grn", "GRN")}</TableHead>
                          <TableHead>
                            {t("apPayment.balance", "Balance")}
                          </TableHead>
                          <TableHead>
                            {t("apPayment.allocatedAmount", "Allocated Amount")}
                          </TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((allocation, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={allocation.grn}
                                onValueChange={(value) =>
                                  handleAllocationChange(index, "grn", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t(
                                      "apPayment.selectGRN",
                                      "Select GRN",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {grns.map((grn) => (
                                    <SelectItem key={grn._id} value={grn._id}>
                                      {grn.referenceNo} -{" "}
                                      {parseFloat(
                                        grn.balance || grn.totalAmount,
                                      ).toFixed(2)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {allocation.grn
                                ? getGRNBalance(allocation.grn).toFixed(2)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={
                                  allocation.grn
                                    ? getGRNBalance(allocation.grn)
                                    : undefined
                                }
                                value={allocation.amount}
                                onChange={(e) =>
                                  handleAllocationChange(
                                    index,
                                    "amount",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAllocation(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("apPayment.summary", "Summary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("apPayment.paymentAmount", "Payment Amount")}
                    </span>
                    <span className="font-medium">
                      {formData.amountPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("apPayment.totalAllocated", "Total Allocated")}
                    </span>
                    <span className="font-medium">
                      {getTotalAllocated().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("apPayment.unallocated", "Unallocated")}
                    </span>
                    <span
                      className={`font-medium ${formData.amountPaid - getTotalAllocated() < 0 ? "text-red-500" : ""}`}
                    >
                      {(formData.amountPaid - getTotalAllocated()).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-4 border-t">
                    <Label>{t("apPayment.notes", "Notes")}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      placeholder={t(
                        "apPayment.notesPlaceholder",
                        "Additional notes...",
                      )}
                      rows={4}
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-4">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving
                        ? t("common.saving", "Saving...")
                        : t("apPayment.saveDraft", "Save Draft")}
                    </Button>
                    {isEdit && (
                      <>
                        <Button
                          type="button"
                          variant="default"
                          onClick={handlePost}
                          disabled={saving}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {t("apPayment.postPayment", "Record Payment")}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
