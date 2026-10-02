import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { budgetsApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BudgetScenarioComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: any[];
  onRefresh?: () => void;
}

export function BudgetScenarioComparison({
  open,
  onOpenChange,
  scenarios,
  onRefresh,
}: BudgetScenarioComparisonProps) {
  const { t } = useTranslation();
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState(false);

  useEffect(() => {
    if (open && scenarios.length >= 2) {
      fetchComparison();
    }
  }, [open, scenarios]);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const scenarioIds = scenarios.map(s => s._id);
      const result = await budgetsApi.compareScenarios(scenarioIds);
      if (result.success) {
        setComparison(result.data);
      } else {
        toast.error(t("budgets.scenarios.compareFailed", "Failed to compare scenarios"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.scenarios.compareFailed", "Failed to compare scenarios"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (scenarioId: string) => {
    try {
      const result = await budgetsApi.setPrimaryScenario(scenarioId);
      if (result.success) {
        toast.success(t("budgets.scenarios.setPrimarySuccess", "Scenario set as primary"));
        onRefresh?.();
        fetchComparison();
      } else {
        toast.error(result.error || t("budgets.scenarios.setPrimaryFailed", "Failed to set as primary"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.scenarios.setPrimaryFailed", "Failed to set as primary"));
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!confirm(t("budgets.scenarios.deleteConfirm", "Are you sure you want to delete this scenario?"))) {
      return;
    }

    try {
      const result = await budgetsApi.deleteScenario(scenarioId);
      if (result.success) {
        toast.success(t("budgets.scenarios.deleted", "Scenario deleted"));
        onRefresh?.();
        if (scenarios.length <= 2) {
          onOpenChange(false);
        } else {
          fetchComparison();
        }
      } else {
        toast.error(result.error || t("budgets.scenarios.deleteFailed", "Failed to delete scenario"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.scenarios.deleteFailed", "Failed to delete scenario"));
    }
  };

  const getScenarioIcon = (type: string, variance: number) => {
    if (type === "optimistic" || variance > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (type === "pessimistic" || variance < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getScenarioBadgeColor = (type: string) => {
    switch (type) {
      case "base":
        return "bg-blue-100 text-blue-800";
      case "optimistic":
        return "bg-green-100 text-green-800";
      case "pessimistic":
        return "bg-red-100 text-red-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  const formatVariance = (amount: number, percent: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}${formatCurrency(amount)} (${sign}${percent.toFixed(1)}%)`;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {t("budgets.scenarios.loadingComparison", "Loading comparison...")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!comparison) {
    return null;
  }

  const { base_scenario, scenarios: comparisonScenarios, summary } = comparison;
  const allScenarios = [base_scenario, ...comparisonScenarios.filter((s: { scenario_id: string }) => s.scenario_id !== base_scenario.scenario_id)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("budgets.scenarios.comparisonTitle", "Scenario Comparison")}
          </DialogTitle>
          <DialogDescription>
            {t("budgets.scenarios.comparisonDesc", "Compare different budget scenarios and their variances")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <div className="text-sm text-muted-foreground">
                {t("budgets.scenarios.totalScenarios", "Total Scenarios")}
              </div>
              <div className="text-2xl font-bold">{summary.total_scenarios}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-sm text-green-600">
                {t("budgets.scenarios.highest", "Highest")}
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(summary.max_amount)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-sm text-red-600">
                {t("budgets.scenarios.lowest", "Lowest")}
              </div>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(summary.min_amount)}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-sm text-blue-600">
                {t("budgets.scenarios.average", "Average")}
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(summary.avg_amount)}
              </div>
            </div>
          </div>

          {/* Scenarios Table */}
          <div className="space-y-3 xl:hidden">{allScenarios.map((scenario) => <article key={scenario.scenario_id} className={`rounded-xl border p-3 ${scenario.is_primary ? "border-primary/40 bg-primary/5" : ""}`}><div className="flex items-start gap-3"><div className="mt-0.5 shrink-0">{getScenarioIcon(scenario.scenario_type, scenario.variance_amount || 0)}</div><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{scenario.scenario_name}</p><p className="mt-1 text-xs text-muted-foreground">{scenario.line_count} {t("budgets.scenarios.lines", "lines")}</p></div>{scenario.is_primary ? <Badge variant="default">{t("budgets.scenarios.primary", "Primary")}</Badge> : <Badge variant="outline">{t("budgets.scenarios.alternate", "Alternate")}</Badge>}</div><div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs"><div className="text-muted-foreground">Type<p className="mt-1 text-sm capitalize text-foreground">{scenario.scenario_type}</p></div><div className="text-muted-foreground">Total<p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(scenario.total_budgeted)}</p></div><div className="col-span-2 text-muted-foreground">Variance vs base<p className={`mt-1 text-sm font-medium ${scenario.variance_amount && scenario.variance_amount > 0 ? "text-green-600" : scenario.variance_amount && scenario.variance_amount < 0 ? "text-red-600" : "text-foreground"}`}>{scenario.variance_amount !== undefined && scenario.variance_amount !== 0 ? formatVariance(scenario.variance_amount, scenario.variance_percent) : "—"}</p></div></div>{!scenario.is_primary && <div className="mt-3 flex gap-2 border-t pt-3"><Button size="sm" variant="outline" className="min-h-10 flex-1" onClick={() => handleSetPrimary(scenario.scenario_id)}>{t("budgets.scenarios.setPrimary", "Set Primary")}</Button><Button size="icon" variant="ghost" className="min-h-10 min-w-10 text-destructive" onClick={() => handleDeleteScenario(scenario.scenario_id)} aria-label={`Delete ${scenario.scenario_name}`}><X className="h-4 w-4"/></Button></div>}</article>)}</div>
          <div className="hidden border rounded-lg xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("budgets.scenarios.scenario", "Scenario")}</TableHead>
                  <TableHead>{t("budgets.scenarios.type", "Type")}</TableHead>
                  <TableHead className="text-right">{t("budgets.scenarios.total", "Total")}</TableHead>
                  <TableHead className="text-right">{t("budgets.scenarios.variance", "Variance vs Base")}</TableHead>
                  <TableHead className="text-center">{t("budgets.scenarios.status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allScenarios.map((scenario) => (
                  <TableRow key={scenario.scenario_id} className={scenario.is_primary ? "bg-primary/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getScenarioIcon(scenario.scenario_type, scenario.variance_amount || 0)}
                        <div>
                          <div className="font-medium">{scenario.scenario_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {scenario.line_count} {t("budgets.scenarios.lines", "lines")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getScenarioBadgeColor(scenario.scenario_type)}>
                        {scenario.scenario_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(scenario.total_budgeted)}
                    </TableCell>
                    <TableCell className="text-right">
                      {scenario.variance_amount !== undefined && scenario.variance_amount !== 0 ? (
                        <div className={`${scenario.variance_amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatVariance(scenario.variance_amount, scenario.variance_percent)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {scenario.is_primary ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          {t("budgets.scenarios.primary", "Primary")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t("budgets.scenarios.alternate", "Alternate")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!scenario.is_primary && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetPrimary(scenario.scenario_id)}
                            >
                              {t("budgets.scenarios.setPrimary", "Set Primary")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteScenario(scenario.scenario_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Category Breakdown */}
          <div className="border rounded-lg">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedCategories(!expandedCategories)}
            >
              <h4 className="font-medium">
                {t("budgets.scenarios.byCategory", "Breakdown by Category")}
              </h4>
              {expandedCategories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedCategories && (
              <div className="p-4 pt-0">
                <div className="space-y-2 xl:hidden">{Object.keys(base_scenario.by_category).map((category) => <article key={category} className="rounded-lg border p-3"><p className="text-sm font-semibold">{category}</p><div className="mt-2 space-y-2 border-t pt-2">{allScenarios.map((scenario) => <div key={scenario.scenario_id} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-muted-foreground">{scenario.scenario_name}</span><span className="shrink-0 font-medium">{formatCurrency(scenario.by_category[category] || 0)}</span></div>)}</div></article>)}</div>
                <div className="hidden overflow-x-auto xl:block"><Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("budgets.scenarios.category", "Category")}</TableHead>
                      {allScenarios.map(s => (
                        <TableHead key={s.scenario_id} className="text-right">{s.scenario_name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(base_scenario.by_category).map((category) => (
                      <TableRow key={category}>
                        <TableCell className="font-medium">{category}</TableCell>
                        {allScenarios.map(s => (
                          <TableCell key={s.scenario_id} className="text-right">
                            {formatCurrency(s.by_category[category] || 0)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              </div>
            )}
          </div>

          {/* Monthly Breakdown */}
          <div className="border rounded-lg">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedMonths(!expandedMonths)}
            >
              <h4 className="font-medium">
                {t("budgets.scenarios.byMonth", "Breakdown by Month")}
              </h4>
              {expandedMonths ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedMonths && (
              <div className="p-4 pt-0">
                <div className="space-y-4">
                  {Object.keys(base_scenario.by_month).sort().map((month) => (
                    <div key={month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{month}</span>
                      </div>
                      <div className="space-y-1">
                        {allScenarios.map((s) => {
                          const amount = s.by_month[month] || 0;
                          const maxAmount = Math.max(...allScenarios.map(sc => sc.by_month[month] || 0));
                          const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                          return (
                            <div key={s.scenario_id} className="flex items-center gap-2">
                              <span className="text-xs w-24 truncate">{s.scenario_name}</span>
                              <Progress value={percentage} className="flex-1 h-2" />
                              <span className="text-xs w-20 text-right">{formatCurrency(amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
