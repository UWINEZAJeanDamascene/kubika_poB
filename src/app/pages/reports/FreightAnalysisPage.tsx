import { useState, useEffect } from "react";
import { freightAnalysisApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Loader2,
  Truck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { useTranslation } from "react-i18next";

interface FreightAnalysisData {
  summary: {
    totalFreight: number;
    totalGoodsValue: number;
    overallFreightPct: number;
    grnCount: number;
    flaggedGRNCount: number;
  };
  perSupplier: Array<{
    supplierName: string;
    totalFreight: number;
    billCount: number;
  }>;
  perGRN: Array<{
    grnId: string;
    referenceNo: string;
    supplierName: string;
    poReference: string;
    goodsValue: number;
    freightAmount: number;
    freightPct: number;
    hasFreight: boolean;
    receivedDate: string;
  }>;
  flaggedGRNs: Array<any>;
}

export default function FreightAnalysisPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FreightAnalysisData | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await freightAnalysisApi.getAnalysis({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.success && res.data) {
        setData(res.data as FreightAnalysisData);
      }
    } catch (e) {
      console.error("Failed to fetch freight analysis:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("freight.analysisTitle", "Freight Cost Analysis")}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("freight.analysisDescription", "Analyze freight costs by supplier, GRN, and as a percentage of goods value")}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("common.from", "From")}</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("common.to", "To")}</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                </div>
                <Button onClick={fetchAnalysis} className="h-9 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  <BarChart3 className="h-4 w-4" />
                  {t("common.runReport", "Run Report")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t("freight.totalFreight", "Total Freight")}</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.summary.totalFreight)}</div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t("freight.totalGoodsValue", "Total Goods Value")}</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.summary.totalGoodsValue)}</div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t("freight.freightPct", "Freight % of Goods")}</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{data.summary.overallFreightPct.toFixed(2)}%</div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t("freight.flaggedGRNs", "GRNs Without Freight")}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.summary.flaggedGRNCount}</span>
                      {data.summary.flaggedGRNCount > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Per Supplier */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800 dark:text-slate-100">{t("freight.perSupplier", "Freight by Supplier")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                          <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.supplier", "Supplier")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.billCount", "Bills")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("freight.totalFreight", "Total Freight")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.perSupplier.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-slate-500 dark:text-slate-400">{t("freight.noSupplierData", "No supplier data")}</TableCell>
                          </TableRow>
                        )}
                        {data.perSupplier.map((s, i) => (
                          <TableRow key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                            <TableCell className="font-medium text-slate-900 dark:text-white">{s.supplierName}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{s.billCount}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{formatCurrency(s.totalFreight)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Per GRN */}
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800 dark:text-slate-100">{t("freight.perGRN", "Freight by GRN")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900">
                          <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.referenceNo", "GRN")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.supplier", "Supplier")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("purchase.referenceNo", "PO")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.goodsValue", "Goods Value")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.freight", "Freight")}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("grn.freightPct", "Freight %")}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("common.status", "Status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.perGRN.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-slate-500 dark:text-slate-400">{t("freight.noGRNData", "No GRN data")}</TableCell>
                          </TableRow>
                        )}
                        {data.perGRN.map((g) => (
                          <TableRow key={g.grnId} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                            <TableCell className="font-medium text-slate-900 dark:text-white">{g.referenceNo}</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-300">{g.supplierName}</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-300">{g.poReference}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{formatCurrency(g.goodsValue)}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{formatCurrency(g.freightAmount)}</TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-300">{g.freightPct.toFixed(2)}%</TableCell>
                            <TableCell>
                              {g.hasFreight ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  <TrendingUp className="mr-1 h-3 w-3" /> {t("freight.recorded", "Recorded")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-300 dark:border-amber-800">
                                  <AlertTriangle className="mr-1 h-3 w-3" /> {t("freight.missing", "Missing")}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
