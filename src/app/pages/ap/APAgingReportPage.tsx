import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { apReconciliationApi, suppliersApi } from "@/lib/api";
import { Layout } from "@/app/layout/Layout";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar,
  Clock,
  FileText,
  Printer,
  Download,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
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
import { Input } from "@/app/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface AgingData {
  supplier_id: string;
  supplier_name: string;
  not_yet_due: string;
  days_1_30: string;
  days_31_60: string;
  days_61_90: string;
  days_90_plus: string;
  total_outstanding: string;
}

export default function APAgingReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [suppliers, setSuppliers] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [asOfDate, setAsOfDate] = useState<string>("");
  const [verification, setVerification] = useState<{
    verified: boolean;
    discrepancyCount: number;
  } | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  }, []);

  const fetchAgingReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSupplier && selectedSupplier !== "all")
        params.supplierId = selectedSupplier;
      if (asOfDate) params.asOfDate = asOfDate;

      const response =
        await apReconciliationApi.getAgingWithVerification(params);
      if (response.success) {
        const agingDataArray = Array.isArray(response.data)
          ? response.data
          : [];
        setAgingData(agingDataArray);
        setVerification(response.verification || null);
      }
    } catch (error) {
      console.error("Failed to fetch aging report:", error);
      toast({
        title: t("common.error"),
        description: t("apAging.fetchError", "Failed to fetch aging report"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, asOfDate, toast, t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchAgingReport();
  }, [fetchAgingReport]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num || 0);
  };

  const calculateTotals = () => {
    return agingData.reduce(
      (acc, row) => ({
        notYetDue: acc.notYetDue + parseFloat(row.not_yet_due || "0"),
        days1_30: acc.days1_30 + parseFloat(row.days_1_30 || "0"),
        days31_60: acc.days31_60 + parseFloat(row.days_31_60 || "0"),
        days61_90: acc.days61_90 + parseFloat(row.days_61_90 || "0"),
        days90Plus: acc.days90Plus + parseFloat(row.days_90_plus || "0"),
        total: acc.total + parseFloat(row.total_outstanding || "0"),
      }),
      {
        notYetDue: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
        total: 0,
      },
    );
  };

  const totals = calculateTotals();

  const getAgingBadge = (amount: number) => {
    if (amount === 0)
      return <Badge variant="outline">{formatCurrency(0)}</Badge>;
    if (amount > 10000)
      return <Badge variant="destructive">{formatCurrency(amount)}</Badge>;
    if (amount > 5000)
      return <Badge variant="secondary">{formatCurrency(amount)}</Badge>;
    return <Badge variant="default">{formatCurrency(amount)}</Badge>;
  };

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
                {t("apAging.title", "AP Aging Report")}
              </h1>
              <p className="text-muted-foreground">
                {t("apAging.description", "Accounts Payable aging analysis")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchAgingReport}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {t("common.refresh", "Refresh")}
            </Button>
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              {t("common.print", "Print")}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t("common.export", "Export")}
            </Button>
          </div>
        </div>

        {/* Verification Status */}
        {verification && (
          <Card
            className={
              verification.verified
                ? "border-green-200 bg-green-50"
                : "border-yellow-200 bg-yellow-50"
            }
          >
            <CardContent className="flex items-center gap-4 py-4">
              {verification.verified ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <p className="font-medium">
                  {verification.verified
                    ? t("apAging.dataVerified", "Data Verified")
                    : t("apAging.discrepanciesFound", "Discrepancies Found")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {verification.verified
                    ? t(
                        "apAging.allBalancesMatch",
                        "All balances match between ledger and actual documents",
                      )
                    : t(
                        "apAging.discrepancyCount",
                        "{{count}} discrepancies require attention",
                        { count: verification.discrepancyCount },
                      )}
                </p>
              </div>
              {!verification.verified && (
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={() => navigate("/ap-reconciliation")}
                >
                  {t("apAging.reconcileNow", "Reconcile Now")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("apAging.supplier", "Supplier")}
                </label>
                <Select
                  value={selectedSupplier || "all"}
                  onValueChange={setSelectedSupplier}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("apAging.allSuppliers", "All Suppliers")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("apAging.allSuppliers", "All Suppliers")}
                    </SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("apAging.asOfDate", "As of Date")}
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchAgingReport}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {t("apAging.generateReport", "Generate Report")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t("apAging.notYetDue", "Not Yet Due")}
              </CardDescription>
              <CardTitle className="text-xl text-green-600">
                {formatCurrency(totals.notYetDue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t("apAging.days1_30", "1-30 Days")}
              </CardDescription>
              <CardTitle className="text-xl">
                {formatCurrency(totals.days1_30)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t("apAging.days31_60", "31-60 Days")}
              </CardDescription>
              <CardTitle className="text-xl text-yellow-600">
                {formatCurrency(totals.days31_60)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t("apAging.days61_90", "61-90 Days")}
              </CardDescription>
              <CardTitle className="text-xl text-orange-600">
                {formatCurrency(totals.days61_90)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t("apAging.days90Plus", "90+ Days")}
              </CardDescription>
              <CardTitle className="text-xl text-red-600">
                {formatCurrency(totals.days90Plus)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardDescription>
                {t("apAging.totalOutstanding", "Total Outstanding")}
              </CardDescription>
              <CardTitle className="text-xl font-bold">
                {formatCurrency(totals.total)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Aging Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("apAging.detailedBreakdown", "Detailed Breakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : agingData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("apAging.noData", "No aging data available")}</p>
                <p className="text-sm mt-2">
                  {t(
                    "apAging.selectFilters",
                    "Select filters and generate the report",
                  )}
                </p>
              </div>
            ) : (
              <>
              <div className="space-y-3 p-3 xl:hidden">{agingData.map((row) => <article key={row.supplier_id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><span className="break-words text-sm font-semibold">{row.supplier_name}</span></div><Button variant="outline" size="sm" className="min-h-10 shrink-0" onClick={() => navigate(`/ap-reconciliation/suppliers/${row.supplier_id}/statement`)}>Statement<ChevronRight className="ml-1 h-4 w-4"/></Button></div><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs sm:grid-cols-3"><span className="text-muted-foreground">Not yet due<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row.not_yet_due))}</b></span><span className="text-muted-foreground">1–30 days<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row.days_1_30))}</b></span><span className="text-muted-foreground">31–60 days<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row.days_31_60))}</b></span><span className="text-muted-foreground">61–90 days<b className="mt-1 block text-sm text-foreground">{formatCurrency(parseFloat(row.days_61_90))}</b></span><span className="text-muted-foreground">90+ days<b className="mt-1 block text-sm text-red-600">{formatCurrency(parseFloat(row.days_90_plus))}</b></span><span className="text-muted-foreground">Total outstanding<b className="mt-1 block text-sm font-semibold text-foreground">{formatCurrency(row.total_outstanding)}</b></span></div></article>)}<article className="rounded-xl bg-muted/40 p-3"><p className="text-sm font-semibold">{t("apAging.total", "Total")}</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3"><span>Not yet due<b className="mt-1 block">{formatCurrency(totals.notYetDue)}</b></span><span>1–30 days<b className="mt-1 block">{formatCurrency(totals.days1_30)}</b></span><span>31–60 days<b className="mt-1 block">{formatCurrency(totals.days31_60)}</b></span><span>61–90 days<b className="mt-1 block">{formatCurrency(totals.days61_90)}</b></span><span>90+ days<b className="mt-1 block">{formatCurrency(totals.days90Plus)}</b></span><span>Total<b className="mt-1 block">{formatCurrency(totals.total)}</b></span></div></article></div>
              <div className="hidden overflow-x-auto xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("apAging.supplier", "Supplier")}</TableHead>
                      <TableHead className="text-right">
                        {t("apAging.notYetDue", "Not Yet Due")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apAging.days1_30", "1-30 Days")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apAging.days31_60", "31-60 Days")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apAging.days61_90", "61-90 Days")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apAging.days90Plus", "90+ Days")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("apAging.total", "Total")}
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingData.map((row) => (
                      <TableRow key={row.supplier_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {row.supplier_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {getAgingBadge(parseFloat(row.not_yet_due))}
                        </TableCell>
                        <TableCell className="text-right">
                          {getAgingBadge(parseFloat(row.days_1_30))}
                        </TableCell>
                        <TableCell className="text-right">
                          {getAgingBadge(parseFloat(row.days_31_60))}
                        </TableCell>
                        <TableCell className="text-right">
                          {getAgingBadge(parseFloat(row.days_61_90))}
                        </TableCell>
                        <TableCell className="text-right">
                          {getAgingBadge(parseFloat(row.days_90_plus))}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(row.total_outstanding)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/ap-reconciliation/suppliers/${row.supplier_id}/statement`,
                              )
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>{t("apAging.total", "Total")}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.notYetDue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.days1_30)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.days31_60)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.days61_90)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.days90Plus)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.total)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
