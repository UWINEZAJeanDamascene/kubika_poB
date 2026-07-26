import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { freightBillsApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Save,
  Loader2,
  Truck,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useTranslation } from "react-i18next";

export default function FreightBillFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referenceNo, setReferenceNo] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [account, setAccount] = useState("5110");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("on_account");

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    freightBillsApi.getById(id)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as any;
          setReferenceNo(d.referenceNo || "");
          setCarrierName(d.carrierName || "");
          setAmount(d.amount || 0);
          setAccount(d.account || "5110");
          setInvoiceDate(d.invoiceDate ? d.invoiceDate.split("T")[0] : "");
          setPaymentMethod(d.paymentMethod || "on_account");
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!referenceNo || amount <= 0) {
      alert(t("freight.validationRequired", "Reference and amount are required"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        referenceNo,
        carrierName: carrierName || undefined,
        amount: Number(amount),
        account: account || "5110",
        invoiceDate: invoiceDate || undefined,
        paymentMethod,
      };
      if (isEdit && id) {
        await freightBillsApi.update(id, payload);
      } else {
        await freightBillsApi.create(payload as any);
      }
      navigate("/purchase-orders?tab=freight-bills");
    } catch (e) {
      console.error("Failed to save freight bill:", e);
      alert(t("freight.saveFailed", "Failed to save freight bill"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[800px] space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/purchase-orders?tab=freight-bills")}>
              <ArrowLeft className="h-4 w-4 text-slate-500" />
            </Button>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
              <Truck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {isEdit ? t("freight.editBill", "Edit Freight Bill") : t("freight.newBill", "New Freight Bill")}
            </h1>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-800 dark:text-slate-100">
                {t("freight.billDetails", "Bill Details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("freight.referenceNo", "Reference No")}</Label>
                  <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("freight.carrierName", "Carrier Name")}</Label>
                  <Input value={carrierName} onChange={(e) => setCarrierName(e.target.value)} className="dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("freight.amount", "Amount")}</Label>
                  <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("freight.account", "Account")}</Label>
                  <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="5110" className="dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("freight.invoiceDate", "Invoice Date")}</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("freight.paymentMethod", "Payment Method")}</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="cash">{t("freight.cash", "Cash")}</SelectItem>
                      <SelectItem value="bank_transfer">{t("freight.bankTransfer", "Bank Transfer")}</SelectItem>
                      <SelectItem value="mobile_money">{t("freight.mobileMoney", "MoMo")}</SelectItem>
                      <SelectItem value="on_account">{t("freight.onAccount", "On Account (AP)")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => navigate("/purchase-orders?tab=freight-bills")}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("common.save", "Save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
